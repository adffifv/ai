# AI 小说转剧本工具

> 基于 LangGraph 和通义千问的智能小说转剧本工具，支持 3 章节以上小说一键生成结构化剧本（YAML 格式），并提供角色/场景卡片、统计图表、AI 问答等增强功能。

## ✨ 功能特点

- **📖 小说转剧本**：上传 .txt 小说文件或粘贴文本，自动解析章节、提取角色、规划场景，生成专业剧本。
- **🎭 多风格支持**：可选写实、悬疑、文艺三种剧本风格，AI 根据风格调整台词和氛围。
- **👥 角色/场景卡片**：以卡片形式清晰展示每个角色的详细信息（性格、外貌、背景）和每个场景的设定（地点、时间、氛围、出场角色、情感弧线）。
- **📊 对话统计图表**：自动统计每个角色的台词条数，生成可视化柱状图，帮助分析角色戏份。
- **🤖 AI 剧本助手**：转换完成后，可向 AI 提问关于剧本的任何问题（如角色分析、主题总结、情节建议等），获得即时回答。
- **📁 导出与复制**：支持导出 YAML/JSON 文件，或一键复制 YAML 内容到剪贴板。

## 🛠️ 技术栈

- **后端**：FastAPI + LangGraph（多 Agent 工作流） + 通义千问（qwen-turbo / qwen-plus）
- **前端**：原生 HTML/CSS/JS + Tailwind CSS + highlight.js + Chart.js + js-yaml
- **语言**：Python 3.11

## 📦 快速开始

### 环境要求

- Python 3.11 或更高版本
- 阿里云百炼 API Key（通义千问）

### 安装与运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/adffifv/ai.git
   cd ai

创建虚拟环境并安装依赖


python -m venv venv
source venv/bin/activate      # Linux/Mac
venv\Scripts\activate         # Windows
pip install -r requirements.txt

配置 API Key
在项目根目录创建 .env 文件，内容如下：
DASHSCOPE_API_KEY=sk-你的真实密钥

启动后端服务

python app/main.py

服务将运行在 http://localhost:8000

访问前端

打开浏览器访问 http://localhost8000，上传或粘贴小说（至少3章），选择风格，点击“开始转换剧本”。

📖 剧本 Schema
生成的剧本遵循以下 YAML 结构（详见 docs/SCHEMA.md）：

yaml
metadata:          # 元信息（标题、来源、章节数、场景数、生成时间、模型）
characters:        # 角色库（ID、姓名、类型、性格、外貌、背景、首次出现）
scenes:            # 场景序列（ID、标题、设定、出场角色、情感弧线、对白/动作块）
summary:           # 全局总结（一句话梗概、三幕式结构、主题）
stats:             # 统计信息（角色台词条数）
🔌 API 接口
端点	方法	描述
/api/convert	POST	接收小说文本和风格，返回剧本 JSON
/api/upload	POST	上传 .txt 文件，返回剧本 JSON
/api/chat2	POST	剧本问答（需提供剧本 JSON 和问题）
/api/health	GET	健康检查
/	GET	前端界面
/static/script.js	GET	前端脚本
🧪 测试
项目根目录提供了测试小说 test_novel.txt（包含3章悬疑故事），可直接上传验证。

📄 许可证
本项目为参赛作品，知识产权归作者所有。

🙏 致谢
七牛云 XEngineer 暑期实训营

阿里云百炼平台（通义千问）

LangChain & LangGraph 社区