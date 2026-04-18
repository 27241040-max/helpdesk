import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../prisma", () => ({
  prisma: prismaMock,
}));

import { getTicketDashboardStats } from "./ticket-stats";

describe("getTicketDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns dashboard counts, percentage, and average resolution time", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        aiResolvedPercentage: 40,
        aiResolvedTickets: 4,
        averageResolutionMs: 7_200_000,
        openTickets: 8,
        resolvedTickets: 10,
        ticketVolumeByDay: [
          { date: "2026-03-19", totalTickets: 1 },
          { date: "2026-03-20", totalTickets: 3 },
        ],
        totalTickets: 42,
      },
    ]);

    await expect(getTicketDashboardStats()).resolves.toEqual({
      aiResolvedPercentage: 40,
      aiResolvedTickets: 4,
      averageResolutionMs: 7_200_000,
      openTickets: 8,
      resolvedTickets: 10,
      ticketVolumeByDay: [
        { date: "2026-03-19", totalTickets: 1 },
        { date: "2026-03-20", totalTickets: 3 },
      ],
      totalTickets: 42,
    });
  });

  test("returns zero percentage when there are no resolved tickets", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        aiResolvedPercentage: 0,
        aiResolvedTickets: 0,
        averageResolutionMs: null,
        openTickets: 2,
        resolvedTickets: 0,
        ticketVolumeByDay: [{ date: "2026-03-19", totalTickets: 0 }],
        totalTickets: 5,
      },
    ]);

    await expect(getTicketDashboardStats()).resolves.toEqual({
      aiResolvedPercentage: 0,
      aiResolvedTickets: 0,
      averageResolutionMs: null,
      openTickets: 2,
      resolvedTickets: 0,
      ticketVolumeByDay: [
        { date: "2026-03-19", totalTickets: 0 },
      ],
      totalTickets: 5,
    });
  });

  test("parses JSON strings returned by the database adapter", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        aiResolvedPercentage: 25,
        aiResolvedTickets: 1,
        averageResolutionMs: 3_600_000,
        openTickets: 3,
        resolvedTickets: 4,
        ticketVolumeByDay: JSON.stringify([{ date: "2026-03-19", totalTickets: 2 }]),
        totalTickets: 7,
      },
    ]);

    await expect(getTicketDashboardStats()).resolves.toEqual({
      aiResolvedPercentage: 25,
      aiResolvedTickets: 1,
      averageResolutionMs: 3_600_000,
      openTickets: 3,
      resolvedTickets: 4,
      ticketVolumeByDay: [{ date: "2026-03-19", totalTickets: 2 }],
      totalTickets: 7,
    });
  });
});
