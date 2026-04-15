import { z } from "zod";

export enum TicketStatus {
  closed = "closed",
  open = "open",
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
  source: string;
  status: TicketStatus;
  subject: string;
  updatedAt: string;
};
