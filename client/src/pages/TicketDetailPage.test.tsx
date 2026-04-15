import { type TicketDetail, TicketCategory, TicketStatus } from "core/email";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { apiClient } from "../lib/api-client";
import { renderWithQuery } from "../test/render-with-query";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);
const agents = [
  {
    id: "user_1",
    name: "Agent Smith",
    email: "agent@example.com",
  },
  {
    id: "user_2",
    name: "Taylor Agent",
    email: "taylor.agent@example.com",
  },
];

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
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => undefined;
    Element.prototype.releasePointerCapture ??= () => undefined;
    Element.prototype.scrollIntoView ??= () => undefined;
  });

  test("renders ticket details", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        return { data: ticketDetail };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderTicketDetailPage();

    await screen.findByText("Refund request follow-up");

    expect(screen.getByText("Customer requested an update about the refund timeline.")).toBeVisible();
    expect(screen.getByText(/客户:/)).toBeVisible();
    expect(screen.getByText("Taylor (taylor@example.com)")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "指派给" })).toHaveTextContent("Agent Smith");
    expect(screen.getByRole("combobox", { name: "状态" })).toHaveTextContent("Open");
    expect(screen.getByRole("combobox", { name: "类别" })).toHaveTextContent("Refund Request");
    expect(screen.getByText("正文")).toBeVisible();
    expect(screen.getByText("来自 Taylor")).toBeVisible();
    expect(screen.getByRole("link", { name: "返回工单列表" })).toHaveAttribute("href", "/tickets");
    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/tickets/7");
  });

  test("renders a not found state when the ticket does not exist", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        throw {
          isAxiosError: true,
          response: {
            data: {
              error: "工单不存在。",
            },
            status: 404,
          },
        };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderTicketDetailPage();

    await screen.findByText("工单不存在");
    expect(screen.getByText("工单不存在。")).toBeVisible();
  });

  test("renders a generic error state when the request fails", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        throw new Error("boom");
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderTicketDetailPage();

    await screen.findByText("工单详情加载失败");
    expect(screen.getByText("工单详情加载失败，请稍后再试。")).toBeVisible();
  });

  test("renders fallback text when the ticket is unassigned and uncategorized", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        return {
          data: {
            ...ticketDetail,
            assignedUser: null,
            category: null,
          } satisfies TicketDetail,
        };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });

    renderTicketDetailPage();

    await waitFor(() => {
      expect(screen.getAllByText("未指派").length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("combobox", { name: "指派给" })).toHaveTextContent("未指派");
    expect(screen.getByText("未分类")).toBeVisible();
  });

  test("assigns the ticket to a different agent", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        return { data: ticketDetail };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...ticketDetail,
        assignedUser: agents[1],
      } satisfies TicketDetail,
    });

    renderTicketDetailPage();

    await screen.findByText("Refund request follow-up");

    fireEvent.click(screen.getByRole("combobox", { name: "指派给" }));
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Taylor Agent"));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/tickets/7/assignment", {
        assignedUserId: "user_2",
      });
    });
    expect(screen.getByRole("combobox", { name: "指派给" })).toHaveTextContent("Taylor Agent");
  });

  test("updates ticket status", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        return { data: ticketDetail };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...ticketDetail,
        status: TicketStatus.closed,
      } satisfies TicketDetail,
    });

    renderTicketDetailPage();

    await screen.findByText("Refund request follow-up");

    fireEvent.click(screen.getByRole("combobox", { name: "状态" }));
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Closed"));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/tickets/7", {
        category: TicketCategory.refundRequest,
        status: TicketStatus.closed,
      });
    });
    expect(screen.getByRole("combobox", { name: "状态" })).toHaveTextContent("Closed");
  });

  test("updates ticket category", async () => {
    mockedApiClient.get.mockImplementation(async (url) => {
      if (url === "/api/tickets/7") {
        return { data: ticketDetail };
      }

      if (url === "/api/agents") {
        return { data: { agents } };
      }

      throw new Error(`Unhandled GET ${url}`);
    });
    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...ticketDetail,
        category: TicketCategory.technical,
      } satisfies TicketDetail,
    });

    renderTicketDetailPage();

    await screen.findByText("Refund request follow-up");

    fireEvent.click(screen.getByRole("combobox", { name: "类别" }));
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Technical"));

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith("/api/tickets/7", {
        category: TicketCategory.technical,
        status: TicketStatus.open,
      });
    });
    expect(screen.getByRole("combobox", { name: "类别" })).toHaveTextContent("Technical");
  });
});
