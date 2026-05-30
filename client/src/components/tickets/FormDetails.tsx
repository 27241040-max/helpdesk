import type {
  TicketDetail,
  TicketReplyCreateInput,
  TicketReplyPolishInput,
  TicketReplyPolishResult,
  TicketSummaryResult,
} from "core/email";

import { TicketDetail as TicketDetailSection } from "@/components/tickets/TicketDetail";
import { TicketReplyForm } from "@/components/tickets/TicketReplyForm";
import { TicketReplyThread } from "@/components/tickets/TicketReplyThread";

type FormDetailsProps = {
  data: TicketDetail;
  onSummarize: () => void;
  polishErrorMessage?: string;
  polishIsSubmitting: boolean;
  replyErrorMessage?: string;
  replyIsSubmitting: boolean;
  onPolish: (values: TicketReplyPolishInput) => Promise<TicketReplyPolishResult>;
  onReplySubmit: (values: TicketReplyCreateInput) => Promise<unknown>;
  summary: TicketSummaryResult | null;
  summaryErrorMessage?: string;
  summaryIsSubmitting: boolean;
};

export function FormDetails({
  data,
  onSummarize,
  polishErrorMessage,
  polishIsSubmitting,
  replyErrorMessage,
  replyIsSubmitting,
  onPolish,
  onReplySubmit,
  summary,
  summaryErrorMessage,
  summaryIsSubmitting,
}: FormDetailsProps) {
  return (
    <div className="grid min-w-0 gap-5">
      <TicketDetailSection
        isSummarizing={summaryIsSubmitting}
        onSummarize={onSummarize}
        summary={summary}
        summaryErrorMessage={summaryErrorMessage}
        ticket={data}
      />
      <TicketReplyThread replies={data.replies ?? []} />

      <div className="grid gap-4 pt-5">
        <div className="grid gap-1">
          <span className="text-base font-semibold text-card-foreground">添加回复</span>
          <span className="text-sm text-muted-foreground">回复会记录在线程中，不会自动修改工单状态。</span>
        </div>

        <TicketReplyForm
          errorMessage={replyErrorMessage}
          isPolishing={polishIsSubmitting}
          isSubmitting={replyIsSubmitting}
          onPolish={onPolish}
          onSubmit={onReplySubmit}
          polishErrorMessage={polishErrorMessage}
        />
      </div>
    </div>
  );
}
