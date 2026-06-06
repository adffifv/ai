# app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os
import traceback
import json

from app.workflow.graph import convert_novel
from app.utils.stats import count_dialogues, get_character_name_map

app = FastAPI(title="AI 小说转剧本工具")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# 请求模型
class ConvertRequest(BaseModel):
    text: str
    title: str
    model: Optional[str] = "qwen-plus"
    style: Optional[str] = "realistic"


class ChatRequest(BaseModel):
    script: dict
    question: str


# API 路由
@app.post("/api/convert")
async def convert(request: ConvertRequest):
    try:
        print(f"收到转换请求，标题: {request.title}, 风格: {request.style}, 文本长度: {len(request.text)}")
        script = await convert_novel(request.text, request.title, request.style)
        print("剧本生成成功，开始添加统计...")
        dialogues = count_dialogues(script)
        name_map = get_character_name_map(script)
        script["stats"] = {
            "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
        }
        return script
    except Exception as e:
        print("=" * 50)
        print("转换出错:")
        traceback.print_exc()
        print("=" * 50)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_file(
        file: UploadFile = File(...),
        style: Optional[str] = "realistic"
):
    if not file.filename.endswith('.txt'):
        raise HTTPException(400, "只支持 .txt 文件")
    content = await file.read()
    text = content.decode('utf-8')
    title = file.filename.replace('.txt', '')
    script = await convert_novel(text, title, style)
    dialogues = count_dialogues(script)
    name_map = get_character_name_map(script)
    script["stats"] = {
        "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
    }
    return script


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat2")
async def chat(request: ChatRequest):
    print("聊天接口被调用")
    from app.workflow.agents import get_llm
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


# 静态文件服务（解决 API 与静态文件冲突）
BASE_DIR = Path(__file__).parent.parent
frontend_dir = BASE_DIR / "frontend"

if frontend_dir.exists():
    # 根路径返回 index.html
    @app.get("/")
    async def serve_index():
        index_path = frontend_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"error": "Frontend not found"}


    # 挂载静态资源（如 script.js）到 /static 路径
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)