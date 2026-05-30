import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock, classifyTicketMock } = vi.hoisted(() => ({
  prismaMock: {
    agentRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    agentStep: {
      create: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  classifyTicketMock: vi.fn(),
}));

vi.mock("../../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("./classify-ticket", () => ({
  classifyTicket: classifyTicketMock,
}));

import { TicketCategory, TicketStatus } from "../../generated/prisma";
import { processTicketAutoClassification } from "./process-ticket-auto-classification";

const uncategorizedTicket = {
  bodyText: "应用一直报错，上传按钮点了没有反应。",
  category: null,
  customer: {
    email: "customer@example.com",
    id: 1,
    name: "Customer",
  },
  id: 7,
  subject: "Upload failed",
};

describe("processTicketAutoClassification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.agentRun.create.mockResolvedValue({ id: "run-1" });
    prismaMock.agentRun.update.mockResolvedValue({ id: "run-1" });
    prismaMock.agentStep.create.mockResolvedValue({ id: "step-1" });
  });

  test("classifies uncategorized tickets and persists the result", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(uncategorizedTicket);
    classifyTicketMock.mockResolvedValue(TicketCategory.technical);
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    await processTicketAutoClassification(7);

    expect(classifyTicketMock).toHaveBeenCalledWith(uncategorizedTicket);
    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        category: null,
      },
      data: {
        category: TicketCategory.technical,
      },
    });
    expect(prismaMock.agentStep.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentName: "TriageAgent",
        outputSummary: "工单已分类为 technical。",
        runId: "run-1",
        status: "completed",
        stepName: "classify_ticket",
      }),
    });
    expect(prismaMock.agentRun.update).toHaveBeenCalledWith({
      where: {
        id: "run-1",
      },
      data: expect.objectContaining({
        outcome: "classified:technical",
        status: "completed",
      }),
    });
  });

  test("skips tickets that are already categorized", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      ...uncategorizedTicket,
      category: TicketCategory.general,
    });

    await processTicketAutoClassification(7);

    expect(classifyTicketMock).not.toHaveBeenCalled();
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });

  test("marks the ticket open when classification throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.ticket.findUnique.mockResolvedValue(uncategorizedTicket);
    classifyTicketMock.mockRejectedValue(new Error("generateText failed"));
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    await processTicketAutoClassification(7);

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: TicketStatus.new,
      },
      data: {
        status: TicketStatus.open,
      },
    });
    expect(prismaMock.agentStep.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentName: "TriageAgent",
        status: "failed",
        stepName: "classify_ticket",
      }),
    });

    errorSpy.mockRestore();
  });
});
