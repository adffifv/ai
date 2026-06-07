# app/workflow/agents.py
import json
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
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
        "realistic": "写实风格，对白自然生活化，动作描写细腻真实",
        "suspense": "悬疑风格，营造紧张不安的氛围，多用短句、留白和环境暗示，对白简练富有张力",
        "literary": "文艺风格，台词富有诗意和哲思，场景意象化，情感表达含蓄而深刻"
    }
    style_instruction = style_prompts.get(style, style_prompts["realistic"])

    prompt = f"""你是编剧。根据以下小说内容生成结构化剧本，以 JSON 格式输出。

{style_instruction}

小说：{state["raw_text"][:3000]}
已提取的角色库（仅供参考，可在此基础上丰富）：
{json.dumps(state["extracted_characters"], ensure_ascii=False, indent=2)}
已规划的场景框架（仅供参考）：
{json.dumps(state["planned_scenes"], ensure_ascii=False, indent=2)}

请严格按照以下 JSON Schema 输出，不要添加任何额外字段：
{{
    "metadata": {{
        "title": "{state["source_title"]}（剧本版）",
        "source_type": "novel",
        "source_title": "{state["source_title"]}",
        "total_chapters": {state["total_chapters"]},
        "converted_scenes": {len(state["planned_scenes"])},
        "created_at": "{datetime.now().isoformat()}",
        "model_used": "{llm.model_name}"
    }},
    "characters": [
        {{
            "id": "char_001",
            "name": "角色名",
            "role_type": "protagonist",
            "personality": "性格描述",
            "appearance": "外貌",
            "background": "背景",
            "first_appearance": "S001"
        }}
    ],
    "scenes": [
        {{
            "scene_id": "S001",
            "title": "场景标题",
            "setting": {{
                "location": "地点",
                "time_of_day": "day/night/morning/afternoon/dawn/dusk",
                "atmosphere": "氛围"
            }},
            "characters": ["char_001"],
            "emotional_arc": "情感走向",
            "script": [
                {{
                    "character": "char_001",
                    "dialogue": "台词内容",
                    "action": "动作描述"
                }}
            ]
        }}
    ],
    "summary": {{
        "logline": "一句话剧情梗概",
        "structure": {{
            "inciting_incident": "激励事件",
            "rising_action": "发展部分",
            "climax": "高潮",
            "resolution": "结局"
        }},
        "theme": "主题思想"
    }}
}}

注意：只输出 JSON，不要包含任何其他文字或 markdown 标记。
"""
    resp = llm.invoke(prompt)
    content = resp.content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    try:
        final_script = json.loads(content)
    except json.JSONDecodeError as e:
        state["error_log"].append(f"JSON 解析失败: {e}\n内容: {content[:500]}")
        raise
    state["final_script"] = final_script
    return state

# 兼容旧代码
def chapter_parser_agent(state, llm): pass
def character_extractor_agent(state, llm): pass
def scene_planner_agent(state, llm): pass