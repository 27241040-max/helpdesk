import { TicketCategory } from "../../generated/prisma";
import { prisma } from "../../prisma";
import { classifyTicket } from "./classify-ticket";

const autoClassificationDelayMs = 0;

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

export async function runTicketAutoClassification(ticketId: number): Promise<void> {
  const ticket = await getTicketClassificationCandidate(ticketId);

  if (!ticket || ticket.category) {
    return;
  }

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
}

export function scheduleTicketAutoClassification(ticketId: number): void {
  setTimeout(async () => {
    try {
      await runTicketAutoClassification(ticketId);
    } catch (error) {
      console.error(`工单 ${ticketId} 自动分类失败:`, error);
    }
  }, autoClassificationDelayMs);
}
