import type { NextFunction, Request, Response } from "express";

import { UserRole } from "../generated/prisma";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req.user as { role?: string } | undefined)?.role;

  if (role !== UserRole.admin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
