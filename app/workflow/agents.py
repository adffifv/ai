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
        max_tokens=8192,
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

# 新的快速解析 Agent：一次性输出章节、角色、场景框架
def fast_parser_agent(state: dict, llm_fast) -> dict:
    prompt = f"""你是一个专业的小说分析专家。请分析以下小说，输出一个完整的 JSON 对象。

小说原文：
{state["raw_text"][:8000]}

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

# 保留原有的 script_generation_agent 但稍作修改以适应风格参数和新的状态
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

小说：{state["raw_text"][:6000]}
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
characters:  # 这里直接使用上面提供的角色库，可适当丰富
  - id: char_001
    name: 张三
    role_type: protagonist
    personality: ...
    appearance: ...
    background: ...
    first_appearance: S001
scenes:  # 根据场景框架生成详细内容，每个场景需包含 script 数组（对话+动作）
  - scene_id: S001
    title: ...
    setting:
      location: ...
      time_of_day: night
      atmosphere: ...
    characters: ["char_001"]
    emotional_arc: ...
    script:
      - character: char_001
        dialogue: "你好"
        action: "推门而入"
summary:
  logline: 一句话梗概
  structure:
    inciting_incident: ...
    rising_action: ...
    climax: ...
    resolution: ...
  theme: ...
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

# 为了兼容旧代码，保留原来的三个 Agent 函数（但不会被调用）
def chapter_parser_agent(state: dict, llm) -> dict:
    # 保留原函数，但实际不使用
    pass

def character_extractor_agent(state: dict, llm) -> dict:
    pass

def scene_planner_agent(state: dict, llm) -> dict:
    pass