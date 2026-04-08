import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return "登录失败，请稍后再试。";
}

function LoginStatusCard() {
  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LoaderCircleIcon className="size-5 animate-spin" />
          </div>
          <div className="space-y-1">
            <CardTitle>正在检查登录状态</CardTitle>
            <CardDescription>请稍候，系统正在恢复你的会话。</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,theme(colors.primary/8%),transparent_34%),linear-gradient(to_bottom,theme(colors.background),theme(colors.muted/35%))] px-4 py-10 text-foreground md:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
          <LoginStatusCard />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,theme(colors.primary/8%),transparent_34%),linear-gradient(to_bottom,theme(colors.background),theme(colors.muted/35%))] px-4 py-10 text-foreground md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="flex w-full justify-center">
          <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div>
                  <CardTitle>邮箱密码登录</CardTitle>
                  <CardDescription>输入账号信息后进入控制台。</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form className="grid gap-5" noValidate onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-2">
                  <Label htmlFor="email">邮箱</Label>
                  <div className="relative">
                    <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      aria-invalid={errors.email ? "true" : "false"}
                      autoComplete="email"
                      className="h-11 pl-9"
                      placeholder="admin@example.com"
                      type="email"
                      {...register("email")}
                    />
                  </div>
                  {errors.email ? (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <LockKeyholeIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      aria-invalid={errors.password ? "true" : "false"}
                      autoComplete="current-password"
                      className="h-11 pl-9"
                      placeholder="请输入密码"
                      type="password"
                      {...register("password")}
                    />
                  </div>
                  {errors.password ? (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  ) : null}
                </div>

                {errors.root?.message ? (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="size-4" />
                    <AlertTitle>登录失败</AlertTitle>
                    <AlertDescription>{errors.root.message}</AlertDescription>
                  </Alert>
                ) : null}

                <Button className="h-11 w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <>
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    "登录并进入主页"
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center text-center text-sm text-muted-foreground">
              受保护页面仅对已登录用户开放。
            </CardFooter>
          </Card>
        </section>
      </div>
    </main>
  );
}
