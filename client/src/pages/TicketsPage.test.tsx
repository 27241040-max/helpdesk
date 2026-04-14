import { TicketCategory, TicketStatus } from "core/email";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { TicketsPage } from "./TicketsPage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe("TicketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders loading state before data resolves", () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => undefined));

    renderWithQuery(<TicketsPage />);

    expect(screen.getByText("工单列表")).toBeVisible();
    expect(screen.getByText("当前共 0 个工单")).toBeVisible();
  });

  test("renders an error state when the request fails", async () => {
    mockedApiClient.get.mockRejectedValue(new Error("boom"));

    renderWithQuery(<TicketsPage />);

    await screen.findByText("工单列表加载失败，请稍后再试。");
    expect(screen.getByText("工单列表加载失败，请稍后再试。")).toBeVisible();
  });

  test("renders an empty state when there are no tickets", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        tickets: [],
      },
    });

    renderWithQuery(<TicketsPage />);

    await screen.findByText("暂无工单数据。");
    expect(screen.getByText("当前共 0 个工单")).toBeVisible();
  });

  test("renders tickets from the API response in newest-first order", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        tickets: [
          {
            id: 2,
            subject: "Newest ticket",
            status: TicketStatus.open,
            category: null,
            createdAt: "2026-04-14T14:00:00.000Z",
            customer: {
              id: 2,
              name: "Customer Two",
              email: "customer.two@example.com",
            },
          },
          {
            id: 1,
            subject: "Older ticket",
            status: TicketStatus.resolved,
            category: TicketCategory.technical,
            createdAt: "2026-04-14T13:00:00.000Z",
            customer: {
              id: 1,
              name: "Customer One",
              email: "customer.one@example.com",
            },
          },
        ],
      },
    });

    renderWithQuery(<TicketsPage />);

    await screen.findByText("Newest ticket");

    expect(screen.getByText("当前共 2 个工单")).toBeVisible();
    expect(screen.getByText("Customer Two")).toBeVisible();
    expect(screen.getByText("customer.two@example.com")).toBeVisible();
    expect(screen.getByText("Open")).toBeVisible();
    expect(screen.getByText("Resolved")).toBeVisible();
    expect(screen.getByText("Technical")).toBeVisible();
    expect(screen.getByText("未分类")).toBeVisible();

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Newest ticket");
    expect(rows[2]).toHaveTextContent("Older ticket");

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/tickets");
    });
  });
});
