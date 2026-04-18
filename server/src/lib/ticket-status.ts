import { TicketStatus } from "../generated/prisma";

export function isOpenTicketStatus(status: TicketStatus) {
  return (
    status === TicketStatus.new ||
    status === TicketStatus.processing ||
    status === TicketStatus.open
  );
}

export function isResolvedTicketStatus(status: TicketStatus) {
  return status === TicketStatus.resolved || status === TicketStatus.closed;
}

export function getResolvedAtForStatusTransition(
  currentStatus: TicketStatus,
  nextStatus: TicketStatus,
  currentResolvedAt: Date | null,
  now = new Date(),
) {
  if (!isResolvedTicketStatus(currentStatus) && isResolvedTicketStatus(nextStatus)) {
    return now;
  }

  if (isResolvedTicketStatus(currentStatus) && !isResolvedTicketStatus(nextStatus)) {
    return null;
  }

  return currentResolvedAt;
}
