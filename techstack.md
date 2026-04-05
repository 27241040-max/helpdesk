# 项目技术栈 (Tech Stack)

## 1. 前端 (Frontend)
- **框架:** Next.js (React) / TypeScript
- **UI 组件库:** Tailwind CSS + Shadcn UI (适合快速开发高质量、现代化的管理仪表板)

## 2. 后端 (Backend)
- **运行环境:** Node.js 
- **框架:** Express 或 NestJS (也可以直接使用 Next.js 的 API Routes 来保持架构轻量化)

## 3. 数据库与身份验证 (Database & Auth)
- **主数据库:** PostgreSQL (关系型数据库，非常适合存工单系统复杂的关联数据)
- **ORM 工具:** Prisma 或 Drizzle ORM
- **身份验证 (Authentication): 基于数据库会话 (Database Sessions)**
  - 系统放弃使用 JWT，而是将所有的用户（管理员和代理）登录 Session 凭证直接持久化存储在 PostgreSQL 数据库中。
  - 优势：可以直接在数据库级别轻松撤销某人的登录状态，更方便管理员进行后台用户权限管理，安全性更高。
- **知识库存储:** 开启 PostgreSQL 的 `pgvector` 插件，无需额外部署向量数据库即可妥善存储 AI 知识库的内容。

## 4. 邮件与自动化集成 (Email Integration)
- **接收邮件 (IMAP):** `imapflow` 库 (监听和接收传入工单)
- **发送邮件 (SMTP):** `Nodemailer` 库 (为 AI 自动回复或代理的手动回复发送邮件)

## 5. AI 智能引擎 (AI Engine)
- **大模型:** 暂定 OpenAI API 或同类大语言模型
- **集成库:** LangChain.js 或 Vercel AI SDK (用于生成系统回复、提取摘要、进行分类等操作)

## 6. 定时任务与队列 (Cron & Queue)
- **队列工具:** BullMQ 配合 Redis，或较新的 Trigger.dev
- **主要场景:** 执行耗时的后台分析调度，最重要的是用来支持 **SLA 的 24 小时监控计时器**，超时未回复则系统自动将工单标红并触发提醒机制。
