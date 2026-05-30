import type { TicketDetail } from "core/email";
import { TicketCategory, TicketStatus } from "core/email";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { FormDetails } from "./FormDetails";

const ticketDetail: TicketDetail = {
  assignedUser: {
    email: "agent@example.com",
    id: "user_1",
    name: "Agent Smith",
  },
  bodyText: "Customer requested an update about the refund timeline.",
  category: TicketCategory.refundRequest,
  createdAt: "2026-04-14T08:00:00.000Z",
  customer: {
    email: "taylor@example.com",
    id: 1,
    name: "Taylor",
  },
  id: 7,
  agentRuns: [],
  replies: [
    {
      authorLabel: "Agent Smith",
      author: {
        email: "agent@example.com",
        id: "user_1",
        name: "Agent Smith",
      },
      bodyText: "We have reviewed your refund request and will follow up within one business day.",
      createdAt: "2026-04-14T10:00:00.000Z",
      id: 101,
      source: "agent",
      updatedAt: "2026-04-14T10:00:00.000Z",
    },
  ],
  source: "inbound_email",
  status: TicketStatus.open,
  subject: "Refund request follow-up",
  updatedAt: "2026-04-14T09:00:00.000Z",
};

describe("FormDetails", () => {
  test("renders ticket details, reply thread, and reply form", () => {
    render(
      <FormDetails
        data={ticketDetail}
        onPolish={vi.fn().mockResolvedValue({ bodyText: "Polished reply" })}
        onReplySubmit={vi.fn().mockResolvedValue(undefined)}
        onSummarize={vi.fn()}
        polishIsSubmitting={false}
        replyIsSubmitting={false}
        summary={null}
        summaryIsSubmitting={false}
      />,
    );

    expect(screen.getByText("Refund request follow-up")).toBeVisible();
    expect(screen.getByText("Taylor (taylor@example.com)")).toBeVisible();
    expect(screen.getByText("Customer requested an update about the refund timeline.")).toBeVisible();
    expect(screen.getByText("回复线程")).toBeVisible();
    expect(
      screen.getByText("We have reviewed your refund request and will follow up within one business day."),
    ).toBeVisible();
    expect(screen.getByText("添加回复")).toBeVisible();
    expect(screen.getByRole("button", { name: "生成摘要" })).toBeVisible();
    expect(screen.getByRole("button", { name: "润色" })).toBeVisible();
    expect(screen.getByRole("button", { name: "提交回复" })).toBeVisible();
  });

  test("passes polish and submit states and error messages to the reply form", () => {
    render(
      <FormDetails
        data={{ ...ticketDetail, replies: [] }}
        onPolish={vi.fn()}
        onReplySubmit={vi.fn()}
        onSummarize={vi.fn()}
        polishErrorMessage="润色回复失败，请稍后再试。"
        polishIsSubmitting
        replyErrorMessage="提交回复失败，请稍后再试。"
        replyIsSubmitting
        summary={null}
        summaryErrorMessage="生成摘要失败，请稍后再试。"
        summaryIsSubmitting
      />,
    );

    expect(screen.getByText("暂无回复")).toBeVisible();
    expect(screen.getByText("生成摘要失败，请稍后再试。")).toBeVisible();
    expect(screen.getByText("润色回复失败，请稍后再试。")).toBeVisible();
    expect(screen.getByText("提交回复失败，请稍后再试。")).toBeVisible();
    expect(screen.getByRole("button", { name: "正在生成摘要..." })).toBeDisabled();
    expect(screen.getByLabelText("回复内容")).toBeDisabled();
    expect(screen.getByRole("button", { name: "正在润色..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "提交中..." })).toBeDisabled();
  });

  test("submits replies through the nested reply form", async () => {
    const onReplySubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <FormDetails
        data={ticketDetail}
        onPolish={vi.fn().mockResolvedValue({ bodyText: "Polished reply" })}
        onReplySubmit={onReplySubmit}
        onSummarize={vi.fn()}
        polishIsSubmitting={false}
        replyIsSubmitting={false}
        summary={null}
        summaryIsSubmitting={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "Thanks for your patience. I have escalated this and will update you tomorrow." },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交回复" }));

    await waitFor(() => {
      expect(onReplySubmit).toHaveBeenCalledWith({
        bodyText: "Thanks for your patience. I have escalated this and will update you tomorrow.",
      });
    });
  });
});
