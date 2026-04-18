import { z } from "zod";

export enum TicketStatus {
  closed = "closed",
  new = "new",
  open = "open",
  processing = "processing",
  resolved = "resolved",
}

export enum TicketCategory {
  general = "general",
  refundRequest = "refund_request",
  technical = "technical",
}

export const ticketSortFieldSchema = z.enum([
  "subject",
  "customer",
  "status",
  "category",
  "createdAt",
]);

export const ticketSortOrderSchema = z.enum(["asc", "desc"]);

const optionalTrimmedStringSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue === "" ? undefined : trimmedValue;
  },
  z.string().min(1).optional(),
);

export const ticketListQuerySchema = z.object({
  category: z.nativeEnum(TicketCategory).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: optionalTrimmedStringSchema,
  status: z.nativeEnum(TicketStatus).optional(),
  sortBy: ticketSortFieldSchema.optional(),
  sortOrder: ticketSortOrderSchema.optional(),
});

export const ticketAssignmentSchema = z.object({
  assignedUserId: z.string().trim().min(1).nullable(),
});

export const ticketUpdateSchema = z.object({
  category: z.nativeEnum(TicketCategory).nullable(),
  status: z.nativeEnum(TicketStatus),
});

const ticketReplyBodyTextSchema = z.string().trim().min(1, "回复内容不能为空。");

export const ticketReplyCreateSchema = z.object({
  bodyText: ticketReplyBodyTextSchema,
});

export const ticketReplyPolishSchema = z.object({
  bodyText: ticketReplyBodyTextSchema,
});

const emailSchema = z.string().trim().min(1, "请输入有效的邮箱地址").email("请输入有效的邮箱地址");

export const inboundEmailSchema = z.object({
  category: z.nativeEnum(TicketCategory).optional(),
  from: z.object({
    email: emailSchema,
    name: z.string().trim().min(1, "发件人姓名不能为空"),
  }),
  messageId: z.string().trim().min(1).optional(),
  receivedAt: z.string().datetime().optional(),
  subject: z.string().trim().min(1, "邮件主题不能为空"),
  text: z.string().trim().min(1, "邮件正文不能为空"),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
export type TicketSortField = z.infer<typeof ticketSortFieldSchema>;
export type TicketSortOrder = z.infer<typeof ticketSortOrderSchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
export type TicketAssignmentInput = z.infer<typeof ticketAssignmentSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type TicketReplyCreateInput = z.infer<typeof ticketReplyCreateSchema>;
export type TicketReplyPolishInput = z.infer<typeof ticketReplyPolishSchema>;
export type TicketReplyPolishResult = {
  bodyText: string;
};
export type TicketSummaryResult = {
  bodyText: string;
  generatedAt: string;
};
export type TicketDashboardStats = {
  aiResolvedPercentage: number;
  aiResolvedTickets: number;
  averageResolutionMs: number | null;
  openTickets: number;
  resolvedTickets: number;
  ticketVolumeByDay: Array<{
    date: string;
    totalTickets: number;
  }>;
  totalTickets: number;
};
export type TicketListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TicketListItem = {
  category: TicketCategory | null;
  createdAt: string;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  id: number;
  status: TicketStatus;
  subject: string;
};

export type TicketDetail = {
  assignedUser: {
    email: string;
    id: string;
    name: string;
  } | null;
  bodyText: string;
  category: TicketCategory | null;
  createdAt: string;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  id: number;
  replies: TicketReply[];
  source: string;
  status: TicketStatus;
  subject: string;
  updatedAt: string;
};

export type TicketReply = {
  author: {
    email: string | null;
    id: string | null;
    name: string | null;
  } | null;
  authorLabel: string;
  bodyText: string;
  createdAt: string;
  id: number;
  source: "agent" | "ai_auto_resolution";
  updatedAt: string;
};

export type TicketReplyAuthor = {
    email: string;
    id: string;
    name: string;
  };

export type TicketAssignableAgent = {
  email: string;
  id: string;
  name: string;
};
