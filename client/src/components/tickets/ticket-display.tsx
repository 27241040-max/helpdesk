import { TicketCategory, TicketStatus } from "core/email";

import { Badge } from "@/components/ui/badge";

export function formatTicketDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

const autoClassificationPollingWindowMs = 60_000;

export function shouldPollForTicketAutomation(ticket: {
  category: TicketCategory | null;
  createdAt: string;
  status?: TicketStatus;
}) {
  const createdAt = new Date(ticket.createdAt).getTime();

  if (Number.isNaN(createdAt)) {
    return false;
  }

  if (Date.now() - createdAt >= autoClassificationPollingWindowMs) {
    return false;
  }

  if (ticket.status === TicketStatus.new || ticket.status === TicketStatus.processing) {
    return true;
  }

  if (ticket.status === TicketStatus.open) {
    return ticket.category === null;
  }

  return ticket.category === null;
}

export function getTicketCategoryLabel(category: TicketCategory | null) {
  if (!category) {
    return "未分类";
  }

  switch (category) {
    case TicketCategory.general:
      return "一般咨询";
    case TicketCategory.technical:
      return "技术问题";
    case TicketCategory.refundRequest:
      return "退款请求";
  }
}

export const ticketCategoryOptions: Array<{ label: string; value: TicketCategory | null }> = [
  { label: "未分类", value: null },
  { label: "一般咨询", value: TicketCategory.general },
  { label: "技术问题", value: TicketCategory.technical },
  { label: "退款请求", value: TicketCategory.refundRequest },
];

export function getTicketStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.new:
      return "新工单";
    case TicketStatus.open:
      return "待处理";
    case TicketStatus.processing:
      return "处理中";
    case TicketStatus.resolved:
      return "已解决";
    case TicketStatus.closed:
      return "已关闭";
  }
}

export const ticketStatusOptions: Array<{ label: string; value: TicketStatus }> = [
  { label: "待处理", value: TicketStatus.open },
  { label: "已解决", value: TicketStatus.resolved },
  { label: "已关闭", value: TicketStatus.closed },
];

export function getTicketStatusClassName(status: TicketStatus) {
  switch (status) {
    case TicketStatus.new:
    case TicketStatus.processing:
      return "border-transparent bg-primary text-primary-foreground";
    case TicketStatus.open:
      return "border-transparent bg-red-600 text-red-50";
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
