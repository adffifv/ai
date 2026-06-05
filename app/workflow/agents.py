# app/workflow/agents.py
import json
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

def get_llm(model="qwen-plus", temperature=0.3):
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=4096,
        api_key=os.getenv("DASHSCOPE_API_KEY"),
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
    )

def parse_json_response(content: str) -> dict:
    content = content.strip()
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
        content = content.split("```")[1].split("```")[0]
    return json.loads(content)

def chapter_parser_agent(state: dict, llm) -> dict:
    prompt = f"""你是小说章节解析专家。分析以下文本，按章节切分，输出JSON。
小说原文：
{state["raw_text"][:8000]}

输出格式：
{{"chapters": [{{"title": "...", "summary": "...", "characters_appeared": [...], "key_conflict": "...", "emotional_tone": "..."}}], "total_chapters": 3}}
"""
    resp = llm.invoke(prompt)
    parsed = parse_json_response(resp.content)
    state["parsed_chapters"] = parsed["chapters"]
    state["total_chapters"] = parsed["total_chapters"]
    return state

def character_extractor_agent(state: dict, llm) -> dict:
    chapters = state["parsed_chapters"]
    prompt = f"""从章节摘要提取角色，按出场顺序输出JSON数组。
章节摘要：{json.dumps(chapters, ensure_ascii=False, indent=2)}
格式：[{{"id": "char_001", "name": "张三", "role_type": "protagonist", "personality": "...", "appearance": "...", "background": "...", "first_appearance": "..."}}]
"""
    resp = llm.invoke(prompt)
    characters = parse_json_response(resp.content)
    state["extracted_characters"] = characters
    return state

def scene_planner_agent(state: dict, llm) -> dict:
    chapters = state["parsed_chapters"]
    prompt = f"""将小说章节拆分为影视场景，每章2-5个场景。输出JSON。
章节信息：{json.dumps(chapters, ensure_ascii=False, indent=2)}
格式：{{"scenes": [{{"scene_id": "S001", "title": "...", "setting": {{"location": "...", "time_of_day": "night", "atmosphere": "..."}}, "characters": ["char_001"], "estimated_lines": 0, "emotional_arc": "..."}}]}}
"""
    resp = llm.invoke(prompt)
    scenes = parse_json_response(resp.content)
    state["planned_scenes"] = scenes["scenes"]
    return state

def script_generation_agent(state: dict, llm) -> dict:
    from datetime import datetime
    import yaml
    import re

    style = state.get("style", "realistic")
    style_prompts = {
        "realistic": "【风格要求】采用写实风格，对白自然生活化，动作描写细腻真实，符合日常逻辑。",
        "suspense": "【风格要求】采用悬疑风格，营造紧张不安的氛围，多用短句、留白和环境暗示，对白简练富有张力。",
        "literary": "【风格要求】采用文艺风格，台词富有诗意和哲思，场景意象化，情感表达含蓄而深刻。"
    }
    style_instruction = style_prompts.get(style, style_prompts["realistic"])

    prompt = f"""你是编剧，将小说转换为结构化剧本YAML。严格按格式输出。

{style_instruction}

小说：{state["raw_text"][:4000]}  # 缩短到4000字符
角色：{json.dumps(state["extracted_characters"], ensure_ascii=False)}
场景框架：{json.dumps(state["planned_scenes"], ensure_ascii=False)}

请确保输出完整的 YAML，不要中途截断，所有字符串必须闭合。

输出YAML：
metadata:
  title: "{state["source_title"]}（剧本版）"
  source_type: novel
  source_title: "{state["source_title"]}"
  total_chapters: {state["total_chapters"]}
  converted_scenes: {len(state["planned_scenes"])}
  created_at: "{datetime.now().isoformat()}"
  model_used: "{llm.model_name}"
characters: ...
scenes: ...
summary:
  logline: "..."
  structure:
    inciting_incident: "..."
    rising_action: "..."
    climax: "..."
    resolution: "..."
  theme: "..."
"""
    resp = llm.invoke(prompt)
    content = resp.content.strip()
    if content.startswith("```yaml"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    try:
        final_script = yaml.safe_load(content)
    except yaml.YAMLError as e:
        state["error_log"].append(f"YAML 解析失败: {e}\n内容: {content[:500]}")
        raise
    state["final_script"] = final_script
    return state