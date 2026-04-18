import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { Homepage } from "./Homepage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe("Homepage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createTicketVolumeByDay() {
    return Array.from({ length: 30 }, (_, index) => ({
      date: `2026-03-${String(index + 1).padStart(2, "0")}`,
      totalTickets: (index % 5) + 1,
    }));
  }

  test("renders dashboard metrics and health status", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return {
          data: {
            service: "ticket-management-system",
            status: "ok",
          },
        };
      }

      if (url === "/api/tickets/stats") {
        return {
          data: {
            aiResolvedPercentage: 37.5,
            aiResolvedTickets: 15,
            averageResolutionMs: 9_000_000,
            openTickets: 8,
            resolvedTickets: 40,
            ticketVolumeByDay: createTicketVolumeByDay(),
            totalTickets: 64,
          },
        };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderWithQuery(<Homepage />);

    await screen.findByText("64");

    expect(screen.getByRole("heading", { name: "AI Helpdesk 主控台" })).toBeVisible();
    expect(screen.getByText("服务正常运行 (ticket-management-system: OK)")).toBeVisible();
    expect(screen.getByText("总表单数")).toBeVisible();
    expect(screen.getByText("Open Tickets")).toBeVisible();
    expect(screen.getByText("AI 解决的表单数量")).toBeVisible();
    expect(screen.getByText("AI 解决表单的百分比")).toBeVisible();
    expect(screen.getByText("平均解决时间")).toBeVisible();
    expect(screen.getByText("过去 30 天工单量")).toBeVisible();
    expect(screen.getByText("37.5%")).toBeVisible();
    expect(screen.getByText("2h 30m")).toBeVisible();
    expect(screen.getByLabelText("Mar 1: 1 tickets")).toBeVisible();
  });

  test("shows fallback text when there is no average resolution data", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return {
          data: {
            service: "ticket-management-system",
            status: "ok",
          },
        };
      }

      if (url === "/api/tickets/stats") {
        return {
          data: {
            aiResolvedPercentage: 0,
            aiResolvedTickets: 0,
            averageResolutionMs: null,
            openTickets: 0,
            resolvedTickets: 0,
            ticketVolumeByDay: createTicketVolumeByDay(),
            totalTickets: 0,
          },
        };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderWithQuery(<Homepage />);

    await screen.findByText("暂无数据");
    expect(screen.getByText("暂无数据")).toBeVisible();
  });

  test("keeps the health card visible when dashboard stats fail", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return {
          data: {
            service: "ticket-management-system",
            status: "ok",
          },
        };
      }

      if (url === "/api/tickets/stats") {
        throw {
          isAxiosError: true,
          response: {
            data: {
              error: "统计接口暂不可用。",
            },
          },
        };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderWithQuery(<Homepage />);

    await screen.findByText("仪表盘统计加载失败");
    expect(screen.getByText("服务正常运行 (ticket-management-system: OK)")).toBeVisible();
    expect(screen.getByText("统计接口暂不可用。")).toBeVisible();
  });
});
