import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { TicketReplyForm } from "./TicketReplyForm";

describe("TicketReplyForm", () => {
  test("submits trimmed reply text and clears the form on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onPolish = vi.fn().mockResolvedValue({
      bodyText: "Polished reply",
    });

    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "  Looking into this now. I will update you shortly.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交回复" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        bodyText: "Looking into this now. I will update you shortly.",
      });
    });
    expect(screen.getByLabelText("回复内容")).toHaveValue("");
  });

  test("disables submit when reply is empty", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onPolish = vi.fn().mockResolvedValue({
      bodyText: "Polished reply",
    });

    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "   " },
    });

    expect(screen.getByRole("button", { name: "提交回复" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("renders server error and keeps input when submit fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    const onPolish = vi.fn().mockResolvedValue({
      bodyText: "Polished reply",
    });

    const { rerender } = render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "Still investigating the issue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交回复" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        bodyText: "Still investigating the issue.",
      });
    });

    rerender(
      <TicketReplyForm
        errorMessage="提交回复失败，请稍后再试。"
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    expect(await screen.findByText("提交回复失败，请稍后再试。")).toBeVisible();
    expect(screen.getByLabelText("回复内容")).toHaveValue("Still investigating the issue.");
  });

  test("polishes the draft and replaces the textarea value", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onPolish = vi.fn().mockResolvedValue({
      bodyText: "Thank you for your patience. I am reviewing this now and will update you shortly.",
    });

    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "looking into this now" },
    });
    fireEvent.click(screen.getByRole("button", { name: "润色" }));

    await waitFor(() => {
      expect(onPolish).toHaveBeenCalledWith({
        bodyText: "looking into this now",
      });
    });
    expect(screen.getByLabelText("回复内容")).toHaveValue(
      "Thank you for your patience. I am reviewing this now and will update you shortly.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("blocks empty polish requests with client-side validation", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onPolish = vi.fn().mockResolvedValue({
      bodyText: "Polished reply",
    });

    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("button", { name: "润色" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "   " },
    });

    expect(screen.getByRole("button", { name: "润色" })).toBeDisabled();
    expect(onPolish).not.toHaveBeenCalled();
  });

  test("renders polish error and keeps input when polish fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onPolish = vi.fn().mockRejectedValue(new Error("boom"));

    const { rerender } = render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "Still investigating the issue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "润色" }));

    await waitFor(() => {
      expect(onPolish).toHaveBeenCalledWith({
        bodyText: "Still investigating the issue.",
      });
    });

    rerender(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={onPolish}
        onSubmit={onSubmit}
        polishErrorMessage="润色回复失败，请稍后再试。"
      />,
    );

    expect(await screen.findByText("润色回复失败，请稍后再试。")).toBeVisible();
    expect(screen.getByLabelText("回复内容")).toHaveValue("Still investigating the issue.");
  });

  test("disables the textarea and buttons while submitting", () => {
    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting
        onPolish={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("回复内容")).toBeDisabled();
    expect(screen.getByRole("button", { name: "润色" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "提交中..." })).toBeDisabled();
  });

  test("shows polishing state without affecting submit label", () => {
    render(
      <TicketReplyForm
        isPolishing
        isSubmitting={false}
        onPolish={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("回复内容")).toBeDisabled();
    expect(screen.getByRole("button", { name: "正在润色..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "提交回复" })).toBeDisabled();
  });

  test("keeps submit disabled until reply has non-whitespace content", () => {
    render(
      <TicketReplyForm
        isPolishing={false}
        isSubmitting={false}
        onPolish={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "提交回复" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "提交回复" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("回复内容"), {
      target: { value: "已收到，我会继续跟进。" },
    });
    expect(screen.getByRole("button", { name: "提交回复" })).toBeEnabled();
  });
});
