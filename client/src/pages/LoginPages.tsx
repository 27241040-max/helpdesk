import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "../lib/auth-client";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "请输入邮箱")
    .email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(1, "请输入密码")
    .min(6, "密码至少需要 6 个字符"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getLoginErrorMessage(error: { message?: string; status?: number } | null) {
  if (!error) {
    return "登录失败，请稍后再试。";
  }

  const normalizedMessage = error.message?.trim().toLowerCase();

  if (error.status === 401 || normalizedMessage === "invalid email or password") {
    return "邮箱或密码错误。";
  }

  return error.message || "登录失败，请稍后再试。";
}

export function LoginPages() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (!isPending && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    clearErrors("root");
    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError("root", {
        type: "server",
        message: getLoginErrorMessage(error),
      });
      return;
    }

    navigate("/", { replace: true });
  };

  if (isPending) {
    return (
      <main className="shell shell--centered">
        <div className="panel panel--loading">
          <p className="eyebrow">Loading</p>
          <h1>正在检查现有登录状态</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="shell shell--centered">
      <section className="auth-layout">
        <div className="panel auth-card">
          <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="auth-form__header">
              <p className="eyebrow">Secure Access</p>
              <h2>邮箱密码登录</h2>
              <p className="muted">使用已有账号登录后将直接跳转到主页。</p>
            </div>

            <label className="field">
              <span>邮箱</span>
              <input
                autoComplete="email"
                className={errors.email ? "field-input field-input--error" : "field-input"}
                placeholder="admin@example.com"
                type="email"
                {...register("email")}
              />
            </label>
            {errors.email ? <p className="field-error">{errors.email.message}</p> : null}

            <label className="field">
              <span>密码</span>
              <input
                autoComplete="current-password"
                className={
                  errors.password ? "field-input field-input--error" : "field-input"
                }
                placeholder="请输入密码"
                type="password"
                {...register("password")}
              />
            </label>
            {errors.password ? (
              <p className="field-error">{errors.password.message}</p>
            ) : null}

            {errors.root?.message ? <p className="form-error">{errors.root.message}</p> : null}

            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "登录中..." : "登录并进入主页"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
