import type { AddressInfo } from "node:net";

import express from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, getRequiredEnvMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    account: {
      findFirst: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    ticket: {
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
  getRequiredEnvMock: vi.fn(() => "http://auth.example.com"),
}));

vi.mock("../auth", () => ({
  auth: {
    api: {
      createUser: vi.fn(),
    },
  },
}));

vi.mock("../config", () => ({
  getRequiredEnv: getRequiredEnvMock,
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

import { usersRouter } from "./users";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/", usersRouter);
  return app;
}

async function requestJson(
  method: "PATCH" | "DELETE",
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

describe("usersRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects edits to system reserved users", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "ai-agent-id",
      isSystemReserved: true,
    });

    const response = await requestJson("PATCH", "/ai-agent-id", {
      email: "ai-agent@system.local",
      name: "AI agent",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "系统保留账号不能被编辑。",
    });
  });

  test("rejects deletes for system reserved users", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      deletedAt: null,
      id: "ai-agent-id",
      isSystemReserved: true,
      role: "agent",
    });

    const response = await requestJson("DELETE", "/ai-agent-id");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "系统保留账号不能被删除。",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
