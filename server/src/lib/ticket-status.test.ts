import { describe, expect, test } from "vitest";

import { TicketStatus } from "../generated/prisma";
import { getResolvedAtForStatusTransition } from "./ticket-status";

describe("getResolvedAtForStatusTransition", () => {
  test("sets resolvedAt when moving from an unresolved status to a resolved status", () => {
    const now = new Date("2026-04-17T08:00:00.000Z");

    expect(
      getResolvedAtForStatusTransition(TicketStatus.open, TicketStatus.resolved, null, now),
    ).toEqual(now);
  });

  test("clears resolvedAt when reopening a resolved ticket", () => {
    expect(
      getResolvedAtForStatusTransition(
        TicketStatus.closed,
        TicketStatus.open,
        new Date("2026-04-16T08:00:00.000Z"),
      ),
    ).toBeNull();
  });

  test("preserves resolvedAt when switching between resolved and closed", () => {
    const resolvedAt = new Date("2026-04-16T08:00:00.000Z");

    expect(
      getResolvedAtForStatusTransition(TicketStatus.resolved, TicketStatus.closed, resolvedAt),
    ).toEqual(resolvedAt);
  });
});
