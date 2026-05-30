import { TicketCategory, TicketReplySource, TicketStatus } from "../../generated/prisma";
import { prisma } from "../../prisma";
import { getAiAgentUserOrThrow } from "../ai-agent";
import { sendTicketReplyEmail } from "../ticket-email";
import {
  formatKnowledgeBaseSourcesAsMarkdown,
  retrieveKnowledgeBaseSources,
} from "./knowledge-base-retrieval";
import { completeAgentRun, recordAgentStep, startAgentRun } from "./agent-trace";
import { resolveTicketWithKnowledgeBase } from "./resolve-ticket-with-knowledge-base";

type TicketAutoReplyCandidate = {
  assignedUserId: string | null;
  bodyText: string;
  category: TicketCategory | null;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  externalMessageId: string | null;
  id: number;
  status: TicketStatus;
  subject: string;
};

const aiAutoResolutionAuthorLabel = "AI Assistant";
type TicketMutationClient = Pick<typeof prisma, "ticket" | "ticketReply">;

function requiresHumanApproval(category: TicketCategory | null) {
  return category === TicketCategory.refund_request;
}

async function getTicketAutoReplyCandidate(ticketId: number): Promise<TicketAutoReplyCandidate | null> {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      assignedUserId: true,
      subject: true,
      bodyText: true,
      category: true,
      status: true,
      externalMessageId: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

async function updateCategoryIfMissing(
  ticketId: number,
  category: TicketCategory | null | undefined,
  tx: TicketMutationClient,
) {
  if (!category) {
    return;
  }

  await tx.ticket.updateMany({
    where: {
      id: ticketId,
      category: null,
    },
    data: {
      category,
    },
  });
}

async function finalizeTicketAsOpen(ticketId: number, category?: TicketCategory | null) {
  const aiAgent = await getAiAgentUserOrThrow();

  await prisma.$transaction(async (tx) => {
    await updateCategoryIfMissing(ticketId, category, tx);
    await tx.ticket.updateMany({
      where: {
        assignedUserId: aiAgent.id,
        id: ticketId,
        status: TicketStatus.processing,
      },
      data: {
        assignedUserId: null,
        status: TicketStatus.open,
      },
    });

    await tx.ticket.updateMany({
      where: {
        assignedUserId: {
          not: aiAgent.id,
        },
        id: ticketId,
        status: TicketStatus.processing,
      },
      data: {
        status: TicketStatus.open,
      },
    });
  });
}

async function finalizeTicketAsResolved(
  ticketId: number,
  category: TicketCategory | null,
  replyBodyText: string,
) {
  await prisma.$transaction(async (tx) => {
    await updateCategoryIfMissing(ticketId, category, tx);

    const updated = await tx.ticket.updateMany({
      where: {
        id: ticketId,
        status: TicketStatus.processing,
      },
      data: {
        resolvedAt: new Date(),
        status: TicketStatus.resolved,
      },
    });

    if (updated.count === 0) {
      return;
    }

    const existingAutoReply = await tx.ticketReply.findFirst({
      where: {
        ticketId,
        source: TicketReplySource.ai_auto_resolution,
      },
      select: { id: true },
    });

    if (existingAutoReply) {
      return;
    }

    await tx.ticketReply.create({
      data: {
        ticketId,
        authorLabel: aiAutoResolutionAuthorLabel,
        authorUserId: null,
        bodyText: replyBodyText,
        source: TicketReplySource.ai_auto_resolution,
      },
    });
  });
}

export async function processTicketAutoReply(ticketId: number): Promise<void> {
  const acquired = await prisma.ticket.updateMany({
    where: {
      id: ticketId,
      status: TicketStatus.new,
    },
    data: {
      status: TicketStatus.processing,
    },
  });

  if (acquired.count === 0) {
    return;
  }

  const ticket = await getTicketAutoReplyCandidate(ticketId);

  if (!ticket || ticket.status !== TicketStatus.processing) {
    return;
  }

  const run = await startAgentRun({
    ticketId,
    workflow: "ticket-auto-resolution",
    metadata: {
      orchestrator: "pg-boss",
      pattern: "knowledge-agent-supervisor-action",
    },
  });

  try {
    const sources = await retrieveKnowledgeBaseSources(
      [`工单主题: ${ticket.subject}`, `客户消息:\n${ticket.bodyText}`].join("\n\n"),
    );

    if (sources.length === 0) {
      await recordAgentStep({
        agentName: "KnowledgeAgent",
        inputSummary: `Subject: ${ticket.subject}`,
        outputSummary: "没有命中足够相关的知识库内容。",
        runId: run.id,
        status: "skipped",
        stepName: "retrieve_knowledge",
      });
      await finalizeTicketAsOpen(ticketId, ticket.category);
      await recordAgentStep({
        agentName: "SupervisorAgent",
        outputSummary: "因没有可用知识库来源，工单已转入人工队列。",
        runId: run.id,
        status: "completed",
        stepName: "route_to_manual",
      });
      await completeAgentRun({
        outcome: "manual_queue:no_relevant_knowledge",
        runId: run.id,
        status: "completed",
      });
      return;
    }

    await recordAgentStep({
      agentName: "KnowledgeAgent",
      inputSummary: `Subject: ${ticket.subject}`,
      metadata: {
        sourceCount: sources.length,
        sources: sources.map((source) => ({
          distance: source.distance,
          entryId: source.entryId,
          title: source.title,
        })),
      },
      outputSummary: `命中 ${sources.length} 条相关知识库内容。`,
      runId: run.id,
      status: "completed",
      stepName: "retrieve_knowledge",
    });

    const knowledgeBaseMarkdown = formatKnowledgeBaseSourcesAsMarkdown(sources);
    const result = await resolveTicketWithKnowledgeBase(ticket, knowledgeBaseMarkdown);

    await recordAgentStep({
      agentName: "SupervisorAgent",
      inputSummary: "Evaluate retrieved sources against ticket and decide whether autonomous resolution is allowed.",
      metadata: {
        category: result.category,
        shouldResolve: result.shouldResolve,
      },
      outputSummary: result.shouldResolve
        ? "知识库依据充分，允许自动处理。"
        : "知识库依据不足或该工单需要人工处理。",
      runId: run.id,
      status: "completed",
      stepName: "decide_resolution",
    });

    if (result.shouldResolve && result.replyBodyText) {
      if (requiresHumanApproval(result.category)) {
        await finalizeTicketAsOpen(ticketId, result.category);
        await recordAgentStep({
          agentName: "SupervisorAgent",
          metadata: {
            category: result.category,
            policy: "refund_request_requires_human_approval",
          },
          outputSummary: "退款相关工单需要人工审批后才能对客户执行操作。",
          runId: run.id,
          status: "completed",
          stepName: "require_human_approval",
        });
        await completeAgentRun({
          outcome: "manual_queue:approval_required",
          runId: run.id,
          status: "completed",
        });
        return;
      }

      await sendTicketReplyEmail({
        bodyText: result.replyBodyText,
        customer: ticket.customer,
        externalMessageId: ticket.externalMessageId,
        subject: ticket.subject,
      });
      await finalizeTicketAsResolved(ticketId, result.category, result.replyBodyText);
      await recordAgentStep({
        agentName: "ActionAgent",
        metadata: {
          category: result.category,
          replyCharacterCount: result.replyBodyText.length,
        },
        outputSummary: "已发送客户回复，并将工单标记为已解决。",
        runId: run.id,
        status: "completed",
        stepName: "send_reply_and_resolve",
      });
      await completeAgentRun({
        outcome: "auto_resolved",
        runId: run.id,
        status: "completed",
      });
      return;
    }

    await finalizeTicketAsOpen(ticketId, result.category);
    await recordAgentStep({
      agentName: "HandoffAgent",
      metadata: {
        category: result.category,
      },
      outputSummary: "工单已转回人工队列。",
      runId: run.id,
      status: "completed",
      stepName: "route_to_manual",
    });
    await completeAgentRun({
      outcome: "manual_queue:supervisor_declined",
      runId: run.id,
      status: "completed",
    });
  } catch (error) {
    console.error(`工单 ${ticketId} 知识库自动回复失败:`, error);
    await recordAgentStep({
      agentName: "SupervisorAgent",
      error,
      outputSummary: "自动处理失败，工单已转入人工队列。",
      runId: run.id,
      status: "failed",
      stepName: "handle_resolution_error",
    });
    await finalizeTicketAsOpen(ticketId, ticket.category);
    await completeAgentRun({
      error,
      outcome: "manual_queue:error",
      runId: run.id,
      status: "failed",
    });
  }
}
