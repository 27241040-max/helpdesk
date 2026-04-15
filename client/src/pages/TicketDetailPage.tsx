import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeftIcon } from "lucide-react";
import { type TicketAssignableAgent, type TicketDetail } from "core/email";
import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";

import {
  formatTicketDate,
  getTicketCategoryLabel,
  TicketStatusBadge,
} from "@/components/tickets/ticket-display";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

const unassignedAgentValue = "__unassigned__";

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

function getTicketAssignmentErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "分配代理失败，请稍后再试。";
  }

  return "分配代理失败，请稍后再试。";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1.5 content-start">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">{label}</span>
      <div className="text-sm text-card-foreground">{value}</div>
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid gap-4 border-t border-border/70 pt-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid gap-2" key={index}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-[85%]" />
            </div>
          ))}
        </div>
        <div className="grid gap-2 rounded-[24px] border border-border/70 bg-muted/20 p-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-[92%]" />
          <Skeleton className="h-6 w-[78%]" />
        </div>
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const queryClient = useQueryClient();
  const [assignmentDraft, setAssignmentDraft] = useState<string | null>(null);
  const { data, isPending, isError, error } = useQuery({
    enabled: Boolean(ticketId),
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const response = await apiClient.get<TicketDetail>(`/api/tickets/${ticketId}`);
      return response.data;
    },
  });
  const { data: agentsData } = useQuery({
    queryKey: ["ticket-assignable-agents"],
    queryFn: async () => {
      const response = await apiClient.get<{ agents: TicketAssignableAgent[] }>("/api/agents");
      return response.data;
    },
    retry: false,
  });
  const assignmentMutation = useMutation({
    mutationFn: async (assignedUserId: string | null) => {
      const response = await apiClient.patch<TicketDetail>(`/api/tickets/${ticketId}/assignment`, {
        assignedUserId,
      });
      return response.data;
    },
    onSuccess: (updatedTicket) => {
      setAssignmentDraft(null);
      queryClient.setQueryData(["ticket", ticketId], updatedTicket);
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (isError) {
    console.error("工单详情加载失败:", error);
  }

  const errorState = isError ? getTicketDetailErrorState(error) : null;
  const agents = agentsData?.agents ?? [];
  const currentAssignedAgentId = data?.assignedUser?.id ?? "";
  const selectedAgentId =
    (assignmentDraft ?? currentAssignedAgentId) || unassignedAgentValue;

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
        <article className="grid gap-8">
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

          <div className="border-t border-border/70 pt-6">
            <div className="mx-auto grid max-w-6xl gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                label="客户"
                value={<strong>{data.customer.name}</strong>}
              />
              <DetailItem label="客户邮箱" value={data.customer.email} />
              <DetailItem
                label="指派人"
                value={
                  <div className="grid gap-2">
                    <Select
                      disabled={assignmentMutation.isPending}
                      onValueChange={(nextAgentId) => {
                        setAssignmentDraft(nextAgentId);

                        if (nextAgentId === currentAssignedAgentId) {
                          return;
                        }

                        void assignmentMutation.mutateAsync(
                          nextAgentId === unassignedAgentValue ? null : nextAgentId,
                        );
                      }}
                      value={selectedAgentId}
                    >
                      <SelectTrigger aria-label="指派人">
                        <SelectValue placeholder="未指派" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={unassignedAgentValue}>未指派</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignmentMutation.isError ? (
                      <p className="text-sm text-destructive">
                        {getTicketAssignmentErrorMessage(assignmentMutation.error)}
                      </p>
                    ) : null}
                  </div>
                }
              />
              <DetailItem label="来源" value={data.source} />
              <DetailItem label="创建时间" value={formatTicketDate(data.createdAt)} />
              <DetailItem label="更新时间" value={formatTicketDate(data.updatedAt)} />
            </div>
          </div>

          <div className="grid gap-2 rounded-[24px] border border-border/70 bg-muted/20 p-5 shadow-sm">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">正文</span>
            <p className="whitespace-pre-wrap text-sm leading-7 text-card-foreground">{data.bodyText}</p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
