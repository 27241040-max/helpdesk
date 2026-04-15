import { type TicketDetail, TicketCategory, TicketStatus } from "core/email";
import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

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
  source: "inbound_email",
  status: TicketStatus.open,
  subject: "Refund request follow-up",
  updatedAt: "2026-04-14T09:00:00.000Z",
};

function renderTicketDetailPage(entry = "/tickets/7") {
  return renderWithQuery(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<TicketDetailPage />} path="/tickets/:ticketId" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage", () => {
  test("renders ticket details", async () => {
    mockedApiClient.get.mockResolvedValue({ data: ticketDetail });

    renderTicketDetailPage();

    await screen.findByText("Refund request follow-up");

    expect(screen.getByText("Customer requested an update about the refund timeline.")).toBeVisible();
    expect(screen.getByText("Taylor")).toBeVisible();
    expect(screen.getByText("taylor@example.com")).toBeVisible();
    expect(screen.getByText("Agent Smith")).toBeVisible();
    expect(screen.getByText("agent@example.com")).toBeVisible();
    expect(screen.getByText("Refund Request")).toBeVisible();
    expect(screen.getByText("inbound_email")).toBeVisible();
    expect(screen.getByRole("link", { name: "返回工单列表" })).toHaveAttribute("href", "/tickets");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/tickets/7");
  });

  test("renders a not found state when the ticket does not exist", async () => {
    mockedApiClient.get.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: "工单不存在。",
        },
        status: 404,
      },
    });

    renderTicketDetailPage();

    await screen.findByText("工单不存在");
    expect(screen.getByText("工单不存在。")).toBeVisible();
  });

  test("renders a generic error state when the request fails", async () => {
    mockedApiClient.get.mockRejectedValue(new Error("boom"));

    renderTicketDetailPage();

    await screen.findByText("工单详情加载失败");
    expect(screen.getByText("工单详情加载失败，请稍后再试。")).toBeVisible();
  });

  test("renders fallback text when the ticket is unassigned and uncategorized", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        ...ticketDetail,
        assignedUser: null,
        category: null,
      } satisfies TicketDetail,
    });

    renderTicketDetailPage();

    await screen.findByText("未指派");
    expect(screen.getByText("未分类")).toBeVisible();
  });
});
