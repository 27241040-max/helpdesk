import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CreateUserDialog } from "./CreateUserDialog";

describe("CreateUserDialog", () => {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderDialog(overrides?: Partial<ComponentProps<typeof CreateUserDialog>>) {
    return render(
      <CreateUserDialog
        isOpen
        isSubmitting={false}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        {...overrides}
      />,
    );
  }

  test("renders all form fields when open", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();
    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("电子邮件")).toBeVisible();
    expect(screen.getByLabelText("密码")).toBeVisible();
    expect(screen.getByRole("button", { name: "创建用户" })).toBeVisible();
  });

  test("shows validation messages for invalid input", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "ab" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), { target: { value: "bad-email" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "1234567" } });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    await screen.findByText("名称至少包含 3 个字符");
    expect(screen.getByText("请输入有效的邮箱地址")).toBeVisible();
    expect(screen.getByText("密码至少应为 8 个字符")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits valid form values", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Created User" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), {
      target: { value: "created@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: "Created User",
      email: "created@example.com",
      password: "password123",
    });
  });

  test("calls onOpenChange(false) when cancel is clicked", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("renders server error message when provided", () => {
    renderDialog({ errorMessage: "该邮箱已存在。" });

    expect(screen.getByText("创建失败")).toBeVisible();
    expect(screen.getByText("该邮箱已存在。")).toBeVisible();
  });
});
