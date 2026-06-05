# app/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from app.workflow.graph import convert_novel
from app.utils.stats import count_dialogues, get_character_name_map  # 新增导入统计函数
import os

app = FastAPI(title="AI 小说转剧本工具")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# 请求模型，增加 style 字段
class ConvertRequest(BaseModel):
    text: str
    title: str
    model: Optional[str] = "qwen-plus"
    style: Optional[str] = "realistic"  # 新增：剧本风格，默认写实


# @app.post("/api/convert")
# async def convert(request: ConvertRequest):
#     try:
#         # 调用工作流时传入 style 参数
#         script = await convert_novel(request.text, request.title, request.style)
#
#         # 添加统计信息
#         dialogues = count_dialogues(script)
#         name_map = get_character_name_map(script)
#         script["stats"] = {
#             "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
#         }
#         return script
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/convert")
async def convert(request: ConvertRequest):
    import traceback
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
        print("="*50)
        print("转换出错:")
        traceback.print_exc()
        print("="*50)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_file(
        file: UploadFile = File(...),
        style: Optional[str] = "realistic"  # 通过 form 参数传递 style
):
    if not file.filename.endswith('.txt'):
        raise HTTPException(400, "只支持 .txt 文件")
    content = await file.read()
    text = content.decode('utf-8')
    title = file.filename.replace('.txt', '')
    script = await convert_novel(text, title, style)

    # 添加统计信息
    dialogues = count_dialogues(script)
    name_map = get_character_name_map(script)
    script["stats"] = {
        "character_dialogues": {name_map.get(k, k): v for k, v in dialogues.items()}
    }
    return script


@app.get("/api/health")
def health():
    return {"status": "ok"}


from pathlib import Path

# 获取项目根目录（app目录的父目录）
BASE_DIR = Path(__file__).parent.parent
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)