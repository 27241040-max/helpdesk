import type {
  TicketDetail as TicketDetailData,
  TicketSummaryResult,
} from "core/email";
import { SparklesIcon, UserRoundIcon } from "lucide-react";

import { formatTicketDate, getTicketStatusLabel } from "@/components/tickets/ticket-display";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";

type TicketDetailProps = {
  isSummarizing: boolean;
  onSummarize: () => void;
  summary: TicketSummaryResult | null;
  summaryErrorMessage?: string;
  ticket: TicketDetailData;
};

export function TicketDetail({
  isSummarizing,
  onSummarize,
  summary,
  summaryErrorMessage,
  ticket,
}: TicketDetailProps) {
  const replies = ticket.replies ?? [];
  const wasAutoResolved = replies.some((reply) => reply.source === "ai_auto_resolution");

  return (
    <>
      <div className="grid min-w-0 gap-4 border-b border-border/70 pb-5">
        <div className="grid min-w-0 gap-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.22em] text-primary">
            工单信息
          </span>
          <h2 className="break-words text-3xl font-semibold tracking-[-0.05em] text-card-foreground">
            {ticket.subject}
          </h2>
          <p className="text-sm text-muted-foreground">工单 #{ticket.id}</p>
        </div>

        <div className="grid min-w-0 gap-2 text-sm md:grid-cols-2">
          <p className="break-words [overflow-wrap:anywhere] text-card-foreground">
            <span className="text-muted-foreground">客户:</span>{" "}
            {ticket.customer.name} ({ticket.customer.email})
          </p>
          <p className="break-words [overflow-wrap:anywhere] text-card-foreground">
            <span className="text-muted-foreground">当前状态:</span>{" "}
            {getTicketStatusLabel(ticket.status)}
          </p>
          <p className="break-words [overflow-wrap:anywhere] text-card-foreground">
            <span className="text-muted-foreground">创建时间:</span>{" "}
            {formatTicketDate(ticket.createdAt)}
          </p>
          <p className="break-words [overflow-wrap:anywhere] text-card-foreground">
            <span className="text-muted-foreground">更新时间:</span>{" "}
            {formatTicketDate(ticket.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 border-b border-border/70 py-5">
        <span className="text-base font-semibold text-card-foreground">
          正文
        </span>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <UserRoundIcon className="size-4" />
          </span>
          <span className="break-words [overflow-wrap:anywhere] text-sm text-muted-foreground">
            来自 {ticket.customer.name}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-card-foreground">
          {ticket.bodyText}
        </p>

        {ticket.status === "resolved" && wasAutoResolved ? (
          <p className="border-l-2 border-primary/50 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            该工单已由知识库自动处理，并已生成系统回复。
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={isSummarizing}
            onClick={onSummarize}
            type="button"
            variant="outline"
          >
            <SparklesIcon className="size-4" />
            {isSummarizing ? "正在生成摘要..." : "生成摘要"}
          </Button>
          <span className="text-xs text-muted-foreground">
            基于正文和回复历史即时重新生成摘要
          </span>
        </div>

        {summaryErrorMessage ? (
          <ErrorMessage>{summaryErrorMessage}</ErrorMessage>
        ) : null}

        {summary ? (
          <div className="grid gap-2 border-l-2 border-border bg-background/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-card-foreground">
                摘要
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTicketDate(summary.generatedAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-card-foreground">
              {summary.bodyText}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
