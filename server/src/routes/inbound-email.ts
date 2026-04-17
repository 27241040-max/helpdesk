import { inboundEmailSchema, type InboundEmailInput } from "core/email";
import { Router } from "express";

import { getOptionalEnv } from "../config";
import { TicketCategory, TicketStatus } from "../generated/prisma";
import { scheduleTicketAutoClassification } from "../lib/ai/ticket-auto-classification";
import { getIssueMessage } from "../lib/validation";
import { prisma } from "../prisma";

export const inboundEmailRouter = Router();
const inboundEmailSecret = getOptionalEnv("INBOUND_EMAIL_SECRET");

function normalizeCategory(category: InboundEmailInput["category"]) {
  if (!category) {
    return undefined;
  }

  switch (category) {
    case "general":
      return TicketCategory.general;
    case "technical":
      return TicketCategory.technical;
    case "refund_request":
      return TicketCategory.refund_request;
  }
}

inboundEmailRouter.post("/", async (req, res) => {
  if (!inboundEmailSecret) {
    res.status(500).json({ error: "Inbound email secret is not configured." });
    return;
  }

  const providedSecret = req.header("x-inbound-email-secret")?.trim();

  if (!providedSecret || providedSecret !== inboundEmailSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = inboundEmailSchema.safeParse(req.body ?? {});

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const messageId = result.data.messageId?.trim();

  if (messageId) {
    const existing = await prisma.ticket.findUnique({
      where: {
        externalMessageId: messageId,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      res.json({ created: false, ticketId: existing.id });
      return;
    }
  }

  const email = result.data.from.email.toLowerCase();
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      email,
    },
  });
  const customer = existingCustomer
    ? existingCustomer.name === result.data.from.name
      ? existingCustomer
      : await prisma.customer.update({
          where: {
            id: existingCustomer.id,
          },
          data: {
            name: result.data.from.name,
          },
        })
    : await prisma.customer.create({
        data: {
          email,
          name: result.data.from.name,
        },
      });

  const ticket = await prisma.ticket.create({
    data: {
      bodyText: result.data.text,
      category: normalizeCategory(result.data.category),
      customerId: customer.id,
      externalMessageId: messageId,
      source: "email",
      status: TicketStatus.open,
      subject: result.data.subject,
    },
    select: {
      id: true,
      category: true,
    },
  });

  res.status(201).json({ created: true, ticketId: ticket.id });

  if (!ticket.category) {
    scheduleTicketAutoClassification(ticket.id);
  }
});
