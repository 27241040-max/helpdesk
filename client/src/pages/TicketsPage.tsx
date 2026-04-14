import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { type TicketListItem } from "core/email";

import { TicketsTable } from "@/components/tickets/TicketsTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

type TicketsResponse = {
  tickets: TicketListItem[];
};

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
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const response = await apiClient.get<TicketsResponse>("/api/tickets");
      return response.data;
    },
  });

  if (isError) {
    console.error("工单列表加载失败:", error);
  }

  const tickets = data?.tickets ?? [];

  return (
    <section className="grid gap-6">
      <div className="grid gap-6">
        <div className="border-b border-border/70 pb-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Badge className="w-fit uppercase" variant="secondary">
              Inbox
            </Badge>
            <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground">Tickets</h2>
            <p className="text-[0.95rem] leading-6 text-muted-foreground">
              查看所有由邮件创建的工单，默认按最新创建时间优先排序。
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">工单列表</h3>
            <p className="mt-1 text-sm text-muted-foreground">当前共 {tickets.length} 个工单</p>
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
            <div className="border-t border-border/70">
              <TicketsTable tickets={tickets} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
