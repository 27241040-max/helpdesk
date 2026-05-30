import { TicketCategory, TicketStatus } from "../../generated/prisma";
import { prisma } from "../../prisma";
import { completeAgentRun, recordAgentStep, startAgentRun } from "./agent-trace";
import { classifyTicket } from "./classify-ticket";

type TicketClassificationCandidate = {
  bodyText: string;
  category: TicketCategory | null;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  id: number;
  subject: string;
};

async function getTicketClassificationCandidate(
  ticketId: number,
): Promise<TicketClassificationCandidate | null> {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      bodyText: true,
      category: true,
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

export async function processTicketAutoClassification(ticketId: number): Promise<void> {
  const ticket = await getTicketClassificationCandidate(ticketId);

  if (!ticket || ticket.category) {
    return;
  }

  const run = await startAgentRun({
    ticketId,
    workflow: "ticket-auto-classification",
    metadata: {
      orchestrator: "pg-boss",
      pattern: "single-agent-triage",
    },
  });

  try {
    const category = await classifyTicket(ticket);

    await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        category: null,
      },
      data: {
        category,
      },
    });

    await recordAgentStep({
      agentName: "TriageAgent",
      inputSummary: `Subject: ${ticket.subject}`,
      metadata: {
        category,
      },
      outputSummary: `工单已分类为 ${category}。`,
      runId: run.id,
      status: "completed",
      stepName: "classify_ticket",
    });
    await completeAgentRun({
      outcome: `classified:${category}`,
      runId: run.id,
      status: "completed",
    });
  } catch (error) {
    console.error(`工单 ${ticketId} 自动分类失败，状态回退为 open:`, error);

    await recordAgentStep({
      agentName: "TriageAgent",
      error,
      inputSummary: `Subject: ${ticket.subject}`,
      outputSummary: "分类失败，工单已转回人工队列。",
      runId: run.id,
      status: "failed",
      stepName: "classify_ticket",
    });
    await completeAgentRun({
      error,
      outcome: "manual_queue",
      runId: run.id,
      status: "failed",
    });

    await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        status: TicketStatus.new,
      },
      data: {
        status: TicketStatus.open,
      },
    });
  }
}
