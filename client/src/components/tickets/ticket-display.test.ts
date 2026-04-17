import { TicketCategory } from "core/email";
import { afterEach, describe, expect, test, vi } from "vitest";

import { shouldPollForTicketAutoClassification } from "./ticket-display";

describe("shouldPollForTicketAutoClassification", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns true for recent uncategorized tickets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T10:00:30.000Z"));

    expect(
      shouldPollForTicketAutoClassification({
        category: null,
        createdAt: "2026-04-14T10:00:00.000Z",
      }),
    ).toBe(true);
  });

  test("returns false for categorized tickets or stale uncategorized tickets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T10:02:30.000Z"));

    expect(
      shouldPollForTicketAutoClassification({
        category: TicketCategory.technical,
        createdAt: "2026-04-14T10:02:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldPollForTicketAutoClassification({
        category: null,
        createdAt: "2026-04-14T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});
