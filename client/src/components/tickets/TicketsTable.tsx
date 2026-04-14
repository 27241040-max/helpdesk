import { TicketCategory, TicketStatus, type TicketListItem } from "core/email";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCategoryLabel(category: TicketListItem["category"]) {
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

function getStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.open:
      return "Open";
    case TicketStatus.resolved:
      return "Resolved";
    case TicketStatus.closed:
      return "Closed";
  }
}

function getStatusClassName(status: TicketStatus) {
  switch (status) {
    case TicketStatus.open:
      return "border-transparent bg-primary text-primary-foreground";
    case TicketStatus.resolved:
      return "border-transparent bg-secondary text-secondary-foreground";
    case TicketStatus.closed:
      return "border-border bg-background text-muted-foreground";
  }
}

export function TicketsTable({ tickets }: { tickets: TicketListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/70 hover:bg-transparent">
          <TableHead>主题</TableHead>
          <TableHead>客户</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>分类</TableHead>
          <TableHead className="text-right">创建时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow className="border-b border-border/60 hover:bg-transparent" key={ticket.id}>
            <TableCell className="align-top">
              <strong className="block text-sm text-card-foreground">{ticket.subject}</strong>
            </TableCell>
            <TableCell className="align-top">
              <strong className="block text-sm text-card-foreground">{ticket.customer.name}</strong>
              <span className="mt-1 block text-sm text-muted-foreground">{ticket.customer.email}</span>
            </TableCell>
            <TableCell className="align-top">
              <Badge className={getStatusClassName(ticket.status)} variant="outline">
                {getStatusLabel(ticket.status)}
              </Badge>
            </TableCell>
            <TableCell className="align-top text-muted-foreground">
              {getCategoryLabel(ticket.category)}
            </TableCell>
            <TableCell className="align-top text-right text-muted-foreground">
              {formatDate(ticket.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
