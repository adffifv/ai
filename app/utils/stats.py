# app/utils/stats.py
from collections import Counter
from typing import Dict

def count_dialogues(script_dict: dict) -> Dict[str, int]:
    """
    统计每个角色的台词数量（按 dialogue 字段非空）
    注意：生成的剧本中 scenes 下每个项目有 'script' 数组，
    每个元素包含 'character' 和 'dialogue' 字段
    """
    character_stats = Counter()
    for scene in script_dict.get("scenes", []):
        for item in scene.get("script", []):
            dialogue = item.get("dialogue", "")
            if dialogue and dialogue.strip():
                speaker = item.get("character")
                if speaker:
                    character_stats[speaker] += 1
    return dict(character_stats)

def get_character_name_map(script_dict: dict) -> Dict[str, str]:
    """角色ID到名称的映射"""
    return {c["id"]: c["name"] for c in script_dict.get("characters", []) if "id" in c and "name" in c}