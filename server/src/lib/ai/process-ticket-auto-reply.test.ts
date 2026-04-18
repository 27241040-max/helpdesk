import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  prismaMock,
  readKnowledgeBaseMarkdownMock,
  resolveTicketWithKnowledgeBaseMock,
  getAiAgentUserOrThrowMock,
} = vi.hoisted(() => {
  const tx = {
    ticket: {
      updateMany: vi.fn(),
    },
    ticketReply: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  return {
    prismaMock: {
      ticket: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx)),
      __tx: tx,
    },
    readKnowledgeBaseMarkdownMock: vi.fn(),
    resolveTicketWithKnowledgeBaseMock: vi.fn(),
    getAiAgentUserOrThrowMock: vi.fn(),
  };
});

vi.mock("../../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("./resolve-ticket-with-knowledge-base", () => ({
  readKnowledgeBaseMarkdown: readKnowledgeBaseMarkdownMock,
  resolveTicketWithKnowledgeBase: resolveTicketWithKnowledgeBaseMock,
}));

vi.mock("../ai-agent", () => ({
  getAiAgentUserOrThrow: getAiAgentUserOrThrowMock,
}));

import { TicketReplySource, TicketStatus } from "../../generated/prisma";
import { processTicketAutoReply } from "./process-ticket-auto-reply";

const processingTicket = {
  assignedUserId: "ai-agent-id",
  bodyText: "我想知道如何下载之前订单的发票。",
  category: null,
  customer: {
    email: "customer@example.com",
    id: 1,
    name: "Customer",
  },
  id: 7,
  status: TicketStatus.processing,
  subject: "Invoice download question",
};

describe("processTicketAutoReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAiAgentUserOrThrowMock.mockResolvedValue({
      email: "ai-agent@system.local",
      id: "ai-agent-id",
      name: "AI agent",
    });
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticket.findUnique.mockResolvedValue(processingTicket);
    prismaMock.__tx.ticket.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.__tx.ticketReply.findFirst.mockResolvedValue(null);
    prismaMock.__tx.ticketReply.create.mockResolvedValue({ id: 1 });
  });

  test("resolves a ticket when the knowledge base can answer it", async () => {
    readKnowledgeBaseMarkdownMock.mockResolvedValue("# kb");
    resolveTicketWithKnowledgeBaseMock.mockResolvedValue({
      category: "general",
      replyBodyText: "请登录账户后前往订单详情页面下载发票。",
      shouldResolve: true,
    });

    await processTicketAutoReply(7);

    expect(prismaMock.ticket.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 7,
        status: TicketStatus.new,
      },
      data: {
        status: TicketStatus.processing,
      },
    });
    expect(resolveTicketWithKnowledgeBaseMock).toHaveBeenCalledWith(processingTicket, "# kb");
    expect(prismaMock.__tx.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: TicketStatus.processing,
      },
      data: {
        resolvedAt: expect.any(Date),
        status: TicketStatus.resolved,
      },
    });
    expect(prismaMock.__tx.ticketReply.create).toHaveBeenCalledWith({
      data: {
        ticketId: 7,
        authorLabel: "AI Assistant",
        authorUserId: null,
        bodyText: "请登录账户后前往订单详情页面下载发票。",
        source: TicketReplySource.ai_auto_resolution,
      },
    });
  });

  test("keeps a ticket open when the knowledge base cannot answer it", async () => {
    readKnowledgeBaseMarkdownMock.mockResolvedValue("# kb");
    resolveTicketWithKnowledgeBaseMock.mockResolvedValue({
      category: "technical",
      replyBodyText: null,
      shouldResolve: false,
    });

    await processTicketAutoReply(7);

    expect(prismaMock.__tx.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        assignedUserId: "ai-agent-id",
        id: 7,
        status: TicketStatus.processing,
      },
      data: {
        assignedUserId: null,
        status: TicketStatus.open,
      },
    });
    expect(prismaMock.__tx.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        assignedUserId: {
          not: "ai-agent-id",
        },
        id: 7,
        status: TicketStatus.processing,
      },
      data: {
        status: TicketStatus.open,
      },
    });
    expect(prismaMock.__tx.ticketReply.create).not.toHaveBeenCalled();
  });

  test("falls back to open when knowledge base auto reply fails", async () => {
    readKnowledgeBaseMarkdownMock.mockRejectedValue(new Error("missing kb"));

    await processTicketAutoReply(7);

    expect(prismaMock.__tx.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        assignedUserId: "ai-agent-id",
        id: 7,
        status: TicketStatus.processing,
      },
      data: {
        assignedUserId: null,
        status: TicketStatus.open,
      },
    });
    expect(prismaMock.__tx.ticketReply.create).not.toHaveBeenCalled();
  });

  test("keeps a manual assignee when the ticket cannot be auto-resolved", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      ...processingTicket,
      assignedUserId: "manual-agent-id",
    });
    readKnowledgeBaseMarkdownMock.mockResolvedValue("# kb");
    resolveTicketWithKnowledgeBaseMock.mockResolvedValue({
      category: "technical",
      replyBodyText: null,
      shouldResolve: false,
    });

    await processTicketAutoReply(7);

    expect(prismaMock.__tx.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        assignedUserId: {
          not: "ai-agent-id",
        },
        id: 7,
        status: TicketStatus.processing,
      },
      data: {
        status: TicketStatus.open,
      },
    });
  });

  test("skips processing when the ticket is no longer new", async () => {
    prismaMock.ticket.updateMany.mockResolvedValueOnce({ count: 0 });

    await processTicketAutoReply(7);

    expect(prismaMock.ticket.findUnique).not.toHaveBeenCalled();
    expect(resolveTicketWithKnowledgeBaseMock).not.toHaveBeenCalled();
  });
});
