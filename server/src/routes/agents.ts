import { Router } from "express";

import { requireAuth } from "../middleware/require-auth";
import { prisma } from "../prisma";

export const agentsRouter = Router();

agentsRouter.use(requireAuth);

agentsRouter.get("/", async (_req, res) => {
  const agents = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
    },
    where: {
      deletedAt: null,
      role: "agent",
    },
  });

  res.json({ agents });
});
