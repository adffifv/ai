# AI 小说转剧本工具 - 剧本 YAML Schema 定义

## 1. 完整 Schema

本工具生成的剧本遵循以下 YAML 结构（基于实际输出格式）：

```yaml
# 根对象包含五个顶层字段
metadata:          # 元信息
  title: string            # 剧本标题
  source_type: string      # 固定为 "novel"
  source_title: string     # 源小说标题
  total_chapters: integer  # 源小说总章节数 (≥3)
  converted_scenes: integer # 生成的场景数
  created_at: datetime     # 生成时间戳
  model_used: string       # 使用的大模型标识（如 qwen-plus / qwen-turbo）

characters:        # 角色库（数组）
  - id: string             # 唯一标识，格式 char_XXX
    name: string           # 角色姓名
    role_type: string      # protagonist/antagonist/supporting/deuteragonist/minor
    personality: string    # 性格描述
    appearance: string     # 外貌特征
    background: string     # 背景设定
    first_appearance: string # 首次出现的场景 ID（如 S001）

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

stats:             # 统计信息（可选）
  character_dialogues:     # 角色台词条数映射
    "角色名": integer      # 如 "林深": 15

2. 设计原因说明
表格
设计决策	设计原因
metadata 与内容分离	将转换来源、时间、模型等元信息独立出来，便于追踪剧本生成的历史，同时保持剧本内容的纯净，方便版本管理和归档。
全局角色库 + ID 引用	小说中的角色可能跨场景出现。采用类似数据库外键的引用模式，避免每个场景重复存储角色详细信息，保证一致性，便于后期修改。
按场景序列组织，而非按章节	小说按章节叙事，剧本按场景展开。场景是剧本的最小叙事单元，一个章节可能拆成多个场景，多个短章节也可能合并为一个场景。scenes 数组直接对应剧本结构。
script 数组混合对话与动作	真实剧本中，对白和动作交错出现。将两者放在同一个列表中，按顺序记录 “谁说了什么” 和 “谁做了什么”，能更自然还原影视剧本的阅读和拍摄逻辑。
emotional_arc 字段	好莱坞编剧理论强调 “每个场景都要有情感变化”。该字段帮助作者检查每个场景是否推动了情感叙事，方便后期打磨节奏。
三幕式 structure 摘要	在剧本顶部提供激励事件、发展、高潮、结局的总结，让导演、制片人或作者能快速把握全局叙事脉络，无需通读所有场景。
logline 与 theme	一句话梗概和主题思想是剧本提案的核心要素，单独列出便于直接用于 pitch 或评审。
stats 统计信息	自动统计每个角色的台词条数，并以柱状图形式在前端展示，帮助作者直观分析角色戏份分布。
3. 实际生成示例
运行本项目后，输入包含 3 章以上的小说（可参考仓库中的 test_novel.txt），会生成符合上述 Schema 的 YAML 剧本。其中 scenes 数组包含了每个场景的具体台词和动作，summary 自动提取了三幕式结构和主题，stats 提供了对话统计。
（具体示例可查看项目输出的 output_script.yaml 文件。）
