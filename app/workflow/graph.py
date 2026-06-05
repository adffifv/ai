# app/workflow/graph.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any
from .agents import get_llm, chapter_parser_agent, character_extractor_agent, scene_planner_agent, \
    script_generation_agent


class ConversionState(TypedDict):
    raw_text: str
    source_title: str
    parsed_chapters: List[Dict]
    total_chapters: int
    extracted_characters: List[Dict]
    planned_scenes: List[Dict]
    final_script: Dict
    error_log: List[str]
    style: str  # 新增：剧本风格（realistic/suspense/literary）


def build_workflow():
    llm = get_llm()
    workflow = StateGraph(ConversionState)

    def parse_node(state): return chapter_parser_agent(state, llm)

    def extract_node(state): return character_extractor_agent(state, llm)

    def plan_node(state): return scene_planner_agent(state, llm)

    def generate_node(state): return script_generation_agent(state, llm)

    workflow.add_node("parse", parse_node)
    workflow.add_node("extract", extract_node)
    workflow.add_node("plan", plan_node)
    workflow.add_node("generate", generate_node)

    workflow.set_entry_point("parse")
    workflow.add_edge("parse", "extract")
    workflow.add_edge("extract", "plan")
    workflow.add_edge("plan", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()


async def convert_novel(novel_text: str, title: str, style: str = "realistic") -> dict:
    """
    将小说转换为剧本
    :param novel_text: 小说原文
    :param title: 小说标题
    :param style: 剧本风格，可选 realistic / suspense / literary
    """
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
        "style": style  # 传递风格参数
    }
    final_state = await app.ainvoke(initial_state)
    return final_state["final_script"]