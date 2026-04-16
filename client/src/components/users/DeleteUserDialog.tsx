import { AlertTriangleIcon } from "lucide-react";

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

type DeleteUserDialogProps = {
  error?: string;
  isOpen: boolean;
  isSubmitting: boolean;
  name: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function DeleteUserDialog({
  error,
  isOpen,
  isSubmitting,
  name,
  onConfirm,
  onOpenChange,
}: DeleteUserDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除用户</DialogTitle>
          <DialogDescription>
            删除后，用户 <strong>{name}</strong> 将从默认列表中隐藏并立即失效，已分配给该用户的工单会自动变为未指派。
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <ErrorAlert icon={AlertTriangleIcon} message={error} title="删除失败" />
        ) : null}

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={() => onOpenChange(false)} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm} type="button" variant="destructive">
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
