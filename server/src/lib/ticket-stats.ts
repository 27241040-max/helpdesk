import type { TicketDashboardStats } from "core/email";

import { prisma } from "../prisma";

type TicketDashboardStatsRow = {
  aiResolvedPercentage: number;
  aiResolvedTickets: number;
  averageResolutionMs: number | null;
  openTickets: number;
  resolvedTickets: number;
  ticketVolumeByDay: TicketDashboardStats["ticketVolumeByDay"] | string;
  totalTickets: number;
};

function normalizeTicketVolumeByDay(
  value: TicketDashboardStatsRow["ticketVolumeByDay"],
): TicketDashboardStats["ticketVolumeByDay"] {
  if (typeof value === "string") {
    return JSON.parse(value) as TicketDashboardStats["ticketVolumeByDay"];
  }

  return value;
}

export async function getTicketDashboardStats(): Promise<TicketDashboardStats> {
  const [stats] = await prisma.$queryRaw<Array<TicketDashboardStatsRow>>`
    SELECT *
    FROM get_ticket_dashboard_stats()
  `;

  if (!stats) {
    return {
      aiResolvedPercentage: 0,
      aiResolvedTickets: 0,
      averageResolutionMs: null,
      openTickets: 0,
      resolvedTickets: 0,
      ticketVolumeByDay: [],
      totalTickets: 0,
    };
  }

  return {
    aiResolvedPercentage: stats.aiResolvedPercentage,
    aiResolvedTickets: stats.aiResolvedTickets,
    averageResolutionMs: stats.averageResolutionMs,
    openTickets: stats.openTickets,
    resolvedTickets: stats.resolvedTickets,
    ticketVolumeByDay: normalizeTicketVolumeByDay(stats.ticketVolumeByDay),
    totalTickets: stats.totalTickets,
  };
}
