# AI 智能客服工单系统

一个面向外贸 To C 售后场景的全栈 AI 客服工单系统。系统把客户邮件自动沉淀为工单，支持客服分配、状态流转、邮件回复、AI 分类、AI 摘要、回复润色、知识库自动解决和 Dashboard 统计。

这个项目的重点不是简单调用大模型，而是把 AI 放进真实客服工作流：邮件进入系统后先结构化落库，再通过后台任务触发 AI 分类与自动回复；无法自动解决的问题回到人工客服队列，保证业务流程可追踪、可人工接管、可测试和可部署。

## 项目亮点

- **完整业务闭环**：客户邮件入站 -> 创建/归并工单 -> AI 分类 -> AI 知识库判断 -> 自动回复或转人工 -> Dashboard 统计。
- **权限与账号管理**：基于 Better Auth 数据库会话实现登录认证，通过 RBAC 区分管理员和客服；管理员可创建、编辑、软删除客服账号。
- **邮件工单化**：集成 SendGrid inbound webhook，解析客户邮件、清洗历史引用、处理 Message-ID 幂等和 References 线程归并。
- **AI 客服能力**：基于 DeepSeek 和 Vercel AI SDK 实现工单分类、摘要、客服回复润色，以及 Markdown 知识库驱动的自动解决。
- **异步任务队列**：使用 pg-boss 编排 AI 自动分类和自动回复，避免 webhook 请求被大模型调用阻塞。
- **工程化交付**：包含共享 schema、单元/组件测试、E2E 测试、Sentry、Docker、Railway 部署和 Codex GitHub Actions。

## 业务流程

```mermaid
flowchart LR
  A["客户发送售后邮件"] --> B["SendGrid Inbound Webhook"]
  B --> C["Express 解析邮件并校验 secret"]
  C --> D{"是否已有邮件线程"}
  D -->|"是"| E["追加为工单回复"]
  D -->|"否"| F["创建 Customer 和 Ticket"]
  F --> G["pg-boss 入队"]
  G --> H["AI 自动分类"]
  H --> I["AI 读取 Markdown 知识库"]
  I --> J{"知识库是否足够解决"}
  J -->|"是"| K["生成回复并发送邮件"]
  K --> L["工单标记为 resolved"]
  J -->|"否"| M["转为 open 等待人工客服"]
  E --> M
```

## 架构说明

```text
helpdesk/
├── client/        React + Vite 前端后台
├── server/        Node.js + Express API、认证、AI、邮件、任务队列
├── core/          前后端共享 Zod schema 和 TypeScript 类型
├── playwright/    E2E 测试
├── docs/          Docker / Railway 部署说明
└── .github/       Codex GitHub Actions 工作流
```

### 前端

- React + Vite + TypeScript 构建后台管理界面。
- React Query 管理服务端状态，覆盖用户、工单、详情、统计等数据。
- shadcn/ui + Tailwind CSS 实现后台表格、表单、对话框、状态 Badge 和 Dashboard。
- 前端路由守卫限制未登录用户访问后台页面，管理员路由单独校验角色。

### 后端

- Express 提供 REST API，Prisma 访问 PostgreSQL。
- Better Auth 管理用户、账号和数据库 session。
- SendGrid inbound webhook 负责邮件入站，SendGrid Mail 负责出站回复。
- pg-boss 使用 PostgreSQL 作为任务队列存储，处理 AI 自动分类和自动回复。
- Vercel AI SDK 统一调用 DeepSeek，支持文本生成和结构化 JSON 输出。

### 共享类型与校验

项目使用 `core` workspace 存放共享 Zod schema，例如：

- `core/users.ts`：创建/编辑用户的表单和 API 校验规则。
- `core/email.ts`：工单列表查询、工单更新、分配、回复、邮件入站等 schema。

前端表单和后端接口复用同一套 schema，避免前后端校验规则不一致。

## 核心功能

### 1. 认证与 RBAC

- 管理员和客服使用 Better Auth 登录。
- `/api/tickets` 等业务接口需要有效 session。
- `/api/users` 用户管理接口需要管理员角色。
- 删除客服账号时采用软删除，并自动解除该客服已分配工单，避免工单引用无效账号。

### 2. 邮件入站与工单创建

SendGrid webhook 进入后端后，系统会：

1. 校验 `INBOUND_EMAIL_SECRET`。
2. 解析 multipart 邮件字段。
3. 从 HTML 兜底提取纯文本。
4. 清理邮件历史引用。
5. 根据 `Message-ID` 防重复创建。
6. 根据 `In-Reply-To` / `References` 归并已有工单线程。
7. 新邮件创建为 `Ticket`，并交给 AI 后台任务处理。

### 3. AI 自动处理

AI 能力分为两类：

- **客服辅助**：工单摘要、回复润色、工单分类。
- **自动化处理**：读取 Markdown 知识库，判断是否能自动解决；能解决则生成回复、发送邮件并关闭工单，不能解决则转人工。

### 4. Dashboard 统计

Dashboard 展示：

- 总工单数
- Open 工单数
- AI 自动解决数
- AI 解决率
- 平均解决时间
- 最近 30 天工单趋势

统计逻辑通过 PostgreSQL Stored Function 聚合，Node.js 侧只读取聚合结果，减少全量数据拉取和内存计算压力。

### 5. 测试与部署

- 前端组件测试：Vitest + React Testing Library。
- 端到端测试：Playwright。
- 错误监控：Sentry。
- 本地容器化：Docker Compose。
- 生产部署：Railway。
- AI 协作：Codex GitHub Actions 支持 PR review 和 issue/PR mention 响应。

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React, Vite, TypeScript, React Query, Tailwind CSS, shadcn/ui |
| 后端 | Node.js, Express, TypeScript |
| 数据库 | PostgreSQL, Prisma |
| 认证 | Better Auth, Database Session, RBAC |
| AI | DeepSeek, Vercel AI SDK |
| 邮件 | SendGrid Inbound Parse, SendGrid Mail |
| 队列 | pg-boss |
| 测试 | Vitest, React Testing Library, Playwright |
| 部署 | Docker, Railway |
| 监控与协作 | Sentry, GitHub Actions, Codex Action |

## 本地运行

### 方式一：Docker Compose

适合面试官快速启动核心应用。

```bash
npm run docker:up
```

启动后访问：

```text
http://localhost:4000
```

默认管理员账号：

```text
admin@example.com
qwerdf66
```

停止服务：

```bash
npm run docker:down
```

### 方式二：本地开发

1. 安装依赖：

```bash
npm install
```

2. 准备服务端环境变量：

```bash
copy server\.env.example server\.env
```

3. 配置 `server/.env` 中的数据库、Better Auth、AI 和 SendGrid 变量。

4. 生成 Prisma Client 并执行迁移/seed：

```bash
npm run prisma:generate --workspace server
npm run prisma:migrate --workspace server
npm run prisma:seed --workspace server
```

5. 启动开发环境：

```bash
npm run dev
```

默认端口：

```text
前端: http://localhost:5173
后端: http://localhost:4000
```

## 常用命令

```bash
# 类型检查和构建
npm run typecheck

# 前端组件/单元测试
npm run test --workspace client

# Playwright E2E
npm run playwright:test

# Docker 本地运行
npm run docker:up
```

## 面试讲解重点

可以从这 4 个角度讲：

1. **为什么做**：外贸 To C 售后邮件量大，客服需要手动阅读、分类、回复，响应慢且难追踪。
2. **怎么落地**：把邮件转成工单，再把 AI 分类、摘要、回复润色和知识库自动解决接入工单流。
3. **工程难点**：邮件线程归并、接口幂等、权限隔离、异步任务、AI 结构化输出、人工兜底。
4. **可验证结果**：有真实代码、测试、Docker/Railway 部署配置、Dashboard 统计和 GitHub Actions。

## 边界说明

当前实现是 Markdown 知识库驱动的 AI 自动解决，不是向量数据库知识库；邮件入站采用 SendGrid inbound webhook，不是 IMAP 监听。
