# app/workflow/agents.py
import json
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
import yaml
from datetime import datetime

load_dotenv()

def get_llm(model="qwen-turbo", temperature=0.3):
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=16384,
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

def fast_parser_agent(state: dict, llm_fast) -> dict:
    prompt = f"""你是一个专业的小说分析专家。请分析以下小说，输出一个完整的 JSON 对象。

小说原文：
{state["raw_text"][:5000]}

输出格式：
{{
  "chapters": [
    {{"title": "第1章 相遇", "summary": "简短摘要", "characters_appeared": ["张三"], "key_conflict": "矛盾点", "emotional_tone": "氛围"}}
  ],
  "characters": [
    {{"id": "char_001", "name": "张三", "role_type": "protagonist", "personality": "...", "appearance": "...", "background": "...", "first_appearance": "第1章"}}
  ],
  "scenes": [
    {{"scene_id": "S001", "title": "深夜咖啡馆", "setting": {{"location": "...", "time_of_day": "night", "atmosphere": "..."}}, "characters": ["char_001"], "emotional_arc": "..."}}
  ]
}}

注意：不要输出任何额外解释，只输出 JSON。
"""
    resp = llm_fast.invoke(prompt)
    data = parse_json_response(resp.content)
    state["parsed_chapters"] = data.get("chapters", [])
    state["total_chapters"] = len(state["parsed_chapters"])
    state["extracted_characters"] = data.get("characters", [])
    state["planned_scenes"] = data.get("scenes", [])
    return state

def script_generation_agent(state: dict, llm) -> dict:
    style = state.get("style", "realistic")
    style_prompts = {
        "realistic": "【风格要求】采用写实风格，对白自然生活化，动作描写细腻真实，符合日常逻辑。",
        "suspense": "【风格要求】采用悬疑风格，营造紧张不安的氛围，多用短句、留白和环境暗示，对白简练富有张力。",
        "literary": "【风格要求】采用文艺风格，台词富有诗意和哲思，场景意象化，情感表达含蓄而深刻。"
    }
    style_instruction = style_prompts.get(style, style_prompts["realistic"])

    prompt = f"""你是编剧，将小说转换为结构化剧本YAML。严格按格式输出。

{style_instruction}

小说：{state["raw_text"][:3000]}
角色库（已提取）：
{json.dumps(state["extracted_characters"], ensure_ascii=False, indent=2)}
场景框架（已规划）：
{json.dumps(state["planned_scenes"], ensure_ascii=False, indent=2)}

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

# ========== 新增：剧本解析总结（含质量评分） ==========
def script_analysis_agent(script: dict, llm) -> dict:
    """独立的分析函数，用于生成包含评分的解析报告，被 /api/analysis/summary 调用"""
    script_str = json.dumps(script, ensure_ascii=False, indent=2)
    prompt = f"""你是一位资深剧本分析师。请分析以下剧本，生成一份专业的解析报告，并给出1-10分的综合质量评分（10分为最高）。

剧本内容：
{script_str[:10000]}

请以 JSON 格式输出，键名如下：
{{
    "theme": "故事主题",
    "style": "整体风格判断",
    "structure": "情节结构分析",
    "character_arcs": "角色弧线描述",
    "highlights": ["亮点1", "亮点2"],
    "suggestions": ["改进建议1", "改进建议2"],
    "score": 8
}}

注意：score 字段为整数，表示剧本的综合质量评分。
"""
    response = llm.invoke(prompt)
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    try:
        result = json.loads(content)
    except:
        result = {"error": "解析失败", "raw": content[:500]}
    return result

# 兼容旧代码
def chapter_parser_agent(state, llm): pass
def character_extractor_agent(state, llm): pass
def scene_planner_agent(state, llm): pass