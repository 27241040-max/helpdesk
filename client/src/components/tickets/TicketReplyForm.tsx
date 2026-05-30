import { zodResolver } from "@hookform/resolvers/zod";
import {
  type TicketReplyCreateInput,
  type TicketReplyPolishInput,
  type TicketReplyPolishResult,
  ticketReplyCreateSchema,
} from "core/email";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TicketReplyFormProps = {
  errorMessage?: string;
  isPolishing: boolean;
  isSubmitting: boolean;
  onPolish: (values: TicketReplyPolishInput) => Promise<TicketReplyPolishResult>;
  onSubmit: (values: TicketReplyCreateInput) => Promise<unknown>;
  polishErrorMessage?: string;
};

export function TicketReplyForm({
  errorMessage,
  isPolishing,
  isSubmitting,
  onPolish,
  onSubmit,
  polishErrorMessage,
}: TicketReplyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketReplyCreateInput>({
    resolver: zodResolver(ticketReplyCreateSchema),
    defaultValues: {
      bodyText: "",
    },
  });
  const bodyText = watch("bodyText");
  const isBusy = isSubmitting || isPolishing;
  const hasReplyText = bodyText.trim().length > 0;
  const canPolish = hasReplyText && !isBusy;
  const canSubmit = hasReplyText && !isBusy;

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
          reset();
        } catch {
          // Error state is surfaced through the parent component.
        }
      })}
    >
      <div className="grid gap-2">
        <Label htmlFor="ticket-reply-body">回复内容</Label>
        <Textarea
          id="ticket-reply-body"
          aria-invalid={errors.bodyText ? "true" : "false"}
          disabled={isBusy}
          placeholder="输入要发送给客户的回复内容"
          {...register("bodyText")}
        />
        {errors.bodyText ? <ErrorMessage>{errors.bodyText.message}</ErrorMessage> : null}
      </div>

      {polishErrorMessage ? <ErrorMessage>{polishErrorMessage}</ErrorMessage> : null}
      {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!canPolish}
          onClick={() => {
            void handleSubmit(async (values) => {
              try {
                const result = await onPolish(values);
                setValue("bodyText", result.bodyText, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              } catch {
                // Error state is surfaced through the parent component.
              }
            })();
          }}
          type="button"
          variant="outline"
        >
          {isPolishing ? "正在润色..." : "润色"}
        </Button>

        <Button disabled={!canSubmit} type="submit">
          {isSubmitting ? "提交中..." : "提交回复"}
        </Button>
      </div>
    </form>
  );
}
