import type { TicketReply } from "core/email";
import { BotIcon, HeadsetIcon, UserRoundIcon } from "lucide-react";

import { formatTicketDate } from "@/components/tickets/ticket-display";

type TicketReplyThreadProps = {
  replies: TicketReply[];
};

function ReplyAuthorIcon({ reply }: { reply: TicketReply }) {
  if (reply.source === "agent" && !reply.author) {
    return (
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <UserRoundIcon className="size-4" />
      </span>
    );
  }

  if (reply.source === "ai_auto_resolution") {
    return (
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary"
      >
        <BotIcon className="size-4" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
    >
      <HeadsetIcon className="size-4" />
    </span>
  );
}

export function TicketReplyThread({ replies }: TicketReplyThreadProps) {
  return (
    <div className="grid min-w-0 gap-4 border-b border-border/70 py-5">
      <div className="grid gap-1">
        <span className="text-base font-semibold text-card-foreground">
          回复线程
        </span>
        <span className="text-sm text-muted-foreground">
          按时间顺序显示客服与系统回复。
        </span>
      </div>

      {replies.length === 0 ? (
        <p className="border-l-2 border-dashed border-border/80 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          暂无回复
        </p>
      ) : (
        <div className="grid min-w-0 gap-5">
          {replies.map((reply) => (
            <article
              className="grid min-w-0 gap-2 border-l-2 border-border/80 pl-4"
              key={reply.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <ReplyAuthorIcon reply={reply} />
                  <div className="grid min-w-0 gap-0.5">
                    <span className="break-words text-sm font-medium text-card-foreground">
                      {reply.authorLabel}
                    </span>
                    {reply.author?.email ? (
                      <span className="break-words [overflow-wrap:anywhere] text-xs text-muted-foreground">
                        {reply.author.email}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTicketDate(reply.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-7 text-card-foreground">
                {reply.bodyText}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
