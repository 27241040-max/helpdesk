import type { AddressInfo } from "node:net";

import express from "express";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  prismaMock,
  getOptionalEnvMock,
  queueTicketAutoClassificationMock,
  getAiAgentUserOrThrowMock,
} = vi.hoisted(() => ({
  prismaMock: {
    customer: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  getOptionalEnvMock: vi.fn(() => "test-secret"),
  queueTicketAutoClassificationMock: vi.fn(),
  getAiAgentUserOrThrowMock: vi.fn(),
}));

vi.mock("../config", () => ({
  getOptionalEnv: getOptionalEnvMock,
}));

vi.mock("../jobs/boss", () => ({
  queueTicketAutoClassification: queueTicketAutoClassificationMock,
}));

vi.mock("../lib/ai-agent", () => ({
  getAiAgentUserOrThrow: getAiAgentUserOrThrowMock,
}));

vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

import { inboundEmailRouter } from "./inbound-email";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/", inboundEmailRouter);
  return app;
}

async function postInboundEmail(body: Record<string, unknown>) {
  const server = createApp().listen(0);
  const { port } = server.address() as AddressInfo;

  try {
    return await fetch(`http://127.0.0.1:${port}/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-email-secret": "test-secret",
      },
      body: JSON.stringify(body),
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

describe("inboundEmailRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.ticket.findUnique.mockResolvedValue(null);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({
      email: "customer@example.com",
      id: 5,
      name: "Customer",
    });
    prismaMock.ticket.create.mockResolvedValue({
      category: "general",
      id: 11,
    });
    getAiAgentUserOrThrowMock.mockResolvedValue({
      email: "ai-agent@system.local",
      id: "ai-agent-id",
      name: "AI agent",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("assigns new inbound tickets to the AI agent before queueing automation", async () => {
    const response = await postInboundEmail({
      category: "general",
      from: {
        email: "customer@example.com",
        name: "Customer",
      },
      messageId: "message-1",
      subject: "Need help",
      text: "Please help",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      created: true,
      ticketId: 11,
    });
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: {
        assignedUserId: "ai-agent-id",
        bodyText: "Please help",
        category: "general",
        customerId: 5,
        externalMessageId: "message-1",
        source: "email",
        status: "new",
        subject: "Need help",
      },
      select: {
        category: true,
        id: true,
      },
    });
    expect(queueTicketAutoClassificationMock).toHaveBeenCalledWith(11);
  });
});
