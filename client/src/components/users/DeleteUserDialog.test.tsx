import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DeleteUserDialog } from "./DeleteUserDialog";

describe("DeleteUserDialog", () => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders confirmation copy", () => {
    render(
      <DeleteUserDialog
        isOpen
        isSubmitting={false}
        name="Agent User"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "确认删除用户" })).toBeVisible();
    expect(screen.getByText("Agent User")).toBeVisible();
    expect(screen.getByText(/已分配给该用户的工单会自动变为未指派/)).toBeVisible();
    expect(screen.getByRole("button", { name: "确认删除" })).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeVisible();
  });

  test("calls onConfirm when confirm is clicked", () => {
    render(
      <DeleteUserDialog
        isOpen
        isSubmitting={false}
        name="Agent User"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("calls onOpenChange(false) when cancel is clicked", () => {
    render(
      <DeleteUserDialog
        isOpen
        isSubmitting={false}
        name="Agent User"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("renders server error when provided", () => {
    render(
      <DeleteUserDialog
        error="删除失败。"
        isOpen
        isSubmitting={false}
        name="Agent User"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByText("删除失败")).toBeVisible();
    expect(screen.getByText("删除失败。")).toBeVisible();
  });
});
