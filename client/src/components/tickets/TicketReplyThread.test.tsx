import type { TicketReply } from "core/email";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TicketReplyThread } from "./TicketReplyThread";

const replies: TicketReply[] = [
  {
    authorLabel: "Agent Smith",
    author: {
      email: "agent@example.com",
      id: "user_1",
      name: "Agent Smith",
    },
    bodyText:
      "We have reviewed your request and will send a follow-up shortly.",
    createdAt: "2026-04-14T10:00:00.000Z",
    id: 101,
    source: "agent",
    updatedAt: "2026-04-14T10:00:00.000Z",
  },
  {
    authorLabel: "Taylor Agent",
    author: {
      email: "taylor.agent@example.com",
      id: "user_2",
      name: "Taylor Agent",
    },
    bodyText: "The issue has been escalated to our billing team.",
    createdAt: "2026-04-14T11:30:00.000Z",
    id: 102,
    source: "agent",
    updatedAt: "2026-04-14T11:30:00.000Z",
  },
];

describe("TicketReplyThread", () => {
  test("renders empty state when there are no replies", () => {
    render(<TicketReplyThread replies={[]} />);

    expect(screen.getByText("回复线程")).toBeVisible();
    expect(screen.getByText("按时间顺序显示客服与系统回复。")).toBeVisible();
    expect(screen.getByText("暂无回复")).toBeVisible();
  });

  test("renders reply history entries", () => {
    render(<TicketReplyThread replies={replies} />);

    expect(screen.getByText("Agent Smith")).toBeVisible();
    expect(screen.getByText("agent@example.com")).toBeVisible();
    expect(screen.getByText("Taylor Agent")).toBeVisible();
    expect(screen.getByText("taylor.agent@example.com")).toBeVisible();
    expect(
      screen.getByText(
        "We have reviewed your request and will send a follow-up shortly.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("The issue has been escalated to our billing team."),
    ).toBeVisible();
  });

  test("preserves line breaks in reply body text", () => {
    const multilineReply: TicketReply = {
      authorLabel: "Agent Smith",
      author: {
        email: "agent@example.com",
        id: "user_1",
        name: "Agent Smith",
      },
      bodyText: "Line one\nLine two",
      createdAt: "2026-04-14T12:00:00.000Z",
      id: 103,
      source: "agent",
      updatedAt: "2026-04-14T12:00:00.000Z",
    };

    render(<TicketReplyThread replies={[multilineReply]} />);

    const multilineBody = screen.getByText(
      (_, node) => node?.textContent === "Line one\nLine two",
    );

    expect(multilineBody).toHaveClass("whitespace-pre-wrap");
  });
});
