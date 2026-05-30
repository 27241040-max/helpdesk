import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { appBrandLinkClass, getAppNavLinkClass } from "@/lib/link-styles";

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
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 px-3 py-3 md:px-5 md:py-5">
        <header className="overflow-hidden rounded-[30px] border border-black/10 bg-panel text-panel-foreground shadow-[0_22px_60px_rgba(34,31,28,0.16)]">
          <div className="px-5 py-4 md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                <NavLink className={appBrandLinkClass} to="/">
                  <span className="inline-flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-sm font-semibold tracking-[0.24em] text-brand">
                    HD
                  </span>
                  <span className="flex flex-col">
                    <span>Helpdesk</span>
                    <span className="text-xs font-medium tracking-[0.24em] text-panel-foreground/55 uppercase">
                      Editorial Ops Console
                    </span>
                  </span>
                </NavLink>
                <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
              <NavLink
                className={({ isActive }) => getAppNavLinkClass(isActive)}
                to="/tickets"
              >
                工单
              </NavLink>
              {isAdmin ? (
                <>
                  <NavLink
                    className={({ isActive }) => getAppNavLinkClass(isActive)}
                    to="/knowledge-base"
                  >
                    知识库
                  </NavLink>
                  <NavLink
                    className={({ isActive }) => getAppNavLinkClass(isActive)}
                    to="/users"
                  >
                    用户
                  </NavLink>
                </>
              ) : null}
            </nav>
          </div>
              <div className="flex items-center gap-3 rounded-full border border-white/12 bg-white/7 px-3 py-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-semibold tracking-[0.18em] text-brand-foreground">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="block text-[0.68rem] uppercase tracking-[0.22em] text-panel-muted">
                    当前用户
                  </span>
                  <strong className="mt-0.5 block text-sm text-panel-foreground">{displayName}</strong>
                </div>
                <Button
                  className="rounded-full border-white/14 bg-white/8 text-panel-foreground hover:bg-white/14"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOut();
                  }}
                  type="button"
                  variant="outline"
                >
                  {isSigningOut ? "退出中..." : "退出"}
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
