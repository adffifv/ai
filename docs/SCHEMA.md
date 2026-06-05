# AI 小说转剧本工具 - 剧本 YAML Schema 定义

## 1. 完整 Schema

本工具生成的剧本遵循以下 YAML 结构（基于实际输出格式）：

```yaml
# 根对象包含四个顶层字段
metadata:          # 元信息
  title: string            # 剧本标题
  source_type: string      # 固定为 "novel"
  source_title: string     # 源小说标题
  total_chapters: integer  # 源小说总章节数 (≥3)
  converted_scenes: integer # 生成的场景数
  created_at: datetime     # 生成时间戳
  model_used: string       # 使用的大模型标识

characters:        # 角色库（数组）
  - id: string             # 唯一标识，格式 char_XXX
    name: string           # 角色姓名
    role_type: string      # protagonist/antagonist/supporting/deuteragonist/minor
    personality: string    # 性格描述
    appearance: string     # 外貌特征
    background: string     # 背景设定
    first_appearance: string # 首次出现的场景 ID

scenes:            # 场景序列（数组）
  - scene_id: string       # 场景编号，格式 SXXX
    title: string          # 场景标题
    setting:               # 场景设定
      location: string     # 具体地点
      time_of_day: string  # day/night/morning/afternoon/early_morning/late_afternoon/dawn/dusk
      atmosphere: string   # 氛围描述
    characters: [string]   # 出现角色 ID 列表
    emotional_arc: string  # 本场景情感走向
    estimated_lines: integer # 预估台词条数（可选）
    script:                # 剧本正文（对白+动作混合）
      - character: string  # 说话人 ID（可为空字符串表示纯动作）
        dialogue: string   # 台词（可为空）
        action: string     # 动作描述（可为空）

summary:           # 全局总结
  logline: string          # 一句话剧情梗概
  structure:               # 三幕式结构
    inciting_incident: string  # 激励事件
    rising_action: string      # 发展部分
    climax: string             # 高潮
    resolution: string         # 结局
  theme: string          # 主题思想