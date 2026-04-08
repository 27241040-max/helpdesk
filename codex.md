# codex 项目记忆文件 (Project Context Memory)

这是为 codex AI 助手的后续会话所保留的专属记忆与行为准则设置文件。在每次启动或深度开发时，应参考此处的信息。

## 1. 核心指令：始终获取最新文档 (Context7)
为了防止 AI 的历史数据幻觉或生成了旧版废弃框架的代码，本项目规定：
- 当涉及复杂或容易发生版本迭代的技术栈（如 React、Prisma、Tailwind UI 库或特定 API 接入）时，**必须优先使用 `context7` 工具去检索最新文档**。

### 如何通过 Antigravity 触发 Context7
虽然此界面不展示原生的 MCP Server 菜单，但可以通过静默终端调用完成查询：
1. **寻找精确的库资源 ID:** `npx -y ctx7 library <组件名>`
2. **获得最新文档和代码范例:** `npx -y ctx7 docs <libraryId> "<具体的疑问/查询>"`
*(例如: `npx ctx7 docs /prisma/prisma "how to map relations" `)*

---

## 2. 当前技术架构大纲
- **项目结构:** NPM Workspaces 驱动的 Monorepo (含 `/client` 和 `/server`)
- **前端系统:** React + Vite + TypeScript (端口: 5173) 
- **后端系统:** Node.js + Express + TypeScript + Prisma (端口: 4000)
- **数据库引擎:** PostgreSQL (包含 `pgvector` 设置以备后续的知识库检索使用)

## 3. 进行中的上下文轨迹
- 项目前后台通讯健康路由 (`/api/health`) 已经成功确立。
- 等待进入下一步的细化开发工作：**前端整体布局 UI 开发** 以及 **Prisma 数据库的表结构 (Schema) 设定**。
