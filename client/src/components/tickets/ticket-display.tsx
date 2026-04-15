import { TicketCategory, TicketStatus } from "core/email";

import { Badge } from "@/components/ui/badge";

export function formatTicketDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getTicketCategoryLabel(category: TicketCategory | null) {
  if (!category) {
    return "未分类";
  }

  switch (category) {
    case TicketCategory.general:
      return "General";
    case TicketCategory.technical:
      return "Technical";
    case TicketCategory.refundRequest:
      return "Refund Request";
  }
}

export function getTicketStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.open:
      return "Open";
    case TicketStatus.resolved:
      return "Resolved";
    case TicketStatus.closed:
      return "Closed";
  }
}

export function getTicketStatusClassName(status: TicketStatus) {
  switch (status) {
    case TicketStatus.open:
      return "border-transparent bg-primary text-primary-foreground";
    case TicketStatus.resolved:
      return "border-transparent bg-secondary text-secondary-foreground";
    case TicketStatus.closed:
      return "border-border bg-background text-muted-foreground";
  }
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={getTicketStatusClassName(status)} variant="outline">
      {getTicketStatusLabel(status)}
    </Badge>
  );
}
