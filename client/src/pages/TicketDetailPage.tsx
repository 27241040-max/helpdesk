import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeftIcon } from "lucide-react";
import {
  type TicketAssignableAgent,
  type TicketCategory,
  type TicketDetail,
  TicketStatus,
  type TicketStatus as TicketStatusValue,
} from "core/email";
import { type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";

import {
  formatTicketDate,
  getTicketCategoryLabel,
  getTicketStatusLabel,
  ticketCategoryOptions,
  ticketStatusOptions,
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
const uncategorizedValue = "__uncategorized__";

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

function getTicketUpdateErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "更新工单失败，请稍后再试。";
  }

  return "更新工单失败，请稍后再试。";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm text-card-foreground">{value}</div>
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_240px] lg:items-start lg:gap-8">
      <div className="grid gap-5">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-2">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid gap-2 rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-[92%]" />
          <Skeleton className="h-6 w-[78%]" />
        </div>
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="grid gap-1" key={index}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const queryClient = useQueryClient();
  const [assignmentDraft, setAssignmentDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<TicketStatusValue | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string | null>(null);

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

  const ticketUpdateMutation = useMutation({
    mutationFn: async (input: { category: TicketCategory | null; status: TicketStatusValue }) => {
      const response = await apiClient.patch<TicketDetail>(`/api/tickets/${ticketId}`, input);
      return response.data;
    },
    onSuccess: (updatedTicket) => {
      setStatusDraft(null);
      setCategoryDraft(null);
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
  const currentStatus = data?.status ?? TicketStatus.open;
  const currentCategoryValue = data?.category ?? uncategorizedValue;
  const selectedStatus = statusDraft ?? currentStatus;
  const selectedCategory = categoryDraft ?? currentCategoryValue;

  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-2">
      <div>
        <Button asChild className="-ml-2 text-muted-foreground" type="button" variant="ghost">
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
        <article className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_160px] lg:items-start lg:gap-8">
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-card-foreground">
                {data.subject}
              </h2>
              <p className="text-sm text-muted-foreground">工单 #{data.id}</p>
            </div>

            <div className="grid gap-2 text-sm">
              <p className="text-card-foreground">
                <span className="text-muted-foreground">客户:</span>{" "}
                {data.customer.name} ({data.customer.email})
              </p>
              <p className="text-card-foreground">
                <span className="text-muted-foreground">创建时间:</span>{" "}
                {formatTicketDate(data.createdAt)}
              </p>
              <p className="text-card-foreground">
                <span className="text-muted-foreground">更新时间:</span>{" "}
                {formatTicketDate(data.updatedAt)}
              </p>
            </div>

            <div className="grid gap-3 rounded-[20px] border border-border/70 bg-card p-5 shadow-sm">
              <span className="text-base font-semibold text-card-foreground">正文</span>
              <span className="text-sm text-muted-foreground">来自 {data.customer.name}</span>
              <p className="whitespace-pre-wrap text-sm leading-7 text-card-foreground">{data.bodyText}</p>
            </div>
          </div>

          <aside className="grid gap-4 lg:pt-1">
            <DetailItem
              label="状态"
              value={
                <Select
                  disabled={ticketUpdateMutation.isPending}
                  onValueChange={(nextStatus) => {
                    setStatusDraft(nextStatus as TicketStatusValue);

                    if (nextStatus === currentStatus) {
                      return;
                    }

                    void ticketUpdateMutation.mutateAsync({
                      category: data.category,
                      status: nextStatus as TicketStatusValue,
                    });
                  }}
                  value={selectedStatus}
                >
                  <SelectTrigger aria-label="状态" className="h-9 w-full min-w-0 bg-background px-3">
                    <SelectValue placeholder={getTicketStatusLabel(data.status)} />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <DetailItem
              label="类别"
              value={
                <Select
                  disabled={ticketUpdateMutation.isPending}
                  onValueChange={(nextCategory) => {
                    setCategoryDraft(nextCategory);

                    if (nextCategory === currentCategoryValue) {
                      return;
                    }

                    void ticketUpdateMutation.mutateAsync({
                      category:
                        nextCategory === uncategorizedValue ? null : (nextCategory as TicketCategory),
                      status: data.status,
                    });
                  }}
                  value={selectedCategory}
                >
                  <SelectTrigger aria-label="类别" className="h-9 w-full min-w-0 bg-background px-3">
                    <SelectValue placeholder={getTicketCategoryLabel(data.category)} />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketCategoryOptions.map((option) => (
                      <SelectItem
                        key={option.value ?? uncategorizedValue}
                        value={option.value ?? uncategorizedValue}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <DetailItem
              label="指派给"
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
                    <SelectTrigger aria-label="指派给" className="h-9 w-full min-w-0 bg-background px-3">
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
          </aside>

          {ticketUpdateMutation.isError ? (
            <p className="text-sm text-destructive lg:col-span-2">
              {getTicketUpdateErrorMessage(ticketUpdateMutation.error)}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
