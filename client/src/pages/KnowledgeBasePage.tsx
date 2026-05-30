import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  createKnowledgeBaseEntrySchema,
  type CreateKnowledgeBaseEntryInput,
  type KnowledgeBaseEntryListItem,
  type UpdateKnowledgeBaseEntryInput,
} from "core/knowledge-base";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { apiClient } from "../lib/api-client";

type KnowledgeBaseResponse = {
  entries: KnowledgeBaseEntryListItem[];
};
type KnowledgeBaseEntryResponse = {
  entry: KnowledgeBaseEntryListItem;
};
type DeleteKnowledgeBaseEntryResponse = {
  success: true;
};
type DialogState =
  | {
      entry: KnowledgeBaseEntryListItem;
      error?: string;
      mode: "edit";
    }
  | {
      entry: null;
      error?: string;
      mode: "create";
    }
  | {
      entry: null;
      error?: string;
      mode: null;
    };

type DeleteDialogState = {
  entry: KnowledgeBaseEntryListItem | null;
  error?: string;
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? fallbackMessage;
  }

  return fallbackMessage;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function KnowledgeBaseTableSkeleton() {
  return (
    <div className="grid gap-3 border-t border-border/70 pt-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="grid grid-cols-5 gap-4 rounded-lg border border-border/60 p-4" key={index}>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function KnowledgeBaseFormDialog({
  errorMessage,
  initialValues,
  isOpen,
  isSubmitting,
  mode,
  onOpenChange,
  onSubmit,
}: {
  errorMessage?: string;
  initialValues?: CreateKnowledgeBaseEntryInput;
  isOpen: boolean;
  isSubmitting: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateKnowledgeBaseEntryInput | UpdateKnowledgeBaseEntryInput) => Promise<void>;
}) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(createKnowledgeBaseEntrySchema),
    defaultValues: initialValues ?? {
      bodyText: "",
      isEnabled: true,
      title: "",
    },
  });

  useEffect(() => {
    reset(
      initialValues ?? {
        bodyText: "",
        isEnabled: true,
        title: "",
      },
    );
  }, [initialValues, isOpen, reset]);

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "编辑知识库" : "创建知识库"}</DialogTitle>
          <DialogDescription>
            保存后会生成向量索引，用于外贸售后工单的语义检索和 AI 自动回复。
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-6 grid gap-5"
          noValidate
          onSubmit={handleSubmit((values) => onSubmit(values))}
        >
          <div className="grid gap-2">
            <Label htmlFor="knowledge-title">标题</Label>
            <Input
              aria-invalid={errors.title ? "true" : "false"}
              id="knowledge-title"
              placeholder="例如：国际物流延迟"
              {...register("title")}
            />
            {errors.title ? <ErrorMessage>{errors.title.message}</ErrorMessage> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="knowledge-body">正文</Label>
            <Textarea
              aria-invalid={errors.bodyText ? "true" : "false"}
              className="min-h-64"
              id="knowledge-body"
              placeholder="填写适用条件、标准答复和不能自动解决的边界。"
              {...register("bodyText")}
            />
            {errors.bodyText ? <ErrorMessage>{errors.bodyText.message}</ErrorMessage> : null}
          </div>

          <label className="flex items-center gap-3 text-sm text-foreground">
            <input className="size-4 accent-primary" type="checkbox" {...register("isEnabled")} />
            启用后允许 AI 检索该条知识
          </label>

          {errorMessage ? <ErrorAlert message={errorMessage} title="保存失败" /> : null}

          <DialogFooter>
            <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  生成向量中...
                </>
              ) : mode === "edit" ? (
                "保存修改"
              ) : (
                "创建知识"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKnowledgeBaseDialog({
  entry,
  error,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: {
  entry: KnowledgeBaseEntryListItem | null;
  error?: string;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={entry !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除知识库</DialogTitle>
          <DialogDescription>
            删除后会同时移除该条知识的向量索引，AI 将不再检索它。
          </DialogDescription>
        </DialogHeader>

        <p className="mt-6 text-sm text-foreground">
          确认删除 <strong>{entry?.title ?? ""}</strong>？
        </p>

        {error ? (
          <div className="mt-4">
            <ErrorAlert message={error} title="删除失败" />
          </div>
        ) : null}

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} onClick={() => void onConfirm()} type="button" variant="destructive">
            {isSubmitting ? "删除中..." : "删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ entry: null, mode: null });
  const [del, setDel] = useState<DeleteDialogState>({ entry: null });
  const { data, error, isError, isPending } = useQuery({
    queryFn: async () => {
      const response = await apiClient.get<KnowledgeBaseResponse>("/api/knowledge-base");
      return response.data;
    },
    queryKey: ["knowledge-base"],
  });
  const createMutation = useMutation({
    mutationFn: async (values: CreateKnowledgeBaseEntryInput) => {
      const response = await apiClient.post<KnowledgeBaseEntryResponse>("/api/knowledge-base", values);
      return response.data;
    },
    onError: (mutationError) => {
      setDialog((current) => ({
        ...current,
        error: getErrorMessage(mutationError, "创建知识库失败，请稍后再试。"),
      }));
    },
    onSuccess: async () => {
      setDialog({ entry: null, mode: null });
      await queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: async ({
      entryId,
      values,
    }: {
      entryId: number;
      values: UpdateKnowledgeBaseEntryInput;
    }) => {
      const response = await apiClient.patch<KnowledgeBaseEntryResponse>(
        `/api/knowledge-base/${entryId}`,
        values,
      );
      return response.data;
    },
    onError: (mutationError) => {
      setDialog((current) => ({
        ...current,
        error: getErrorMessage(mutationError, "保存知识库失败，请稍后再试。"),
      }));
    },
    onSuccess: async () => {
      setDialog({ entry: null, mode: null });
      await queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiClient.delete<DeleteKnowledgeBaseEntryResponse>(
        `/api/knowledge-base/${entryId}`,
      );
      return response.data;
    },
    onError: (mutationError) => {
      setDel((current) => ({
        ...current,
        error: getErrorMessage(mutationError, "删除知识库失败，请稍后再试。"),
      }));
    },
    onSuccess: async () => {
      setDel({ entry: null });
      await queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
    },
  });

  if (isError) {
    console.error("知识库加载失败:", error);
  }

  const entries = data?.entries ?? [];
  const isFormOpen = dialog.mode !== null;
  const isSubmitting = dialog.mode === "edit" ? updateMutation.isPending : createMutation.isPending;

  const handleFormOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    setDialog({ entry: null, mode: null });
    createMutation.reset();
    updateMutation.reset();
  };

  const handleSubmit = async (values: CreateKnowledgeBaseEntryInput | UpdateKnowledgeBaseEntryInput) => {
    setDialog((current) => ({ ...current, error: undefined }));

    try {
      if (dialog.mode === "edit" && dialog.entry) {
        await updateMutation.mutateAsync({
          entryId: dialog.entry.id,
          values: values as UpdateKnowledgeBaseEntryInput,
        });
        return;
      }

      await createMutation.mutateAsync(values as CreateKnowledgeBaseEntryInput);
    } catch {
      // Mutation onError renders the message.
    }
  };

  const handleDeleteConfirm = async () => {
    if (!del.entry) {
      return;
    }

    setDel((current) => ({ ...current, error: undefined }));

    try {
      await deleteMutation.mutateAsync(del.entry.id);
    } catch {
      // Mutation onError renders the message.
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
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground">
                Knowledge Base
              </h2>
              <p className="text-[0.95rem] leading-6 text-muted-foreground">
                管理外贸售后知识，保存后自动生成 pgvector 向量索引供 AI 检索。
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">知识条目</h3>
                <p className="mt-1 text-sm text-muted-foreground">当前共 {entries.length} 条知识</p>
              </div>
              <Button onClick={() => setDialog({ entry: null, mode: "create" })} type="button">
                <PlusIcon className="size-4" />
                创建知识
              </Button>
            </div>

            {isPending ? (
              <KnowledgeBaseTableSkeleton />
            ) : isError ? (
              <div className="border-t border-border/70 pt-4 text-sm text-destructive">
                知识库加载失败，请稍后再试。
              </div>
            ) : entries.length === 0 ? (
              <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
                暂无知识库数据。
              </div>
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-border/75 bg-background/72">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/70 hover:bg-transparent">
                      <TableHead>标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>Chunks</TableHead>
                      <TableHead>最近更新</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow className="border-b border-border/60 hover:bg-transparent" key={entry.id}>
                        <TableCell className="align-top">
                          <strong className="block text-sm text-card-foreground">{entry.title}</strong>
                          <span className="mt-1 line-clamp-2 block max-w-xl text-sm text-muted-foreground">
                            {entry.bodyText}
                          </span>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={entry.isEnabled ? "secondary" : "outline"}>
                            {entry.isEnabled ? "已启用" : "已停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">{entry.chunkCount}</TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          {formatDate(entry.updatedAt)}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`${entry.isEnabled ? "停用" : "启用"}知识 ${entry.title}`}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                void updateMutation.mutateAsync({
                                  entryId: entry.id,
                                  values: {
                                    bodyText: entry.bodyText,
                                    isEnabled: !entry.isEnabled,
                                    title: entry.title,
                                  },
                                });
                              }}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {entry.isEnabled ? "停用" : "启用"}
                            </Button>
                            <Button
                              aria-label={`编辑知识 ${entry.title}`}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setDialog({ entry, mode: "edit" })}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              aria-label={`删除知识 ${entry.title}`}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDel({ entry })}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </section>

      <KnowledgeBaseFormDialog
        errorMessage={dialog.error}
        initialValues={
          dialog.mode === "edit"
            ? {
                bodyText: dialog.entry.bodyText,
                isEnabled: dialog.entry.isEnabled,
                title: dialog.entry.title,
              }
            : undefined
        }
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        mode={dialog.mode ?? "create"}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleSubmit}
      />

      <DeleteKnowledgeBaseDialog
        entry={del.entry}
        error={del.error}
        isSubmitting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setDel({ entry: null });
            deleteMutation.reset();
          }
        }}
      />
    </>
  );
}
