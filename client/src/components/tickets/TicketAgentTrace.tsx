import type { TicketAgentRun } from "core/email";
import {
  BotIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  XCircleIcon,
} from "lucide-react";

import { formatTicketDate } from "@/components/tickets/ticket-display";

function getCategoryLabel(value: string) {
  switch (value) {
    case "general":
      return "一般咨询";
    case "technical":
      return "技术问题";
    case "refund_request":
      return "退款请求";
    default:
      return value;
  }
}

function getAgentNameLabel(agentName: string) {
  switch (agentName) {
    case "TriageAgent":
      return "分流 Agent";
    case "KnowledgeAgent":
      return "知识库 Agent";
    case "SupervisorAgent":
      return "监督 Agent";
    case "ActionAgent":
      return "执行 Agent";
    case "HandoffAgent":
      return "转人工 Agent";
    default:
      return agentName;
  }
}

function getAgentRunLabel(workflow: string) {
  switch (workflow) {
    case "ticket-auto-classification":
      return "自动分类";
    case "ticket-auto-resolution":
      return "自动处理";
    default:
      return workflow;
  }
}

function getOutcomeLabel(outcome: string | null, status: string) {
  switch (outcome) {
    case "auto_resolved":
      return "已自动解决";
    case "manual_queue:no_relevant_knowledge":
      return "知识库未命中，转人工";
    case "manual_queue:supervisor_declined":
      return "未满足自动处理条件，转人工";
    case "manual_queue:approval_required":
      return "需要人工审批";
    case "manual_queue:error":
      return "自动处理失败，转人工";
    default:
      if (outcome?.startsWith("classified:")) {
        return `已分类为 ${getCategoryLabel(outcome.replace("classified:", ""))}`;
      }

      return status === "completed" ? "已完成" : status;
  }
}

function getStepNameLabel(stepName: string) {
  switch (stepName) {
    case "classify_ticket":
      return "工单分类";
    case "retrieve_knowledge":
      return "检索知识库";
    case "decide_resolution":
      return "自动处理决策";
    case "send_reply_and_resolve":
      return "发送回复并解决";
    case "route_to_manual":
      return "转人工队列";
    case "handle_resolution_error":
      return "异常兜底";
    case "require_human_approval":
      return "人工审批";
    default:
      return stepName;
  }
}

function getOutputSummaryLabel(summary: string | null) {
  if (!summary) {
    return null;
  }

  const retrievedMatch = summary.match(/^Retrieved (\d+) relevant knowledge base source\(s\)\.$/);
  const classifiedMatch = summary.match(/^Classified ticket as (.+)\.$/);
  const localizedClassifiedMatch = summary.match(/^工单已分类为 (.+)。$/);

  if (retrievedMatch) {
    return `命中 ${retrievedMatch[1]} 条相关知识库内容。`;
  }

  if (classifiedMatch) {
    return `工单已分类为 ${getCategoryLabel(classifiedMatch[1] ?? "")}。`;
  }

  if (localizedClassifiedMatch) {
    return `工单已分类为 ${getCategoryLabel(localizedClassifiedMatch[1] ?? "")}。`;
  }

  switch (summary) {
    case "Knowledge base was sufficient for autonomous resolution.":
      return "知识库依据充分，允许自动处理。";
    case "Knowledge base was insufficient or ticket required manual handling.":
      return "知识库依据不足或该工单需要人工处理。";
    case "Sent customer reply and marked ticket resolved.":
      return "已发送客户回复，并将工单标记为已解决。";
    case "No relevant knowledge base chunks passed the distance threshold.":
      return "没有命中足够相关的知识库内容。";
    case "Ticket routed to manual queue because retrieval returned no usable sources.":
      return "因没有可用知识库来源，工单已转入人工队列。";
    case "Ticket returned to the manual queue for human handling.":
      return "工单已转回人工队列。";
    case "Automation failed; ticket returned to manual queue.":
      return "自动处理失败，工单已转入人工队列。";
    case "Refund-related ticket requires human approval before any customer-facing action.":
      return "退款相关工单需要人工审批后才能对客户执行操作。";
    default:
      return summary;
  }
}

function getAgentStatusIcon(status: string) {
  if (status === "completed") {
    return <CheckCircle2Icon className="size-4 text-emerald-600" />;
  }

  if (status === "failed") {
    return <XCircleIcon className="size-4 text-destructive" />;
  }

  return <CircleDashedIcon className="size-4 text-muted-foreground" />;
}

export function TicketAgentTrace({ runs }: { runs: TicketAgentRun[] }) {
  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="grid min-w-0 gap-3 pt-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-sm font-semibold text-card-foreground">Agent 轨迹</span>
          <span className="text-xs text-muted-foreground">自动处理步骤与决策依据</span>
        </div>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <BotIcon className="size-4" />
        </span>
      </div>

      <div className="grid gap-3">
        {runs.map((run) => (
          <div key={run.id} className="grid gap-3 border-l-2 border-border/80 pl-3">
            <div className="grid min-w-0 gap-1">
              <div className="flex min-w-0 items-center gap-2">
                {getAgentStatusIcon(run.status)}
                <span className="break-words text-sm font-medium text-card-foreground">
                  {getAgentRunLabel(run.workflow)}
                </span>
              </div>
              <span className="break-words text-xs text-muted-foreground">
                {getOutcomeLabel(run.outcome, run.status)} · {formatTicketDate(run.startedAt)}
              </span>
              {run.completedAt ? (
                <span className="text-xs text-muted-foreground">
                  完成于 {formatTicketDate(run.completedAt)}
                </span>
              ) : null}
            </div>

            <div className="grid gap-2">
              {run.steps.map((step) => {
                const outputSummary = getOutputSummaryLabel(step.outputSummary);

                return (
                  <div key={step.id} className="grid gap-1 border-l border-border/80 pl-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {getAgentStatusIcon(step.status)}
                      <span className="break-words text-sm font-medium text-card-foreground">
                        {getAgentNameLabel(step.agentName)}
                      </span>
                      <span className="break-words text-xs text-muted-foreground">
                        {getStepNameLabel(step.stepName)}
                      </span>
                    </div>
                    {outputSummary ? (
                      <p className="break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground">
                        {outputSummary}
                      </p>
                    ) : null}
                    {step.errorMessage ? (
                      <p className="break-words [overflow-wrap:anywhere] text-xs leading-5 text-destructive">
                        {step.errorMessage}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
