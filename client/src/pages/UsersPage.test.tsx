import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { UsersPage } from "./UsersPage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders loading skeleton before data resolves", () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => undefined));

    renderWithQuery(<UsersPage />);

    expect(screen.getByText("用户列表")).toBeVisible();
    expect(screen.getByText("当前共 0 个用户")).toBeVisible();
    expect(screen.getByRole("button", { name: "创建用户" })).toBeVisible();
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
  });

  test("renders an error state when the request fails", async () => {
    mockedApiClient.get.mockRejectedValue(new Error("boom"));

    renderWithQuery(<UsersPage />);

    await screen.findByText("用户列表加载失败，请稍后再试。");
    expect(screen.getByText("用户列表加载失败，请稍后再试。")).toBeVisible();
  });

  test("renders an empty state when there are no users", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");
    expect(screen.getByText("当前共 0 个用户")).toBeVisible();
  });

  test("renders users from the API response", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Administrator",
            email: "admin@example.com",
            role: "admin",
            emailVerified: true,
            createdAt: "2026-04-08T10:00:00.000Z",
            updatedAt: "2026-04-08T12:00:00.000Z",
          },
          {
            id: "2",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Administrator");

    expect(screen.getByText("当前共 2 个用户")).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("agent@example.com")).toBeVisible();
    expect(screen.getByText("admin")).toBeVisible();
    expect(screen.getByText("agent")).toBeVisible();
    expect(screen.getAllByRole("button", { name: /编辑用户/i })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "删除用户 Administrator" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "删除用户 Agent User" })).toBeEnabled();
    expect(screen.getByText("已验证")).toBeVisible();
    expect(screen.getByText("未验证")).toBeVisible();

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/users");
    });
  });

  test("hides system reserved users from the users list", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "ai-agent-id",
            name: "AI agent",
            email: "ai-agent@system.local",
            role: "agent",
            isSystemReserved: true,
            emailVerified: true,
            createdAt: "2026-04-08T10:00:00.000Z",
            updatedAt: "2026-04-08T12:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");
    expect(screen.getByText("当前共 0 个用户")).toBeVisible();
    expect(screen.queryByText("AI agent")).not.toBeInTheDocument();
  });

  test("shows the create user dialog when the button is clicked", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");
    expect(screen.queryByRole("heading", { name: "创建新用户" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();
  });

  test("shows and hides the delete dialog", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "2",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "删除用户 Agent User" }));
    expect(screen.getByRole("heading", { name: "确认删除用户" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "确认删除用户" })).not.toBeInTheDocument();
    });
  });

  test("hides the create user dialog when clicking outside or the close button", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();

    if (!overlay) {
      throw new Error("Dialog overlay not found");
    }

    fireEvent.pointerDown(overlay);
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "创建新用户" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "创建新用户" })).not.toBeInTheDocument();
    });
  });

  test("opens the edit dialog with prefilled user data", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "1",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "编辑用户 Agent User" }));

    expect(screen.getByRole("heading", { name: "编辑用户" })).toBeVisible();
    expect(screen.getByDisplayValue("Agent User")).toBeVisible();
    expect(screen.getByDisplayValue("agent@example.com")).toBeVisible();
    expect(screen.getByLabelText("密码")).toHaveValue("");
    expect(screen.getByText("留空则不修改密码")).toBeVisible();
  });

  test("opens the create user dialog and validates the form", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [],
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();
    expect(screen.getByLabelText("姓名")).toBeVisible();
    expect(screen.getByLabelText("电子邮件")).toBeVisible();
    expect(screen.getByLabelText("密码")).toBeVisible();

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "ab" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "1234567" } });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    await screen.findByText("名称至少包含 3 个字符");
    expect(screen.getByText("请输入有效的邮箱地址")).toBeVisible();
    expect(screen.getByText("密码至少应为 8 个字符")).toBeVisible();
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  test("creates a user, refreshes the table, and closes the dialog", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          users: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "10",
              name: "Created User",
              email: "created@example.com",
              role: "agent",
              emailVerified: false,
              createdAt: "2026-04-09T10:00:00.000Z",
              updatedAt: "2026-04-09T10:00:00.000Z",
            },
          ],
        },
      });
    mockedApiClient.post.mockResolvedValue({
      data: {
        user: {
          id: "10",
          name: "Created User",
          email: "created@example.com",
          role: "agent",
          emailVerified: false,
          createdAt: "2026-04-09T10:00:00.000Z",
          updatedAt: "2026-04-09T10:00:00.000Z",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Created User" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), {
      target: { value: "created@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith("/api/users", {
        name: "Created User",
        email: "created@example.com",
        password: "password123",
      });
    });

    await screen.findByText("Created User");
    expect(screen.getByText("当前共 1 个用户")).toBeVisible();
    expect(screen.getByText("created@example.com")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "创建新用户" })).not.toBeInTheDocument();
  });

  test("updates a user, refreshes the table, and omits password when left blank", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "2",
              name: "Agent User",
              email: "agent@example.com",
              role: "agent",
              emailVerified: false,
              createdAt: "2026-04-07T10:00:00.000Z",
              updatedAt: "2026-04-07T12:00:00.000Z",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "2",
              name: "Updated Agent",
              email: "updated.agent@example.com",
              role: "agent",
              emailVerified: false,
              createdAt: "2026-04-07T10:00:00.000Z",
              updatedAt: "2026-04-09T12:00:00.000Z",
            },
          ],
        },
      });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        user: {
          id: "2",
          name: "Updated Agent",
          email: "updated.agent@example.com",
          role: "agent",
          emailVerified: false,
          createdAt: "2026-04-07T10:00:00.000Z",
          updatedAt: "2026-04-09T12:00:00.000Z",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "编辑用户 Agent User" }));
    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Updated Agent" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), {
      target: { value: "updated.agent@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/users/2", {
        name: "Updated Agent",
        email: "updated.agent@example.com",
      });
    });

    await screen.findByText("Updated Agent");
    expect(screen.getByText("updated.agent@example.com")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "编辑用户" })).not.toBeInTheDocument();
  });

  test("updates a user password when provided", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "2",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        user: {
          id: "2",
          name: "Agent User",
          email: "agent@example.com",
          role: "agent",
          emailVerified: false,
          createdAt: "2026-04-07T10:00:00.000Z",
          updatedAt: "2026-04-07T12:00:00.000Z",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "编辑用户 Agent User" }));
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/users/2", {
        name: "Agent User",
        email: "agent@example.com",
        password: "newpassword123",
      });
    });
  });

  test("shows a server error and keeps the dialog open when creation fails", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [],
      },
    });
    mockedApiClient.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: "该邮箱已存在。",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("暂无用户数据。");

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "Existing User" } });
    fireEvent.change(screen.getByLabelText("电子邮件"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    await screen.findByText("该邮箱已存在。");
    expect(screen.getByRole("heading", { name: "创建新用户" })).toBeVisible();
    expect(screen.getByText("该邮箱已存在。")).toBeVisible();
  });

  test("shows a server error and keeps the edit dialog open when update fails", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "2",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });
    mockedApiClient.patch.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: "该邮箱已存在。",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "编辑用户 Agent User" }));
    fireEvent.change(screen.getByLabelText("电子邮件"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await screen.findByText("该邮箱已存在。");
    expect(screen.getByRole("heading", { name: "编辑用户" })).toBeVisible();
    expect(screen.getByText("该邮箱已存在。")).toBeVisible();
  });

  test("deletes a user and refreshes the list", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "2",
              name: "Agent User",
              email: "agent@example.com",
              role: "agent",
              emailVerified: false,
              createdAt: "2026-04-07T10:00:00.000Z",
              updatedAt: "2026-04-07T12:00:00.000Z",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [],
        },
      });
    mockedApiClient.delete.mockResolvedValue({
      data: {
        success: true,
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "删除用户 Agent User" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(mockedApiClient.delete).toHaveBeenCalledWith("/api/users/2");
    });

    await screen.findByText("暂无用户数据。");
    expect(screen.queryByRole("heading", { name: "确认删除用户" })).not.toBeInTheDocument();
  });

  test("clears ticket-related caches after deleting a user", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "2",
              name: "Agent User",
              email: "agent@example.com",
              role: "agent",
              emailVerified: false,
              createdAt: "2026-04-07T10:00:00.000Z",
              updatedAt: "2026-04-07T12:00:00.000Z",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [],
        },
      });
    mockedApiClient.delete.mockResolvedValue({
      data: {
        success: true,
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    queryClient.setQueryData(["ticket", "7"], {
      assignedUser: { id: "2", name: "Agent User", email: "agent@example.com" },
    });
    queryClient.setQueryData(["ticket-assignable-agents"], {
      agents: [{ id: "2", name: "Agent User", email: "agent@example.com" }],
    });

    renderWithQuery(<UsersPage />, { queryClient });

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "删除用户 Agent User" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await screen.findByText("暂无用户数据。");

    expect(queryClient.getQueryData(["ticket", "7"])).toBeUndefined();
    expect(queryClient.getQueryState(["ticket-assignable-agents"])?.isInvalidated).toBe(true);
  });

  test("shows delete error and keeps dialog open when deletion fails", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        users: [
          {
            id: "2",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: false,
            createdAt: "2026-04-07T10:00:00.000Z",
            updatedAt: "2026-04-07T12:00:00.000Z",
          },
        ],
      },
    });
    mockedApiClient.delete.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: "删除失败。",
        },
      },
    });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Agent User");

    fireEvent.click(screen.getByRole("button", { name: "删除用户 Agent User" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await screen.findByText("删除失败。");
    expect(screen.getByRole("heading", { name: "确认删除用户" })).toBeVisible();
  });
});
