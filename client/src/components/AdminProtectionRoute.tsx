import { Navigate, Outlet } from "react-router";

import { authClient } from "../lib/auth-client";

export function AdminProtectionRoute() {
  const { data: session, isPending, error } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (isPending) {
    return null;
  }

  if (error || !session) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
