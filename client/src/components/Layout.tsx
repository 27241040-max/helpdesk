import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

import { authClient } from "../lib/auth-client";

type LayoutProps = {
  displayName: string;
  isAdmin: boolean;
};

export function Layout({ displayName, isAdmin }: LayoutProps) {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    const { error } = await authClient.signOut();
    setIsSigningOut(false);

    if (!error) {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col gap-3 p-3 md:p-4">
        <header className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <NavLink
              className="text-xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 md:text-2xl"
              to="/"
            >
              Helpdesk
            </NavLink>
            <nav aria-label="Primary" className="flex items-center gap-2">
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
                to="/tickets"
              >
                工单
              </NavLink>
              {isAdmin ? (
                <NavLink
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                  to="/users"
                >
                  用户
                </NavLink>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-1.5">
            <div>
              <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
                当前用户
              </span>
              <strong className="mt-1 block text-foreground">{displayName}</strong>
            </div>
            <Button
              disabled={isSigningOut}
              onClick={() => {
                void handleSignOut();
              }}
              type="button"
            >
              {isSigningOut ? "退出中..." : "退出"}
            </Button>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
