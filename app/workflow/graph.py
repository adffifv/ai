# app/workflow/graph.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any
from .agents import get_llm, fast_parser_agent, script_generation_agent

class ConversionState(TypedDict):
    raw_text: str
    source_title: str
    parsed_chapters: List[Dict]
    total_chapters: int
    extracted_characters: List[Dict]
    planned_scenes: List[Dict]
    final_script: Dict
    error_log: List[str]
    style: str

def build_workflow():
    # 使用两个不同的模型：快速解析用 qwen-turbo，精细生成用 qwen-plus
    llm_fast = get_llm(model="qwen-turbo", temperature=0.2)
    llm_detail = get_llm(model="qwen-plus", temperature=0.3)

    workflow = StateGraph(ConversionState)

    # 定义节点
    def fast_parse_node(state):
        return fast_parser_agent(state, llm_fast)

    def generate_node(state):
        return script_generation_agent(state, llm_detail)

    workflow.add_node("fast_parse", fast_parse_node)
    workflow.add_node("generate", generate_node)

    workflow.set_entry_point("fast_parse")
    workflow.add_edge("fast_parse", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()

async def convert_novel(novel_text: str, title: str, style: str = "realistic") -> dict:
    app = build_workflow()
    initial_state = {
        "raw_text": novel_text,
        "source_title": title,
        "parsed_chapters": [],
        "total_chapters": 0,
        "extracted_characters": [],
        "planned_scenes": [],
        "final_script": {},
        "error_log": [],
        "style": style
    }
    final_state = await app.ainvoke(initial_state)
    return final_state["final_script"]