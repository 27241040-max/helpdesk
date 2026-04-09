import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { type CreateUserInput } from "core/users";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersTable, type UserListItem } from "@/components/users/UsersTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

type UsersResponse = {
  users: UserListItem[];
};

type CreateUserResponse = { user: UserListItem };

function getCreateUserErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? "创建用户失败，请稍后再试。";
  }

  return "创建用户失败，请稍后再试。";
}

function UsersTableSkeleton() {
  return (
    <div className="px-4 pb-4 md:px-6">
      <div className="rounded-xl border border-border/70">
        <div className="grid grid-cols-5 gap-4 border-b border-border bg-muted/20 px-4 py-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>

        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-5 items-center gap-4 border-b border-border/70 px-4 py-4 last:border-b-0"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createUserErrorMessage, setCreateUserErrorMessage] = useState<string>();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/api/users");
      return response.data;
    },
  });
  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserInput) => {
      const response = await apiClient.post<CreateUserResponse>("/api/users", values);
      return response.data;
    },
    onSuccess: async () => {
      setCreateUserErrorMessage(undefined);
      setIsCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (mutationError) => {
      setCreateUserErrorMessage(getCreateUserErrorMessage(mutationError));
    },
  });

  if (isError) {
    console.error("用户列表加载失败:", error);
  }

  const users = data?.users ?? [];

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);

    if (!open) {
      createUserMutation.reset();
      setCreateUserErrorMessage(undefined);
    }
  };

  const onSubmit = async (values: CreateUserInput) => {
    setCreateUserErrorMessage(undefined);
    try {
      await createUserMutation.mutateAsync(values);
    } catch {
      // Error state is surfaced through the mutation's onError handler.
    }
  };

  return (
    <>
      <section className="grid gap-6">
        <Card className="gap-0 rounded-2xl">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <Badge className="w-fit uppercase" variant="secondary">
                Admin Only
              </Badge>
              <CardTitle className="text-[1.55rem] font-semibold tracking-[-0.04em]">
                Users
              </CardTitle>
              <CardDescription className="text-[0.95rem] leading-6">
                仅管理员可查看系统内的账号列表。这里展示当前用户的基础资料、角色和邮箱验证状态。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-card-foreground">用户列表</h3>
                <p className="mt-1 text-sm text-muted-foreground">当前共 {users.length} 个用户</p>
              </div>
              <Button className="min-w-32" onClick={() => setIsCreateDialogOpen(true)} type="button">
                <PlusIcon className="size-4" />
                创建用户
              </Button>
            </div>
          </CardContent>

          {isPending ? (
            <UsersTableSkeleton />
          ) : isError ? (
            <CardContent className="pb-6 pt-2 text-sm text-destructive">
              用户列表加载失败，请稍后再试。
            </CardContent>
          ) : users.length === 0 ? (
            <CardContent className="pb-6 pt-2 text-sm text-muted-foreground">
              暂无用户数据。
            </CardContent>
          ) : (
            <div className="px-4 pb-4 md:px-6">
              <UsersTable users={users} />
            </div>
          )}
        </Card>
      </section>

      <CreateUserDialog
        errorMessage={createUserErrorMessage}
        isOpen={isCreateDialogOpen}
        isSubmitting={createUserMutation.isPending}
        onOpenChange={handleDialogOpenChange}
        onSubmit={onSubmit}
      />
    </>
  );
}
