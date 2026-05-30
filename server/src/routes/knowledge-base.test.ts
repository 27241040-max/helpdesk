import type { AddressInfo } from "node:net";

import express from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, rebuildKnowledgeBaseEntryChunksMock } = vi.hoisted(() => ({
  prismaMock: {
    knowledgeBaseEntry: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
  rebuildKnowledgeBaseEntryChunksMock: vi.fn(),
}));

vi.mock("../middleware/require-auth", () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = {
      banned: false,
      banExpires: null,
      banReason: null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      email: "admin@example.com",
      emailVerified: true,
      id: "admin-id",
      image: null,
      name: "Administrator",
      role: "admin",
      updatedAt: new Date("2026-04-17T00:00:00.000Z"),
    };
    next();
  },
}));

vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next();
  },
}));

vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../lib/ai/knowledge-base-retrieval", () => ({
  rebuildKnowledgeBaseEntryChunks: rebuildKnowledgeBaseEntryChunksMock,
}));

import { knowledgeBaseRouter } from "./knowledge-base";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/", knowledgeBaseRouter);
  return app;
}

async function requestJson(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
) {
  const server = createApp().listen(0);
  const { port } = server.address() as AddressInfo;

  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

const selectedEntry = {
  _count: {
    chunks: 2,
  },
  bodyText: "客户可以在订单详情中查询国际物流追踪编号和链接。",
  createdAt: new Date("2026-05-27T08:00:00.000Z"),
  id: 1,
  isEnabled: true,
  title: "国际物流追踪",
  updatedAt: new Date("2026-05-27T09:00:00.000Z"),
};

describe("knowledgeBaseRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rebuildKnowledgeBaseEntryChunksMock.mockResolvedValue(undefined);
  });

  test("lists knowledge base entries", async () => {
    prismaMock.knowledgeBaseEntry.findMany.mockResolvedValue([selectedEntry]);

    const response = await requestJson("GET", "/");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      entries: [
        {
          bodyText: "客户可以在订单详情中查询国际物流追踪编号和链接。",
          chunkCount: 2,
          createdAt: "2026-05-27T08:00:00.000Z",
          id: 1,
          isEnabled: true,
          title: "国际物流追踪",
          updatedAt: "2026-05-27T09:00:00.000Z",
        },
      ],
    });
  });

  test("creates an entry and rebuilds chunks", async () => {
    prismaMock.knowledgeBaseEntry.create.mockResolvedValue({
      bodyText: selectedEntry.bodyText,
      id: 1,
      title: selectedEntry.title,
    });
    prismaMock.knowledgeBaseEntry.findUniqueOrThrow.mockResolvedValue(selectedEntry);

    const response = await requestJson("POST", "/", {
      bodyText: selectedEntry.bodyText,
      isEnabled: true,
      title: selectedEntry.title,
    });

    expect(response.status).toBe(201);
    expect(rebuildKnowledgeBaseEntryChunksMock).toHaveBeenCalledWith({
      bodyText: selectedEntry.bodyText,
      id: 1,
      title: selectedEntry.title,
    });
  });

  test("rejects invalid create payloads", async () => {
    const response = await requestJson("POST", "/", {
      bodyText: "太短",
      isEnabled: true,
      title: "",
    });

    expect(response.status).toBe(400);
    expect(prismaMock.knowledgeBaseEntry.create).not.toHaveBeenCalled();
  });

  test("returns 404 when deleting a missing entry", async () => {
    prismaMock.knowledgeBaseEntry.findUnique.mockResolvedValue(null);

    const response = await requestJson("DELETE", "/999");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "知识库条目不存在。",
    });
  });
});
