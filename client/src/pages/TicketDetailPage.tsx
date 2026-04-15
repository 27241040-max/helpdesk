import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeftIcon } from "lucide-react";
import { type TicketDetail } from "core/email";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import {
  formatTicketDate,
  getTicketCategoryLabel,
  TicketStatusBadge,
} from "@/components/tickets/ticket-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

function getTicketDetailErrorState(error: unknown): "error" | "not_found" {
  if (
    axios.isAxiosError<{ error?: string }>(error) &&
    error.response?.status === 404 &&
    error.response.data?.error === "工单不存在。"
  ) {
    return "not_found";
  }

  return "error";
}

function getTicketDetailErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "工单详情加载失败，请稍后再试。";
  }

  return "工单详情加载失败，请稍后再试。";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1.5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">{label}</span>
      <div className="text-sm text-card-foreground">{value}</div>
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-4 rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-24 rounded-2xl" key={index} />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const { data, isPending, isError, error } = useQuery({
    enabled: Boolean(ticketId),
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const response = await apiClient.get<TicketDetail>(`/api/tickets/${ticketId}`);
      return response.data;
    },
  });

  if (isError) {
    console.error("工单详情加载失败:", error);
  }

  const errorState = isError ? getTicketDetailErrorState(error) : null;

  return (
    <section className="grid gap-4">
      <div>
        <Button asChild type="button" variant="outline">
          <Link to="/tickets">
            <ArrowLeftIcon className="size-4" />
            返回工单列表
          </Link>
        </Button>
      </div>

      {isPending ? (
        <TicketDetailSkeleton />
      ) : isError ? (
        <article className="grid gap-3 rounded-[28px] border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
            {errorState === "not_found" ? "工单不存在" : "工单详情加载失败"}
          </h2>
          <p className="text-sm text-muted-foreground">{getTicketDetailErrorMessage(error)}</p>
        </article>
      ) : data ? (
        <article className="grid gap-6 rounded-[28px] border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ticket Detail</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="grid gap-2">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-card-foreground">
                  {data.subject}
                </h2>
                <p className="text-sm text-muted-foreground">工单 #{data.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <TicketStatusBadge status={data.status} />
                <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                  {getTicketCategoryLabel(data.category)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="客户" value={<strong>{data.customer.name}</strong>} />
            <DetailItem label="客户邮箱" value={data.customer.email} />
            <DetailItem
              label="指派人"
              value={
                data.assignedUser ? (
                  <div className="grid gap-1">
                    <strong>{data.assignedUser.name}</strong>
                    <span className="text-muted-foreground">{data.assignedUser.email}</span>
                  </div>
                ) : (
                  "未指派"
                )
              }
            />
            <DetailItem label="来源" value={data.source} />
            <DetailItem label="创建时间" value={formatTicketDate(data.createdAt)} />
            <DetailItem label="更新时间" value={formatTicketDate(data.updatedAt)} />
          </div>

          <div className="grid gap-2 rounded-[24px] border border-border/70 bg-muted/20 p-5">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">正文</span>
            <p className="whitespace-pre-wrap text-sm leading-7 text-card-foreground">{data.bodyText}</p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
