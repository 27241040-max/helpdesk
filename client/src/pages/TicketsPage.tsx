import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  TicketCategory,
  TicketStatus,
  type TicketListItem,
  type TicketListQuery,
  type TicketListMeta,
  type TicketSortField,
  type TicketSortOrder,
} from "core/email";
import { SearchIcon, XIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { TicketsTable } from "@/components/tickets/TicketsTable";
import { shouldPollForTicketAutoClassification } from "@/components/tickets/ticket-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

type TicketsResponse = {
  meta: TicketListMeta;
  tickets: TicketListItem[];
};

type TicketSorting = {
  sortBy: TicketSortField;
  sortOrder: TicketSortOrder;
};

type TicketFilters = Pick<TicketListQuery, "category" | "q" | "status">;

const defaultSorting: TicketSorting = {
  sortBy: "createdAt",
  sortOrder: "desc",
};

const defaultFilters: TicketFilters = {
  category: undefined,
  q: undefined,
  status: undefined,
};
const pageSize = 10;

function TicketsTableSkeleton() {
  return (
    <div className="border-t border-border/70">
      <div className="grid grid-cols-5 gap-4 border-b border-border/70 px-1 py-3 text-sm">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="ml-auto h-4 w-20" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="grid grid-cols-5 items-center gap-4 border-b border-border/60 px-1 py-4 last:border-b-0"
          key={index}
        >
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function getTicketsErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "工单列表加载失败，请稍后再试。";
  }

  return "工单列表加载失败，请稍后再试。";
}

export function TicketsPage() {
  const [sorting, setSorting] = useState<TicketSorting>(defaultSorting);
  const [filters, setFilters] = useState<TicketFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const deferredKeyword = useDeferredValue(filters.q ?? "");
  const { data, isFetching, isPending, isError, error } = useQuery({
    queryKey: [
      "tickets",
      page,
      pageSize,
      sorting.sortBy,
      sorting.sortOrder,
      deferredKeyword,
      filters.status ?? "",
      filters.category ?? "",
    ],
    queryFn: async () => {
      const response = await apiClient.get<TicketsResponse>("/api/tickets", {
        params: {
          category: filters.category,
          page,
          pageSize,
          q: deferredKeyword || undefined,
          status: filters.status,
          sortBy: sorting.sortBy,
          sortOrder: sorting.sortOrder,
        },
      });
      return response.data;
    },
    refetchInterval: (query) =>
      query.state.data?.tickets.some(shouldPollForTicketAutoClassification) ? 3_000 : false,
  });

  if (isError) {
    console.error("工单列表加载失败:", error);
  }

  const tickets = data?.tickets ?? [];
  const meta = data?.meta ?? { page, pageSize, total: 0, totalPages: 1 };
  const hasActiveFilters = Boolean(filters.category || filters.status || filters.q?.trim());
  const handleSortingChange = (sortBy: TicketSortField) => {
    setPage(1);
    setSorting((current) => {
      if (current.sortBy !== sortBy) {
        return {
          sortBy,
          sortOrder: "asc",
        };
      }

      return {
        sortBy,
        sortOrder: current.sortOrder === "asc" ? "desc" : "asc",
      };
    });
  };
  const handleKeywordChange = (value: string) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      q: value || undefined,
    }));
  };
  const handleStatusChange = (value: string) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      status: value === "all" ? undefined : (value as TicketStatus),
    }));
  };
  const handleCategoryChange = (value: string) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      category: value === "all" ? undefined : (value as TicketCategory),
    }));
  };
  const resetFilters = () => {
    setPage(1);
    setFilters(defaultFilters);
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-6">
        <div className="grid gap-4">
          <div className="grid gap-4 pb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">工单列表</h3>
              <p className="text-sm text-muted-foreground">
                当前共 {meta.total} 个工单，第 {meta.page} / {meta.totalPages} 页
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_180px_180px_auto]">
              <label className="grid gap-1.5 text-sm text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  关键词
                </span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-10 rounded-xl border-border/80 bg-background pl-9 shadow-sm"
                    onChange={(event) => handleKeywordChange(event.target.value)}
                    placeholder="搜索主题、客户名或邮箱"
                    type="search"
                    value={filters.q ?? ""}
                  />
                </div>
              </label>

              <label className="grid gap-1.5 text-sm text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  状态
                </span>
                <select
                  className="h-10 rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  onChange={(event) => handleStatusChange(event.target.value)}
                  value={filters.status ?? "all"}
                >
                  <option value="all">全部状态</option>
                  <option value={TicketStatus.open}>Open</option>
                  <option value={TicketStatus.resolved}>Resolved</option>
                  <option value={TicketStatus.closed}>Closed</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-sm text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  分类
                </span>
                <select
                  className="h-10 rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  value={filters.category ?? "all"}
                >
                  <option value="all">全部分类</option>
                  <option value={TicketCategory.general}>General</option>
                  <option value={TicketCategory.technical}>Technical</option>
                  <option value={TicketCategory.refundRequest}>Refund Request</option>
                </select>
              </label>

              <Button
                className="h-10 self-end rounded-xl px-3"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
                type="button"
                variant="outline"
              >
                <XIcon className="size-4" />
                重置筛选
              </Button>
            </div>
          </div>

          {isPending ? (
            <TicketsTableSkeleton />
          ) : isError ? (
            <div className="border-t border-border/70 pt-4 text-sm text-destructive">
              {getTicketsErrorMessage(error)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
              暂无工单数据。
            </div>
          ) : (
            <div className="grid gap-4 border-t border-border/70 pt-4">
              <TicketsTable
                isSortingPending={isFetching}
                onSortingChange={handleSortingChange}
                sorting={sorting}
                tickets={tickets}
              />

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <p>
                  显示第 {(meta.page - 1) * meta.pageSize + 1} -{" "}
                  {Math.min(meta.page * meta.pageSize, meta.total)} 条，共 {meta.total} 条
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={meta.page <= 1 || isFetching}
                    onClick={() => setPage(1)}
                    type="button"
                    variant="outline"
                  >
                    {"<<"}
                  </Button>
                  <Button
                    disabled={meta.page <= 1 || isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                    variant="outline"
                  >
                    {"<"}
                  </Button>
                  <span className="min-w-20 text-center text-sm text-foreground">
                    第 {meta.page} / {meta.totalPages} 页
                  </span>
                  <Button
                    disabled={meta.page >= meta.totalPages || isFetching}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                    variant="outline"
                  >
                    {">"}
                  </Button>
                  <Button
                    disabled={meta.page >= meta.totalPages || isFetching}
                    onClick={() => setPage(meta.totalPages)}
                    type="button"
                    variant="outline"
                  >
                    {">>"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
