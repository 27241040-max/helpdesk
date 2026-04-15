import { TicketCategory, TicketStatus, type TicketListItem, type TicketListMeta } from "core/email";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
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
const defaultMeta: TicketListMeta = {
  page: 1,
  pageSize: 10,
  total: 2,
  totalPages: 1,
};

const ticketsBySortKey: Record<string, TicketListItem[]> = {
  "category:asc": [
    {
      id: 1,
      subject: "Billing issue",
      status: TicketStatus.open,
      category: TicketCategory.general,
      createdAt: "2026-04-14T13:00:00.000Z",
      customer: {
        id: 1,
        name: "Customer One",
        email: "customer.one@example.com",
      },
    },
    {
      id: 2,
      subject: "Tech support",
      status: TicketStatus.resolved,
      category: TicketCategory.technical,
      createdAt: "2026-04-14T14:00:00.000Z",
      customer: {
        id: 2,
        name: "Customer Two",
        email: "customer.two@example.com",
      },
    },
  ],
  "createdAt:asc": [
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
  ],
  "createdAt:desc": [
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
  "customer:asc": [
    {
      id: 3,
      subject: "A question",
      status: TicketStatus.closed,
      category: null,
      createdAt: "2026-04-14T12:00:00.000Z",
      customer: {
        id: 3,
        name: "Alice",
        email: "alice@example.com",
      },
    },
    {
      id: 4,
      subject: "B question",
      status: TicketStatus.open,
      category: TicketCategory.general,
      createdAt: "2026-04-14T11:00:00.000Z",
      customer: {
        id: 4,
        name: "Bob",
        email: "bob@example.com",
      },
    },
  ],
  "status:asc": [
    {
      id: 5,
      subject: "Closed first",
      status: TicketStatus.closed,
      category: null,
      createdAt: "2026-04-14T10:00:00.000Z",
      customer: {
        id: 5,
        name: "Casey",
        email: "casey@example.com",
      },
    },
    {
      id: 6,
      subject: "Open second",
      status: TicketStatus.open,
      category: TicketCategory.general,
      createdAt: "2026-04-14T09:00:00.000Z",
      customer: {
        id: 6,
        name: "Devon",
        email: "devon@example.com",
      },
    },
  ],
  "subject:asc": [
    {
      id: 7,
      subject: "Alpha ticket",
      status: TicketStatus.open,
      category: null,
      createdAt: "2026-04-14T08:00:00.000Z",
      customer: {
        id: 7,
        name: "Zed",
        email: "zed@example.com",
      },
    },
    {
      id: 8,
      subject: "Beta ticket",
      status: TicketStatus.resolved,
      category: TicketCategory.technical,
      createdAt: "2026-04-14T07:00:00.000Z",
      customer: {
        id: 8,
        name: "Yan",
        email: "yan@example.com",
      },
    },
  ],
};

const ticketsByQueryKey: Record<string, TicketListItem[]> = {
  "category:all|page:1|pageSize:10|q:|sortBy:createdAt|sortOrder:desc|status:all":
    ticketsBySortKey["createdAt:desc"],
  "category:all|page:1|pageSize:10|q:alice|sortBy:createdAt|sortOrder:desc|status:all": [
    {
      id: 10,
      subject: "Ticket for Alice",
      status: TicketStatus.open,
      category: TicketCategory.general,
      createdAt: "2026-04-14T16:00:00.000Z",
      customer: {
        id: 10,
        name: "Alice",
        email: "alice@example.com",
      },
    },
  ],
  "category:all|page:1|pageSize:10|q:|sortBy:createdAt|sortOrder:desc|status:resolved": [
    {
      id: 11,
      subject: "Resolved ticket",
      status: TicketStatus.resolved,
      category: TicketCategory.technical,
      createdAt: "2026-04-14T15:00:00.000Z",
      customer: {
        id: 11,
        name: "Riley",
        email: "riley@example.com",
      },
    },
  ],
  "category:refund_request|page:1|pageSize:10|q:|sortBy:createdAt|sortOrder:desc|status:all": [
    {
      id: 12,
      subject: "Refund ticket",
      status: TicketStatus.open,
      category: TicketCategory.refundRequest,
      createdAt: "2026-04-14T14:30:00.000Z",
      customer: {
        id: 12,
        name: "Taylor",
        email: "taylor@example.com",
      },
    },
  ],
};

function getQueryKey(config?: { params?: Record<string, unknown> }) {
  const params = config?.params ?? {};

  return [
    `category:${String(params.category ?? "all")}`,
    `page:${String(params.page ?? 1)}`,
    `pageSize:${String(params.pageSize ?? 10)}`,
    `q:${String(params.q ?? "")}`,
    `sortBy:${String(params.sortBy ?? "createdAt")}`,
    `sortOrder:${String(params.sortOrder ?? "desc")}`,
    `status:${String(params.status ?? "all")}`,
  ].join("|");
}

function createTicketsResponse(
  tickets: TicketListItem[],
  meta: Partial<TicketListMeta> = {},
) {
  return {
    data: {
      meta: {
        ...defaultMeta,
        total: tickets.length,
        ...meta,
      },
      tickets,
    },
  };
}

function renderTicketsPage(initialEntries: string[] = ["/tickets"]) {
  return renderWithQuery(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<TicketsPage />} path="/tickets" />
        <Route element={<div>detail page</div>} path="/tickets/:ticketId" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders loading state before data resolves", () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => undefined));

    renderTicketsPage();

    expect(screen.getByText("工单列表")).toBeVisible();
    expect(screen.getByText("当前共 0 个工单，第 1 / 1 页")).toBeVisible();
  });

  test("renders an error state when the request fails", async () => {
    mockedApiClient.get.mockRejectedValue(new Error("boom"));

    renderTicketsPage();

    await screen.findByText("工单列表加载失败，请稍后再试。");
    expect(screen.getByText("工单列表加载失败，请稍后再试。")).toBeVisible();
  });

  test("renders an empty state when there are no tickets", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 1,
        },
        tickets: [],
      },
    });

    renderTicketsPage();

    await screen.findByText("暂无工单数据。");
    expect(screen.getByText("当前共 0 个工单，第 1 / 1 页")).toBeVisible();
  });

  test("loads tickets with default createdAt desc sorting", async () => {
    mockedApiClient.get.mockResolvedValue(createTicketsResponse(ticketsBySortKey["createdAt:desc"]));

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    expect(screen.getByText("当前共 2 个工单，第 1 / 1 页")).toBeVisible();
    expect(screen.getByText("Customer Two")).toBeVisible();
    expect(screen.getByText("customer.two@example.com")).toBeVisible();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Technical").length).toBeGreaterThan(0);
    expect(screen.getByText("未分类")).toBeVisible();

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Newest ticket");
    expect(rows[2]).toHaveTextContent("Older ticket");

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          status: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
    });
  });

  test("toggles createdAt sorting between asc and desc", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      const sortBy = String(config?.params?.sortBy ?? "createdAt");
      const sortOrder = String(config?.params?.sortOrder ?? "desc");

      return createTicketsResponse(ticketsBySortKey[`${sortBy}:${sortOrder}`] ?? []);
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.click(screen.getByRole("button", { name: "创建时间" }));

    await screen.findByText("Older ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          status: undefined,
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      });
    });

    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Older ticket");
    expect(rows[2]).toHaveTextContent("Newest ticket");

    fireEvent.click(screen.getByRole("button", { name: "创建时间" }));

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          status: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
    });

    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Newest ticket");
    expect(rows[2]).toHaveTextContent("Older ticket");
  });

  test("requests server-side sorting for every visible sortable column", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      const sortBy = String(config?.params?.sortBy ?? "createdAt");
      const sortOrder = String(config?.params?.sortOrder ?? "desc");

      return createTicketsResponse(ticketsBySortKey[`${sortBy}:${sortOrder}`] ?? []);
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.click(screen.getByRole("button", { name: "主题" }));
    await screen.findByText("Alpha ticket");
    expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
      params: {
        category: undefined,
        page: 1,
        pageSize: 10,
        q: undefined,
        status: undefined,
        sortBy: "subject",
        sortOrder: "asc",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "客户" }));
    await screen.findByText("Alice");
    expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
      params: {
        category: undefined,
        page: 1,
        pageSize: 10,
        q: undefined,
        status: undefined,
        sortBy: "customer",
        sortOrder: "asc",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "状态" }));
    await screen.findByText("Closed first");
    expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
      params: {
        category: undefined,
        page: 1,
        pageSize: 10,
        q: undefined,
        status: undefined,
        sortBy: "status",
        sortOrder: "asc",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "分类" }));
    await screen.findByText("Billing issue");
    expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
      params: {
        category: undefined,
        page: 1,
        pageSize: 10,
        q: undefined,
        status: undefined,
        sortBy: "category",
        sortOrder: "asc",
      },
    });
  });

  test("clears previous column sorting when switching to a new column", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      const sortBy = String(config?.params?.sortBy ?? "createdAt");
      const sortOrder = String(config?.params?.sortOrder ?? "desc");

      return createTicketsResponse(ticketsBySortKey[`${sortBy}:${sortOrder}`] ?? []);
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.click(screen.getByRole("button", { name: "主题" }));
    await screen.findByText("Alpha ticket");

    fireEvent.click(screen.getByRole("button", { name: "客户" }));
    await screen.findByText("Alice");

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          status: undefined,
          sortBy: "customer",
          sortOrder: "asc",
        },
      });
    });

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice");
    expect(rows[2]).toHaveTextContent("Bob");
  });

  test("sends keyword, status, and category filters to the server", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      return createTicketsResponse(ticketsByQueryKey[getQueryKey(config)] ?? [], {
        total: (ticketsByQueryKey[getQueryKey(config)] ?? []).length,
      });
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.change(screen.getByPlaceholderText("搜索主题、客户名或邮箱"), {
      target: { value: "alice" },
    });

    await screen.findByText("Ticket for Alice");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: "alice",
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "重置筛选" }));
    await screen.findByText("Newest ticket");

    fireEvent.change(screen.getByRole("combobox", { name: "状态" }), {
      target: { value: TicketStatus.resolved },
    });

    await screen.findByText("Resolved ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: TicketStatus.resolved,
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "重置筛选" }));
    await screen.findByText("Newest ticket");

    fireEvent.change(screen.getByRole("combobox", { name: "分类" }), {
      target: { value: TicketCategory.refundRequest },
    });

    await screen.findByText("Refund ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: TicketCategory.refundRequest,
          page: 1,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });
  });

  test("clears filters and reloads the default query", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      return createTicketsResponse(ticketsByQueryKey[getQueryKey(config)] ?? [], {
        total: (ticketsByQueryKey[getQueryKey(config)] ?? []).length,
      });
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.change(screen.getByPlaceholderText("搜索主题、客户名或邮箱"), {
      target: { value: "alice" },
    });
    await screen.findByText("Ticket for Alice");

    fireEvent.click(screen.getByRole("button", { name: "重置筛选" }));

    await screen.findByText("Newest ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });
  });

  test("requests the next page from the server", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      const page = Number(config?.params?.page ?? 1);

      if (page === 2) {
        return createTicketsResponse(
          [
            {
              id: 22,
              subject: "Page two ticket",
              status: TicketStatus.closed,
              category: TicketCategory.general,
              createdAt: "2026-04-14T12:00:00.000Z",
              customer: {
                id: 22,
                name: "Page Two Customer",
                email: "page.two@example.com",
              },
            },
          ],
          { page: 2, pageSize: 10, total: 21, totalPages: 3 },
        );
      }

      return createTicketsResponse(ticketsBySortKey["createdAt:desc"], {
        page: 1,
        pageSize: 10,
        total: 21,
        totalPages: 3,
      });
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");
    fireEvent.click(screen.getByRole("button", { name: ">" }));

    await screen.findByText("Page two ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 2,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });

    expect(screen.getByText("当前共 21 个工单，第 2 / 3 页")).toBeVisible();
  });

  test("jumps to the first and last page from pagination controls", async () => {
    mockedApiClient.get.mockImplementation(async (_url, config) => {
      const page = Number(config?.params?.page ?? 1);

      if (page === 3) {
        return createTicketsResponse(
          [
            {
              id: 33,
              subject: "Last page ticket",
              status: TicketStatus.closed,
              category: TicketCategory.general,
              createdAt: "2026-04-14T11:00:00.000Z",
              customer: {
                id: 33,
                name: "Last Page Customer",
                email: "last.page@example.com",
              },
            },
          ],
          { page: 3, pageSize: 10, total: 21, totalPages: 3 },
        );
      }

      if (page === 2) {
        return createTicketsResponse(
          [
            {
              id: 22,
              subject: "Middle page ticket",
              status: TicketStatus.open,
              category: TicketCategory.technical,
              createdAt: "2026-04-14T12:00:00.000Z",
              customer: {
                id: 22,
                name: "Middle Page Customer",
                email: "middle.page@example.com",
              },
            },
          ],
          { page: 2, pageSize: 10, total: 21, totalPages: 3 },
        );
      }

      return createTicketsResponse(ticketsBySortKey["createdAt:desc"], {
        page: 1,
        pageSize: 10,
        total: 21,
        totalPages: 3,
      });
    });

    renderTicketsPage();

    await screen.findByText("Newest ticket");

    fireEvent.click(screen.getByRole("button", { name: ">>" }));
    await screen.findByText("Last page ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 3,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "<<" }));
    await screen.findByText("Newest ticket");
    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: {
          category: undefined,
          page: 1,
          pageSize: 10,
          q: undefined,
          sortBy: "createdAt",
          sortOrder: "desc",
          status: undefined,
        },
      });
    });
  });

  test("navigates to the detail page when clicking the subject", async () => {
    mockedApiClient.get.mockResolvedValue(createTicketsResponse(ticketsBySortKey["createdAt:desc"]));

    renderTicketsPage();

    const subjectLink = await screen.findByRole("link", { name: "Newest ticket" });
    fireEvent.click(subjectLink);

    await screen.findByText("detail page");
  });
});
