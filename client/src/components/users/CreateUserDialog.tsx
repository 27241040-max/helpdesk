 import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "core/users";
import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateUserDialogProps = {
  errorMessage?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateUserInput) => Promise<void>;
};

export function CreateUserDialog({
  errorMessage,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CreateUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新用户</DialogTitle>
          <DialogDescription>
            输入姓名、邮箱和初始密码后，系统会创建一个默认角色为 agent 的新账号。
          </DialogDescription>
        </DialogHeader>

        <form className="mt-6 grid gap-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="create-user-name">姓名</Label>
            <Input
              id="create-user-name"
              aria-invalid={errors.name ? "true" : "false"}
              autoComplete="name"
              className="h-11"
              placeholder="请输入姓名"
              {...register("name")}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-user-email">电子邮件</Label>
            <Input
              id="create-user-email"
              aria-invalid={errors.email ? "true" : "false"}
              autoComplete="email"
              className="h-11"
              placeholder="user@example.com"
              type="email"
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-user-password">密码</Label>
            <Input
              id="create-user-password"
              aria-invalid={errors.password ? "true" : "false"}
              autoComplete="new-password"
              className="h-11"
              placeholder="请输入至少 8 位密码"
              type="password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>创建失败</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建用户"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
