import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { UsersPage } from "./UsersPage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
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
    expect(screen.getByText("已验证")).toBeVisible();
    expect(screen.getByText("未验证")).toBeVisible();

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/users");
    });
  });
});
