# 仓库指令

## 前端数据请求约定

- 前端 HTTP 请求优先使用 `axios`。
- React 组件中的服务端状态管理优先使用 `@tanstack/react-query`。
- 除非有明确理由，否则不要继续新增裸 `fetch` 调用，也不要为常规数据加载手写 `useEffect + useState` 请求流程。

## 前端测试约定

- 编写组件或单元测试时，优先使用 `Vitest + React Testing Library`。
- 组件测试应尽量从用户可见行为出发，优先使用 `screen` 查询和 `jest-dom` 断言，而不是测试实现细节。
- 涉及 React Query 的组件测试，优先复用 `client/src/test/render-with-query.tsx` 中的 `renderWithQuery`。
- 完成前端组件或单元测试后，至少执行一次 `cd client && npm run test:components`；如改动影响构建或类型，也应执行 `cd client && npm run build`。
