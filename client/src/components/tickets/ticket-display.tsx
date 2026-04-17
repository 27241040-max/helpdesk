import { TicketCategory, TicketStatus } from "core/email";

import { Badge } from "@/components/ui/badge";

export function formatTicketDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const autoClassificationPollingWindowMs = 60_000;

export function shouldPollForTicketAutoClassification(ticket: {
  category: TicketCategory | null;
  createdAt: string;
}) {
  if (ticket.category) {
    return false;
  }

  const createdAt = new Date(ticket.createdAt).getTime();

  if (Number.isNaN(createdAt)) {
    return false;
  }

  return Date.now() - createdAt < autoClassificationPollingWindowMs;
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

export const ticketCategoryOptions: Array<{ label: string; value: TicketCategory | null }> = [
  { label: "未分类", value: null },
  { label: "General", value: TicketCategory.general },
  { label: "Technical", value: TicketCategory.technical },
  { label: "Refund Request", value: TicketCategory.refundRequest },
];

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

export const ticketStatusOptions: Array<{ label: string; value: TicketStatus }> = [
  { label: "Open", value: TicketStatus.open },
  { label: "Resolved", value: TicketStatus.resolved },
  { label: "Closed", value: TicketStatus.closed },
];

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
