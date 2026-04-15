import { ticketListQuerySchema, type TicketSortField, type TicketSortOrder } from "core/email";
import { Router } from "express";

import { Prisma } from "../generated/prisma";
import { getIssueMessage } from "../lib/validation";

import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

function getTicketOrderBy(
  sortBy: TicketSortField,
  sortOrder: TicketSortOrder,
): Prisma.TicketOrderByWithRelationInput {
  switch (sortBy) {
    case "subject":
      return { subject: sortOrder };
    case "customer":
      return { customer: { name: sortOrder } };
    case "status":
      return { status: sortOrder };
    case "category":
      return { category: sortOrder };
    case "createdAt":
      return { createdAt: sortOrder };
  }
}

ticketsRouter.get("/", async (req, res) => {
  const result = ticketListQuerySchema.safeParse(req.query);

  if (!result.success) {
    res.status(400).json({ error: getIssueMessage(result.error) });
    return;
  }

  const where: Prisma.TicketWhereInput = {
    ...(result.data.status ? { status: result.data.status } : {}),
    ...(result.data.category ? { category: result.data.category } : {}),
    ...(result.data.q
      ? {
          OR: [
            {
              subject: {
                contains: result.data.q,
                mode: "insensitive",
              },
            },
            {
              customer: {
                email: {
                  contains: result.data.q,
                  mode: "insensitive",
                },
              },
            },
            {
              customer: {
                name: {
                  contains: result.data.q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const pageSize = result.data.pageSize ?? 10;
  const page = result.data.page ?? 1;
  const skip = (page - 1) * pageSize;
  const sortBy = result.data.sortBy ?? "createdAt";
  const sortOrder = result.data.sortOrder ?? "desc";
  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      orderBy: [getTicketOrderBy(sortBy, sortOrder), { id: "desc" }],
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      skip,
      take: pageSize,
      where,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    tickets,
  });
});

ticketsRouter.get("/:id", async (req, res) => {
  const ticketId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    res.status(400).json({ error: "工单 ID 无效。" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      bodyText: true,
      status: true,
      category: true,
      source: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "工单不存在。" });
    return;
  }

  res.json(ticket);
});
