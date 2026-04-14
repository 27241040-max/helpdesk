import { Router } from "express";

import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    orderBy: {
      createdAt: "desc",
    },
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
  });

  res.json({ tickets });
});
