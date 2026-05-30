import {
  type TicketAssignableAgent,
  type TicketDetail,
  type TicketStatus as TicketStatusValue,
} from "core/email";
import type { ReactNode } from "react";

import { TicketAgentTrace } from "@/components/tickets/TicketAgentTrace";
import {
  getTicketCategoryLabel,
  getTicketStatusLabel,
  ticketCategoryOptions,
  ticketStatusOptions,
} from "@/components/tickets/ticket-display";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const unassignedAgentValue = "__unassigned__";
const uncategorizedValue = "__uncategorized__";

type UpdateTicketProps = {
  agents: TicketAssignableAgent[];
  assignmentErrorMessage?: string;
  assignmentIsPending: boolean;
  assignmentValue: string;
  categoryValue: string;
  onAssignmentChange: (nextAgentId: string) => void;
  onCategoryChange: (nextCategory: string) => void;
  onStatusChange: (nextStatus: string) => void;
  statusValue: TicketStatusValue;
  ticket: TicketDetail;
  updateErrorMessage?: string;
  updateIsPending: boolean;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2 border-b border-border/65 py-3 last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm text-card-foreground">{value}</div>
    </div>
  );
}

export function UpdateTicket({
  agents,
  assignmentErrorMessage,
  assignmentIsPending,
  assignmentValue,
  categoryValue,
  onAssignmentChange,
  onCategoryChange,
  onStatusChange,
  statusValue,
  ticket,
  updateErrorMessage,
  updateIsPending,
}: UpdateTicketProps) {
  return (
    <>
      <aside className="grid min-w-0 gap-4 rounded-xl bg-background/55 px-4 py-4 lg:sticky lg:top-5">
        <DetailItem
          label="当前状态"
          value={getTicketStatusLabel(ticket.status)}
        />
        <DetailItem
          label="手动更新状态"
          value={
            <Select
              disabled={updateIsPending}
              onValueChange={onStatusChange}
              value={statusValue}
            >
              <SelectTrigger aria-label="状态" className="h-9 w-full min-w-0 bg-background px-3">
                <SelectValue placeholder={getTicketStatusLabel(ticket.status)} />
              </SelectTrigger>
              <SelectContent>
                {ticketStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <DetailItem
          label="类别"
          value={
            <Select
              disabled={updateIsPending}
              onValueChange={onCategoryChange}
              value={categoryValue}
            >
              <SelectTrigger aria-label="类别" className="h-9 w-full min-w-0 bg-background px-3">
                <SelectValue placeholder={getTicketCategoryLabel(ticket.category)} />
              </SelectTrigger>
              <SelectContent>
                {ticketCategoryOptions.map((option) => (
                  <SelectItem
                    key={option.value ?? uncategorizedValue}
                    value={option.value ?? uncategorizedValue}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <DetailItem
          label="指派给"
          value={
            <div className="grid gap-2">
              <Select
                disabled={assignmentIsPending}
                onValueChange={onAssignmentChange}
                value={assignmentValue}
              >
                <SelectTrigger aria-label="指派给" className="h-9 w-full min-w-0 bg-background px-3">
                  <SelectValue placeholder="未指派" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={unassignedAgentValue}>未指派</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignmentErrorMessage ? (
                <ErrorMessage>{assignmentErrorMessage}</ErrorMessage>
              ) : null}
            </div>
          }
        />
        <TicketAgentTrace runs={ticket.agentRuns ?? []} />
      </aside>

      {updateErrorMessage ? (
        <ErrorMessage className="lg:col-span-2">{updateErrorMessage}</ErrorMessage>
      ) : null}
    </>
  );
}
