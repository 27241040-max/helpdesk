# codex 项目记忆文件

用于后续会话快速恢复项目上下文。只记录稳定、可执行、对继续开发有直接价值的信息。

## 1. 项目结构
- Monorepo，根目录使用 NPM Workspaces，包含 `client` 与 `server`。
- 前端：React + Vite + TypeScript，开发端口 `5173`。
- 后端：Express + TypeScript + Prisma，开发端口 `4000`。
- 数据库：PostgreSQL。
- 前端路径别名：`client` 内已配置 `@/* -> src/*`。
- 前端数据请求默认约定：优先使用 `axios` 作为 HTTP 客户端，优先使用 `@tanstack/react-query` 管理服务端状态；除非有明确理由，否则不要为常规数据获取继续新增裸 `fetch` 或手写 `useEffect + useState` 请求逻辑。
- 前端组件/单元测试当前使用 `Vitest + React Testing Library + jsdom + jest-dom`，测试配置在 `client/vite.config.ts`。

## 2. 认证与权限
- 认证方案使用 Better Auth。
- 服务端主配置文件：`server/src/lib/auth.ts`。
- Better Auth 挂载路径：`server/src/index.ts` 中的 `/api/auth/*`。
- 前端认证客户端：`client/src/lib/auth-client.ts`，基于 `createAuthClient({ baseURL: apiBaseUrl })`。
- 受保护后端中间件：`server/src/middleware/require-auth.ts`。
- `req.user`、`req.session` 的 Express 类型扩展在 `server/src/types/express.d.ts`。
- 用户包含附加字段 `role`，可选值为 `admin` / `agent`，默认值为 `agent`。
- Better Auth 已禁用邮箱注册入口：`disabledPaths: ["/sign-up/email"]`，当前只支持已有账号登录。
- Better Auth 速率限制已显式配置为仅在生产环境开启：`server/src/lib/auth.ts` 中 `rateLimit.enabled = process.env.NODE_ENV === "production"`。

## 3. 路由与页面
- `/login`：公开登录页，文件在 `client/src/pages/LoginPages.tsx`。
- `/`：登录后可访问，路由保护组件为 `client/src/components/ProtectionRount.tsx`。
- `/users`：仅管理员可访问，页面文件为 `client/src/pages/UsersPage.tsx`。
- 管理员路由守卫：`client/src/components/AdminProtectionRoute.tsx`。
- 顶部布局组件：`client/src/components/Layout.tsx`。
- 导航中的“用户”链接只对管理员显示。

## 4. 当前页面状态
- 首页 `client/src/pages/Homepage.tsx` 已接入后端 `/api/health` 健康检查。
- `UsersPage` 当前是极简页面，只渲染 `Users` 标题，后续用户管理功能应在此页继续扩展。

## 5. 环境与本地默认数据
- 认证相关关键环境变量：`BETTER_AUTH_URL`、`BETTER_AUTH_SECRET`、`CLIENT_ORIGIN`、`DATABASE_URL`。
- `server/src/config.ts` 会把 `CLIENT_ORIGIN` 拆成 trusted origins，并额外放行本地 `localhost` / `127.0.0.1` 开发来源。
- 本地默认账号当前已确认：
- `admin@example.com` / `qwerdf66` / `admin`
- `agent@example.com` / `qwerdf66` / `agent`
- `server/.env` 与 `server/.env.example` 中的默认管理员密码已同步为 `qwerdf66`。

## 6. 常用命令
- 前端构建：在 `client` 下运行 `npm run build`。
- 前端组件/单元测试：在 `client` 下运行 `npm run test` 或 `npm run test:components`。
- 服务端生成 Better Auth schema：在 `server` 下运行 `npm run auth:generate`。
- Prisma Client 生成：在 `server` 下运行 `npm run prisma:generate`。
- Prisma Seed：在 `server` 下运行 `npm run prisma:seed`。
- 当前会话中，如需编写或更新 Playwright e2e 测试，优先复用最近创建的 Playwright 子代理 `Beauvoir`（agent id: `019d6d64-e30f-7de2-ae1d-d0a51e4c1f2e`）；若该子代理不可用，再参考 `.agents/skills/e2e-test-writer/SKILL.md`。
