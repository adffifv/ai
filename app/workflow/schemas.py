# app/workflow/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Metadata(BaseModel):
    title: str
    source_type: str = "novel"
    source_title: str
    total_chapters: int = Field(ge=3)
    converted_scenes: int
    created_at: datetime = Field(default_factory=datetime.now)
    model_used: str

class Character(BaseModel):
    id: str = Field(pattern=r"^char_\d+$")
    name: str
    role_type: str  # protagonist/antagonist/supporting/minor
    personality: Optional[str] = None
    appearance: Optional[str] = None
    background: Optional[str] = None
    first_appearance: Optional[str] = None

class Setting(BaseModel):
    location: str
    time_of_day: str  # day/night/dawn/dusk
    atmosphere: str
    props: Optional[List[str]] = None

class DialogueBlock(BaseModel):
    speaker_id: str
    lines: List[str]

class ActionLine(BaseModel):
    description: str
    character_involved: str

class Scene(BaseModel):
    scene_id: str = Field(pattern=r"^S\d+$")
    title: str
    setting: Setting
    characters: List[str]
    dialogue_blocks: List[DialogueBlock]
    action_lines: List[ActionLine]
    emotional_arc: str
    source_chapter_ref: Optional[str] = None

class Structure(BaseModel):
    inciting_incident: str
    rising_action: str
    climax: str
    resolution: str

class Summary(BaseModel):
    logline: str
    structure: Structure
    theme: str

class Script(BaseModel):
    metadata: Metadata
    characters: List[Character]
    scenes: List[Scene]
    summary: Summary