import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { TicketDashboardStats } from "core/email";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallbackMessage;
  }

  return fallbackMessage;
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatAverageResolutionTime(value: number | null) {
  if (value === null || Number.isNaN(value) || value < 0) {
    return "暂无数据";
  }

  const totalMinutes = Math.max(1, Math.round(value / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

function formatChartDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function TicketVolumeChart({
  data,
}: {
  data?: TicketDashboardStats["ticketVolumeByDay"];
}) {
  const chartData = data ?? [];
  const maxTickets = Math.max(...chartData.map((item) => item.totalTickets), 1);
  const tickIndexes = new Set([0, 7, 14, 21, chartData.length - 1]);

  if (chartData.length === 0) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>过去 30 天工单量</CardTitle>
          <CardDescription>按天统计最近 30 天收到的工单总数</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暂无最近 30 天的图表数据。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle>过去 30 天工单量</CardTitle>
        <CardDescription>按天统计最近 30 天收到的工单总数</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex h-72 items-end gap-2 overflow-x-auto pb-2">
          {chartData.map((item, index) => {
            const height = `${Math.max((item.totalTickets / maxTickets) * 100, item.totalTickets > 0 ? 10 : 4)}%`;

            return (
              <div
                className="grid min-w-6 flex-1 gap-2"
                key={item.date}
              >
                <div className="flex h-56 items-end">
                  <div
                    aria-label={`${formatChartDayLabel(item.date)}: ${item.totalTickets} tickets`}
                    className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                    style={{ height }}
                    title={`${formatChartDayLabel(item.date)}: ${item.totalTickets}`}
                  />
                </div>
                <div className="min-h-10 text-center text-[0.7rem] text-muted-foreground">
                  {tickIndexes.has(index) ? formatChartDayLabel(item.date) : ""}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          最高单日工单量 {maxTickets}，图表展示最近 30 天每日新建工单数。
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardMetricSkeleton() {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  );
}

function DashboardMetric({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: string;
}) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <CardTitle className="text-3xl tracking-[-0.04em]">{value}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function Homepage() {
  const {
    data: statsData,
    isPending: isStatsPending,
    isError: isStatsError,
    error: statsError,
  } = useQuery({
    queryKey: ["ticket-dashboard-stats"],
    queryFn: async () => {
      const response = await apiClient.get<TicketDashboardStats>("/api/tickets/stats");
      return response.data;
    },
  });

  if (isStatsError) {
    console.error("仪表盘统计加载失败:", statsError);
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">工单仪表盘</h3>
          <p className="text-sm text-muted-foreground">默认展示全部历史累计指标</p>
        </div>

        {isStatsPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <DashboardMetricSkeleton key={index} />
            ))}
          </div>
        ) : isStatsError ? (
          <Card className="border border-destructive/40 bg-destructive/10 shadow-sm">
            <CardHeader>
              <CardTitle>仪表盘统计加载失败</CardTitle>
              <CardDescription>
                {getErrorMessage(statsError, "首页统计暂时不可用，请稍后再试。")}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : statsData ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <DashboardMetric
                description="系统累计接收的全部工单"
                title="总表单数"
                value={String(statsData.totalTickets)}
              />
              <DashboardMetric
                description="当前处于 new、processing 或 open 的工单"
                title="Open Tickets"
                value={String(statsData.openTickets)}
              />
              <DashboardMetric
                description="由 AI 自动回复完成解决的工单"
                title="AI 解决的表单数量"
                value={String(statsData.aiResolvedTickets)}
              />
              <DashboardMetric
                description="AI 解决数占已解决工单总数的比例"
                title="AI 解决表单的百分比"
                value={formatPercentage(statsData.aiResolvedPercentage)}
              />
              <DashboardMetric
                description="从创建到解决的平均耗时"
                title="平均解决时间"
                value={formatAverageResolutionTime(statsData.averageResolutionMs)}
              />
            </div>

            <TicketVolumeChart data={statsData.ticketVolumeByDay} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
