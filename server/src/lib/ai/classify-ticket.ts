import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import { z } from "zod";

import { getRequiredEnv } from "../../config";
import { TicketCategory } from "../../generated/prisma";

type ClassifyTicketContext = {
  bodyText: string;
  customer: {
    email: string;
    id: number;
    name: string;
  };
  subject: string;
};

const ticketClassificationSchema = z.object({
  category: z.nativeEnum(TicketCategory),
});

export async function classifyTicket(context: ClassifyTicketContext): Promise<TicketCategory> {
  const deepseek = createDeepSeek({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
  });

  const { output } = await generateText({
    model: deepseek("deepseek-chat"),
    output: Output.object({
      schema: ticketClassificationSchema,
    }),
    system: [
      "你是客服工单分类助手。",
      "你必须只根据工单主题和客户原始消息进行分类，不得编造事实。",
      "你只能返回一个 JSON 对象，字段 category 的值必须是以下之一：general、technical、refund_request。",
      "分类标准：",
      "general：一般咨询、账号/订单状态询问、产品信息、非技术性支持。",
      "technical：报错、无法登录、功能异常、接口/配置/兼容性等技术问题。",
      "refund_request：明确要求退款、退费、取消订单并退款、退款进度追问。",
      "如果文本同时涉及多个主题，优先按客户当前最主要诉求分类；只在明确出现退款诉求时返回 refund_request。",
    ].join("\n"),
    prompt: [
      `工单主题: ${context.subject}`,
      `客户: ${context.customer.name} <${context.customer.email}>`,
      `客户原始消息:\n${context.bodyText}`,
      "请输出 JSON。",
    ].join("\n\n"),
  });

  if (!output?.category) {
    throw new Error("DeepSeek returned an empty ticket classification.");
  }

  return output.category as TicketCategory;
}
