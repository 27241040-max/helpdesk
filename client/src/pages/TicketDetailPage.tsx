import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeftIcon } from "lucide-react";
import {
  type TicketAssignableAgent,
  type TicketCategory,
  type TicketDetail,
  type TicketReplyPolishInput,
  type TicketReplyPolishResult,
  type TicketSummaryResult,
  TicketStatus,
  type TicketStatus as TicketStatusValue,
} from "core/email";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { FormDetails } from "@/components/tickets/FormDetails";
import { TicketDetailSkeleton } from "@/components/tickets/TicketDetailSkeleton";
import { shouldPollForTicketAutoClassification } from "@/components/tickets/ticket-display";
import { UpdateTicket } from "@/components/tickets/UpdateTicket";
import { Button } from "@/components/ui/button";

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

function getTicketReplyErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "提交回复失败，请稍后再试。";
  }

  return "提交回复失败，请稍后再试。";
}

function getTicketReplyPolishErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "润色回复失败，请稍后再试。";
  }

  return "润色回复失败，请稍后再试。";
}

function getTicketSummaryErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "生成摘要失败，请稍后再试。";
  }

  return "生成摘要失败，请稍后再试。";
}

export function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const queryClient = useQueryClient();
  const [assignmentDraft, setAssignmentDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<TicketStatusValue | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string | null>(null);
  const [summary, setSummary] = useState<TicketSummaryResult | null>(null);
  const [summaryErrorMessage, setSummaryErrorMessage] = useState<string | undefined>(undefined);

  const { data, isPending, isError, error } = useQuery({
    enabled: Boolean(ticketId),
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const response = await apiClient.get<TicketDetail>(`/api/tickets/${ticketId}`);
      return response.data;
    },
    refetchInterval: (query) =>
      query.state.data && shouldPollForTicketAutoClassification(query.state.data) ? 3_000 : false,
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

  const ticketReplyMutation = useMutation({
    mutationFn: async (input: { bodyText: string }) => {
      const response = await apiClient.post<TicketDetail>(`/api/tickets/${ticketId}/replies`, input);
      return response.data;
    },
    onSuccess: (updatedTicket) => {
      setSummary(null);
      setSummaryErrorMessage(undefined);
      queryClient.setQueryData(["ticket", ticketId], updatedTicket);
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const ticketReplyPolishMutation = useMutation({
    mutationFn: async (input: TicketReplyPolishInput) => {
      const response = await apiClient.post<TicketReplyPolishResult>(
        `/api/tickets/${ticketId}/replies/polish`,
        input,
      );
      return response.data;
    },
  });

  const ticketSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<TicketSummaryResult>(`/api/tickets/${ticketId}/summary`);
      return response.data;
    },
    onMutate: () => {
      setSummary(null);
      setSummaryErrorMessage(undefined);
    },
    onSuccess: (result) => {
      setSummary(result);
    },
    onError: (error) => {
      setSummaryErrorMessage(getTicketSummaryErrorMessage(error));
    },
  });

  useEffect(() => {
    setSummary(null);
    setSummaryErrorMessage(undefined);
  }, [ticketId]);

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
          <FormDetails
            data={data}
            onPolish={ticketReplyPolishMutation.mutateAsync}
            onReplySubmit={ticketReplyMutation.mutateAsync}
            onSummarize={() => {
              void ticketSummaryMutation.mutateAsync();
            }}
            polishErrorMessage={
              ticketReplyPolishMutation.isError
                ? getTicketReplyPolishErrorMessage(ticketReplyPolishMutation.error)
                : undefined
            }
            polishIsSubmitting={ticketReplyPolishMutation.isPending}
            replyErrorMessage={
              ticketReplyMutation.isError
                ? getTicketReplyErrorMessage(ticketReplyMutation.error)
                : undefined
            }
            replyIsSubmitting={ticketReplyMutation.isPending}
            summary={summary}
            summaryErrorMessage={summaryErrorMessage}
            summaryIsSubmitting={ticketSummaryMutation.isPending}
          />

          <UpdateTicket
            agents={agents}
            assignmentErrorMessage={
              assignmentMutation.isError
                ? getTicketAssignmentErrorMessage(assignmentMutation.error)
                : undefined
            }
            assignmentIsPending={assignmentMutation.isPending}
            assignmentValue={selectedAgentId}
            categoryValue={selectedCategory}
            onAssignmentChange={(nextAgentId) => {
              setAssignmentDraft(nextAgentId);

              if (nextAgentId === currentAssignedAgentId) {
                return;
              }

              void assignmentMutation.mutateAsync(
                nextAgentId === unassignedAgentValue ? null : nextAgentId,
              );
            }}
            onCategoryChange={(nextCategory) => {
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
            onStatusChange={(nextStatus) => {
              setStatusDraft(nextStatus as TicketStatusValue);

              if (nextStatus === currentStatus) {
                return;
              }

              void ticketUpdateMutation.mutateAsync({
                category: data.category,
                status: nextStatus as TicketStatusValue,
              });
            }}
            statusValue={selectedStatus}
            ticket={data}
            updateErrorMessage={
              ticketUpdateMutation.isError
                ? getTicketUpdateErrorMessage(ticketUpdateMutation.error)
                : undefined
            }
            updateIsPending={ticketUpdateMutation.isPending}
          />
        </article>
      ) : null}
    </section>
  );
}
