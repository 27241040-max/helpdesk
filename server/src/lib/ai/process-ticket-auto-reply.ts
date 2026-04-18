import { TicketCategory, TicketReplySource, TicketStatus } from "../../generated/prisma";
import { prisma } from "../../prisma";
import { getAiAgentUserOrThrow } from "../ai-agent";
import { readKnowledgeBaseMarkdown, resolveTicketWithKnowledgeBase } from "./resolve-ticket-with-knowledge-base";

type TicketAutoReplyCandidate = {
  assignedUserId: string | null;
  bodyText: string;
  category: TicketCategory | null;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  id: number;
  status: TicketStatus;
  subject: string;
};

const aiAutoResolutionAuthorLabel = "AI Assistant";
type TicketMutationClient = Pick<typeof prisma, "ticket" | "ticketReply">;

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

  try {
    const knowledgeBaseMarkdown = await readKnowledgeBaseMarkdown();
    const result = await resolveTicketWithKnowledgeBase(ticket, knowledgeBaseMarkdown);

    if (result.shouldResolve && result.replyBodyText) {
      await finalizeTicketAsResolved(ticketId, result.category, result.replyBodyText);
      return;
    }

    await finalizeTicketAsOpen(ticketId, result.category);
  } catch (error) {
    console.error(`工单 ${ticketId} 知识库自动回复失败:`, error);
    await finalizeTicketAsOpen(ticketId, ticket.category);
  }
}
