import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  prismaMock,
  formatKnowledgeBaseSourcesAsMarkdownMock,
  retrieveKnowledgeBaseSourcesMock,
  resolveTicketWithKnowledgeBaseMock,
  getAiAgentUserOrThrowMock,
  sendTicketReplyEmailMock,
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
    formatKnowledgeBaseSourcesAsMarkdownMock: vi.fn(() => "# kb"),
    retrieveKnowledgeBaseSourcesMock: vi.fn(),
    resolveTicketWithKnowledgeBaseMock: vi.fn(),
    getAiAgentUserOrThrowMock: vi.fn(),
    sendTicketReplyEmailMock: vi.fn(),
  };
});

vi.mock("../../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("./resolve-ticket-with-knowledge-base", () => ({
  resolveTicketWithKnowledgeBase: resolveTicketWithKnowledgeBaseMock,
}));

vi.mock("./knowledge-base-retrieval", () => ({
  formatKnowledgeBaseSourcesAsMarkdown: formatKnowledgeBaseSourcesAsMarkdownMock,
  retrieveKnowledgeBaseSources: retrieveKnowledgeBaseSourcesMock,
}));

vi.mock("../ai-agent", () => ({
  getAiAgentUserOrThrow: getAiAgentUserOrThrowMock,
}));

vi.mock("../ticket-email", () => ({
  sendTicketReplyEmail: sendTicketReplyEmailMock,
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
  externalMessageId: "<ticket-7@example.com>",
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
    retrieveKnowledgeBaseSourcesMock.mockResolvedValue([
      {
        content: "invoice knowledge",
        distance: 0.12,
        entryId: 1,
        title: "Invoice",
      },
    ]);
    sendTicketReplyEmailMock.mockResolvedValue(undefined);
  });

  test("resolves a ticket when the knowledge base can answer it", async () => {
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
    expect(retrieveKnowledgeBaseSourcesMock).toHaveBeenCalledWith(
      "工单主题: Invoice download question\n\n客户消息:\n我想知道如何下载之前订单的发票。",
    );
    expect(formatKnowledgeBaseSourcesAsMarkdownMock).toHaveBeenCalledWith([
      {
        content: "invoice knowledge",
        distance: 0.12,
        entryId: 1,
        title: "Invoice",
      },
    ]);
    expect(resolveTicketWithKnowledgeBaseMock).toHaveBeenCalledWith(processingTicket, "# kb");
    expect(sendTicketReplyEmailMock).toHaveBeenCalledWith({
      bodyText: "请登录账户后前往订单详情页面下载发票。",
      customer: processingTicket.customer,
      externalMessageId: "<ticket-7@example.com>",
      subject: "Invoice download question",
    });
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
    expect(sendTicketReplyEmailMock).not.toHaveBeenCalled();
  });

  test("falls back to open when knowledge base auto reply fails", async () => {
    retrieveKnowledgeBaseSourcesMock.mockRejectedValue(new Error("missing kb"));

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
    expect(sendTicketReplyEmailMock).not.toHaveBeenCalled();
  });

  test("keeps a manual assignee when the ticket cannot be auto-resolved", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      ...processingTicket,
      assignedUserId: "manual-agent-id",
    });
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
    expect(sendTicketReplyEmailMock).not.toHaveBeenCalled();
  });

  test("keeps a ticket open when no knowledge base chunks are relevant", async () => {
    retrieveKnowledgeBaseSourcesMock.mockResolvedValue([]);

    await processTicketAutoReply(7);

    expect(resolveTicketWithKnowledgeBaseMock).not.toHaveBeenCalled();
    expect(sendTicketReplyEmailMock).not.toHaveBeenCalled();
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
  });

  test("skips processing when the ticket is no longer new", async () => {
    prismaMock.ticket.updateMany.mockResolvedValueOnce({ count: 0 });

    await processTicketAutoReply(7);

    expect(prismaMock.ticket.findUnique).not.toHaveBeenCalled();
    expect(resolveTicketWithKnowledgeBaseMock).not.toHaveBeenCalled();
  });

  test("falls back to open when outbound delivery fails", async () => {
    resolveTicketWithKnowledgeBaseMock.mockResolvedValue({
      category: "general",
      replyBodyText: "请登录账户后前往订单详情页面下载发票。",
      shouldResolve: true,
    });
    sendTicketReplyEmailMock.mockRejectedValueOnce(new Error("send failed"));

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
});
