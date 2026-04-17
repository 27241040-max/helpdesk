import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { classifyTicketMock, prismaMock } = vi.hoisted(() => ({
  classifyTicketMock: vi.fn(),
  prismaMock: {
    ticket: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("./classify-ticket", () => ({
  classifyTicket: classifyTicketMock,
}));

import { TicketCategory } from "../../generated/prisma";
import { runTicketAutoClassification, scheduleTicketAutoClassification } from "./ticket-auto-classification";

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

describe("ticket auto classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("classifies uncategorized tickets and persists the result", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(uncategorizedTicket);
    classifyTicketMock.mockResolvedValue(TicketCategory.technical);
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    await runTicketAutoClassification(7);

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
  });

  test("skips tickets that are already categorized", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      ...uncategorizedTicket,
      category: TicketCategory.general,
    });

    await runTicketAutoClassification(7);

    expect(classifyTicketMock).not.toHaveBeenCalled();
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });

  test("schedules classification asynchronously", async () => {
    vi.useFakeTimers();
    prismaMock.ticket.findUnique.mockResolvedValue(uncategorizedTicket);
    classifyTicketMock.mockResolvedValue(TicketCategory.technical);
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    scheduleTicketAutoClassification(7);

    expect(classifyTicketMock).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(classifyTicketMock).toHaveBeenCalledWith(uncategorizedTicket);
  });
});
