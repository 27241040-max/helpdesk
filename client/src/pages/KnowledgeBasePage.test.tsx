import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { KnowledgeBasePage } from "./KnowledgeBasePage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

const entry = {
  bodyText: "客户可以在订单详情页面查看国际物流公司、追踪编号和追踪链接。",
  chunkCount: 1,
  createdAt: "2026-05-27T08:00:00.000Z",
  id: 1,
  isEnabled: true,
  title: "国际物流追踪",
  updatedAt: "2026-05-27T09:00:00.000Z",
};

describe("KnowledgeBasePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders an empty state", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        entries: [],
      },
    });

    renderWithQuery(<KnowledgeBasePage />);

    await screen.findByText("暂无知识库数据。");
    expect(screen.getByText("当前共 0 条知识")).toBeVisible();
  });

  test("renders knowledge base entries", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        entries: [entry],
      },
    });

    renderWithQuery(<KnowledgeBasePage />);

    await screen.findByText("国际物流追踪");

    expect(screen.getByText("当前共 1 条知识")).toBeVisible();
    expect(screen.getByText("已启用")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getByRole("button", { name: "编辑知识 国际物流追踪" })).toBeVisible();
    expect(screen.getByRole("button", { name: "删除知识 国际物流追踪" })).toBeVisible();
  });

  test("opens the create dialog and validates the form", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        entries: [],
      },
    });

    renderWithQuery(<KnowledgeBasePage />);

    await screen.findByText("暂无知识库数据。");
    fireEvent.click(screen.getByRole("button", { name: "创建知识" }));

    expect(screen.getByRole("heading", { name: "创建知识库" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "创建知识" }));

    await screen.findByText("标题至少包含 2 个字符");
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  test("toggles an enabled entry", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        entries: [entry],
      },
    });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        entry: {
          ...entry,
          isEnabled: false,
        },
      },
    });

    renderWithQuery(<KnowledgeBasePage />);

    await screen.findByText("国际物流追踪");
    fireEvent.click(screen.getByRole("button", { name: "停用知识 国际物流追踪" }));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/knowledge-base/1", {
        bodyText: entry.bodyText,
        isEnabled: false,
        title: entry.title,
      });
    });
  });
});
