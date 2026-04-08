import { Navigate } from "react-router";

import { authClient } from "../lib/auth-client";
import { Layout } from "./Layout";

function getSessionErrorMessage() {
  return "会话读取失败，请重新登录或稍后再试。";
}

export function ProtectionRount() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-700">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,135,102,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(208,111,64,0.12),transparent_28%)]"
        />
        <div className="relative grid min-h-screen place-items-center p-4 md:p-8">
          <div className="w-full max-w-[440px] rounded-[28px] border border-[rgba(30,62,46,0.12)] bg-[rgba(255,253,249,0.92)] p-8 text-left shadow-[0_16px_35px_rgba(20,40,33,0.1)] backdrop-blur-xl">
            <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-500">
              Authenticating
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
              正在验证登录状态
            </h1>
            <p className="mt-3 text-slate-500">请稍候，系统正在同步你的会话信息。</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f4efe7] text-slate-700">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,135,102,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(208,111,64,0.12),transparent_28%)]"
        />
        <div className="relative grid min-h-screen place-items-center p-4 md:p-8">
          <div className="w-full max-w-[440px] rounded-[28px] border border-[rgba(30,62,46,0.12)] bg-[rgba(255,253,249,0.92)] p-8 text-left shadow-[0_16px_35px_rgba(20,40,33,0.1)] backdrop-blur-xl">
            <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-500">
              Session Error
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
              会话读取失败
            </h1>
            <p className="mt-3 text-slate-500">{getSessionErrorMessage()}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const displayName = session.user.name?.trim() || session.user.email;
  const isAdmin = (session.user as { role?: string }).role === "admin";

  return <Layout displayName={displayName} isAdmin={isAdmin} />;
}
