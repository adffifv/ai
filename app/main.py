# app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.workflow.graph import convert_novel
from app.utils.stats import count_dialogues, get_character_name_map
import os
from pathlib import Path
import traceback
import json
import yaml
import io
import zipfile
from collections import defaultdict, Counter
import re

app = FastAPI(title="AI 小说转剧本工具")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConvertRequest(BaseModel):
    text: str
    title: str
    model: Optional[str] = "qwen-turbo"
    style: Optional[str] = "realistic"

@app.post("/api/convert")
async def convert(request: ConvertRequest):
    try:
        print(f"收到转换请求，标题: {request.title}, 风格: {request.style}, 模型: {request.model}, 文本长度: {len(request.text)}")
        script = await convert_novel(request.text, request.title, request.style, request.model)
        print("剧本生成成功，开始添加统计...")
        dialogues = count_dialogues(script)
        name_map = get_character_name_map(script)
        script["stats"] = {
            "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
        }
        return script
    except Exception as e:
        print("="*50)
        print("转换出错:")
        traceback.print_exc()
        print("="*50)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), style: Optional[str] = "realistic", model: Optional[str] = "qwen-turbo"):
    if not file.filename.endswith('.txt'):
        raise HTTPException(400, "只支持 .txt 文件")
    content = await file.read()
    text = content.decode('utf-8')
    title = file.filename.replace('.txt', '')
    script = await convert_novel(text, title, style, model)
    dialogues = count_dialogues(script)
    name_map = get_character_name_map(script)
    script["stats"] = {
        "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
    }
    return script

@app.get("/api/health")
def health():
    return {"status": "ok"}

class ChatRequest(BaseModel):
    script: dict
    question: str

@app.post("/api/chat2")
async def chat(request: ChatRequest):
    from app.workflow.agents import get_llm
    import json
    llm = get_llm(model="qwen-plus", temperature=0.5)
    script_str = json.dumps(request.script, ensure_ascii=False, indent=2)
    prompt = f"""你是一个专业的剧本分析助手。根据以下剧本内容回答用户的问题。

剧本：
{script_str}

用户问题：{request.question}

请给出清晰、有帮助的回答，不超过300字。
"""
    response = llm.invoke(prompt)
    return {"answer": response.content}

# ========== 角色关系分析 ==========
@app.post("/api/analysis/relation")
async def relation_analysis(script: dict):
    scenes = script.get("scenes", [])
    characters = script.get("characters", [])
    char_id_to_name = {c["id"]: c["name"] for c in characters}
    char_count = defaultdict(int)
    for scene in scenes:
        for cid in scene.get("characters", []):
            char_count[cid] += 1
    nodes = []
    for char in characters:
        cid = char["id"]
        cnt = char_count.get(cid, 0)
        nodes.append({
            "id": cid,
            "label": char["name"],
            "value": max(cnt, 1),
            "title": f"{char['name']} (出场{cnt}次)"
        })
    co_occurrence = defaultdict(Counter)
    for scene in scenes:
        scene_chars = scene.get("characters", [])
        for i, c1 in enumerate(scene_chars):
            for c2 in scene_chars[i+1:]:
                if c1 != c2:
                    co_occurrence[c1][c2] += 1
                    co_occurrence[c2][c1] += 1
    edges = []
    for c1, counters in co_occurrence.items():
        for c2, weight in counters.items():
            if c1 < c2:
                edges.append({
                    "from": c1,
                    "to": c2,
                    "value": weight,
                    "title": f"共同出场 {weight} 次"
                })
    return {"nodes": nodes, "edges": edges}

# ========== 剧本解析总结（含评分） ==========
@app.post("/api/analysis/summary")
async def script_summary(script: dict):
    from app.workflow.agents import get_llm, script_analysis_agent
    llm = get_llm(model="qwen-plus", temperature=0.5)
    result = script_analysis_agent(script, llm)
    return result

# ========== 打包下载 ==========
@app.post("/api/export/all")
async def export_all(script: dict):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        yaml_str = yaml.dump(script, allow_unicode=True, indent=2)
        zip_file.writestr("script.yaml", yaml_str)
        json_str = json.dumps(script, ensure_ascii=False, indent=2)
        zip_file.writestr("script.json", json_str)
        chars = script.get("characters", [])
        md_chars = "# 角色信息\n\n"
        for c in chars:
            md_chars += f"- **{c.get('name')}** ({c.get('id')}): {c.get('role_type')}\n"
            md_chars += f"  - 性格：{c.get('personality', '无')}\n"
            md_chars += f"  - 外貌：{c.get('appearance', '无')}\n"
            md_chars += f"  - 背景：{c.get('background', '无')}\n"
            md_chars += f"  - 首次出现：{c.get('first_appearance', '未知')}\n\n"
        zip_file.writestr("characters.md", md_chars)
        scenes = script.get("scenes", [])
        md_scenes = "# 场景信息\n\n"
        for s in scenes:
            md_scenes += f"## {s.get('title')} ({s.get('scene_id')})\n"
            md_scenes += f"- 地点：{s.get('setting', {}).get('location', '未知')}\n"
            md_scenes += f"- 时间：{s.get('setting', {}).get('time_of_day', '未知')}\n"
            md_scenes += f"- 氛围：{s.get('setting', {}).get('atmosphere', '未知')}\n"
            md_scenes += f"- 出场角色：{', '.join(s.get('characters', []))}\n"
            md_scenes += f"- 情感弧线：{s.get('emotional_arc', '无')}\n\n"
        zip_file.writestr("scenes.md", md_scenes)
        stats = script.get("stats", {})
        md_stats = "# 剧本统计\n\n"
        if stats.get("character_dialogues"):
            md_stats += "## 角色台词条数\n"
            for name, cnt in stats["character_dialogues"].items():
                md_stats += f"- {name}: {cnt} 条\n"
        zip_file.writestr("analysis.md", md_stats)
    zip_buffer.seek(0)
    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=script_export.zip"})

# ========== 长文本分段处理 ==========
def split_into_chapters(text: str) -> list:
    pattern = r'^(第[一二三四五六七八九十百千万0-9]+[章节])'
    lines = text.split('\n')
    chapters = []
    current_chapter = ""
    for line in lines:
        if re.match(pattern, line.strip()):
            if current_chapter:
                chapters.append(current_chapter.strip())
            current_chapter = line + "\n"
        else:
            current_chapter += line + "\n"
    if current_chapter:
        chapters.append(current_chapter.strip())
    if len(chapters) <= 1:
        chunk_size = 2000
        chapters = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    return chapters

@app.post("/api/convert/long")
async def convert_long(request: ConvertRequest):
    print("收到长文本转换请求，长度:", len(request.text))
    chapters = split_into_chapters(request.text)
    print(f"切分为 {len(chapters)} 个片段")
    merged_characters = {}
    merged_scenes = []
    merged_metadata = None
    merged_summary = None
    for idx, chapter_text in enumerate(chapters):
        print(f"处理第 {idx+1}/{len(chapters)} 片段...")
        temp_title = f"{request.title}_part{idx+1}"
        script = await convert_novel(chapter_text, temp_title, request.style, request.model)
        for char in script.get("characters", []):
            char_id = char["id"]
            if char_id not in merged_characters:
                merged_characters[char_id] = char
        base_scene_id = len(merged_scenes) + 1
        for scene in script.get("scenes", []):
            new_id = f"S{base_scene_id:03d}"
            scene["scene_id"] = new_id
            merged_scenes.append(scene)
            base_scene_id += 1
        if merged_metadata is None:
            merged_metadata = script.get("metadata", {})
            merged_metadata["title"] = request.title
            merged_metadata["total_chapters"] = len(chapters)
        if merged_summary is None:
            merged_summary = script.get("summary", {})
    final_characters = list(merged_characters.values())
    final_scenes = merged_scenes
    final_script = {
        "metadata": merged_metadata,
        "characters": final_characters,
        "scenes": final_scenes,
        "summary": merged_summary,
        "stats": {}
    }
    dialogues = count_dialogues(final_script)
    name_map = get_character_name_map(final_script)
    final_script["stats"] = {
        "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
    }
    return final_script

# ========== 前端服务 ==========
BASE_DIR = Path(__file__).parent.parent
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")
    @app.get("/")
    async def serve_index():
        index_path = frontend_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"error": "index.html not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)