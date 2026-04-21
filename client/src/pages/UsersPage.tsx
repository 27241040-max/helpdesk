import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { UserRole, type CreateUserInput, type UpdateUserInput, type UserListItem } from "core/users";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { UsersTable } from "@/components/users/UsersTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

type UsersResponse = {
  users: UserListItem[];
};

type CreateUserResponse = { user: UserListItem };
type UpdateUserResponse = { user: UserListItem };
type DeleteUserResponse = { success: true };
type DialogState =
  | {
      error?: string;
      mode: "create";
      user: null;
    }
  | {
      error?: string;
      mode: "edit";
      user: UserListItem;
    }
  | {
      error?: string;
      mode: null;
      user: null;
    };
type DeleteDialogState = {
  error?: string;
  user: UserListItem | null;
};

function getUserFormErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallbackMessage;
  }

  return fallbackMessage;
}

function UsersTableSkeleton() {
  return (
    <div className="border-t border-border/70">
      <div className="grid grid-cols-6 gap-4 border-b border-border/70 px-1 py-3 text-sm">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="ml-auto h-4 w-8" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-6 items-center gap-4 border-b border-border/60 px-1 py-4 last:border-b-0"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ mode: null, user: null });
  const [del, setDel] = useState<DeleteDialogState>({ user: null });
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
      setDialog({ mode: null, user: null });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (mutationError) => {
      setDialog((current) => ({
        ...current,
        error: getUserFormErrorMessage(mutationError, "创建用户失败，请稍后再试。"),
      }));
    },
  });
  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      values,
    }: {
      userId: string;
      values: UpdateUserInput;
    }) => {
      const { password, ...rest } = values;
      const payload = password ? { ...rest, password } : rest;
      const response = await apiClient.patch<UpdateUserResponse>(`/api/users/${userId}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      setDialog({ mode: null, user: null });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (mutationError) => {
      setDialog((current) => ({
        ...current,
        error: getUserFormErrorMessage(mutationError, "保存失败，请稍后再试。"),
      }));
    },
  });
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.delete<DeleteUserResponse>(`/api/users/${userId}`);
      return response.data;
    },
    onSuccess: async () => {
      setDel({ user: null });
      queryClient.removeQueries({ queryKey: ["ticket"] });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["ticket-assignable-agents"] }),
      ]);
    },
    onError: (mutationError) => {
      setDel((current) => ({
        ...current,
        error: getUserFormErrorMessage(mutationError, "删除失败，请稍后再试。"),
      }));
    },
  });

  if (isError) {
    console.error("用户列表加载失败:", error);
  }

  const users = data?.users ?? [];
  const visibleUsers = users.filter((user) => !user.isSystemReserved);
  const isUserFormOpen = dialog.mode !== null;
  const isUserFormSubmitting =
    dialog.mode === "edit" ? updateUserMutation.isPending : createUserMutation.isPending;

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    setDialog({ mode: null, user: null });
    createUserMutation.reset();
    updateUserMutation.reset();
  };

  const handleCreateClick = () => {
    setDialog({ mode: "create", user: null });
  };

  const handleEditClick = (user: UserListItem) => {
    if (user.isSystemReserved) {
      return;
    }

    setDialog({ mode: "edit", user });
  };

  const handleDeleteClick = (user: UserListItem) => {
    if (user.role === UserRole.admin || user.isSystemReserved) {
      return;
    }

    setDel({ user });
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    setDel({ user: null });
    deleteUserMutation.reset();
  };

  const handleDeleteConfirm = async () => {
    if (!del.user) {
      return;
    }

    setDel((current) => ({ ...current, error: undefined }));
    try {
      await deleteUserMutation.mutateAsync(del.user.id);
    } catch {
      // Error state is surfaced through the mutation's onError handler.
    }
  };

  const onSubmit = async (values: CreateUserInput | UpdateUserInput) => {
    setDialog((current) => ({ ...current, error: undefined }));
    try {
      if (dialog.mode === "edit" && dialog.user) {
        await updateUserMutation.mutateAsync({
          userId: dialog.user.id,
          values: values as UpdateUserInput,
        });
        return;
      }

      await createUserMutation.mutateAsync(values as CreateUserInput);
    } catch {
      // Error state is surfaced through the mutation's onError handler.
    }
  };

  return (
    <>
      <section className="grid gap-6">
        <div className="grid gap-6 rounded-[30px] border border-border/80 bg-card/94 p-5 shadow-[0_18px_48px_rgba(62,48,34,0.08)] md:p-7">
          <div className="border-b border-border/70 pb-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <Badge className="w-fit uppercase" variant="secondary">
                Admin Only
              </Badge>
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground">Users</h2>
              <p className="text-[0.95rem] leading-6 text-muted-foreground">
                仅管理员可查看系统内的账号列表。这里展示当前用户的基础资料、角色和邮箱验证状态。
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">用户列表</h3>
                <p className="mt-1 text-sm text-muted-foreground">当前共 {visibleUsers.length} 个用户</p>
              </div>
              <Button className="min-w-32" onClick={handleCreateClick} type="button">
                <PlusIcon className="size-4" />
                创建用户
              </Button>
            </div>

            {isPending ? (
              <UsersTableSkeleton />
            ) : isError ? (
              <div className="border-t border-border/70 pt-4 text-sm text-destructive">
                用户列表加载失败，请稍后再试。
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
                暂无用户数据。
              </div>
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-border/75 bg-background/72">
                <UsersTable onDelete={handleDeleteClick} onEdit={handleEditClick} users={visibleUsers} />
              </div>
            )}
          </div>
        </div>
      </section>

      <UserFormDialog
        errorMessage={dialog.error}
        initialValues={
          dialog.mode === "edit"
            ? {
                email: dialog.user.email,
                name: dialog.user.name,
              }
            : undefined
        }
        isOpen={isUserFormOpen}
        isSubmitting={isUserFormSubmitting}
        mode={dialog.mode ?? "create"}
        onOpenChange={handleDialogOpenChange}
        onSubmit={onSubmit}
      />

      <DeleteUserDialog
        error={del.error}
        isOpen={del.user !== null}
        isSubmitting={deleteUserMutation.isPending}
        name={del.user?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeleteDialogOpenChange}
      />
    </>
  );
}
