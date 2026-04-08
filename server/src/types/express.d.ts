import type { auth } from "../auth";

type AuthSession = typeof auth.$Infer.Session;
type AuthUser = typeof auth.$Infer.Session.user;

declare global {
  namespace Express {
    interface Request {
      session?: AuthSession["session"];
      user?: AuthUser;
    }
  }
}

export {};
