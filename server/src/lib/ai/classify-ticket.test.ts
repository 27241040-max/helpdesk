import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  generateTextMock,
  outputObjectMock,
  deepseekModelFactoryMock,
  createDeepSeekMock,
  getRequiredEnvMock,
} = vi.hoisted(() => {
  const deepseekModelFactoryMock = vi.fn();

  return {
    generateTextMock: vi.fn(),
    outputObjectMock: vi.fn((config) => config),
    deepseekModelFactoryMock,
    createDeepSeekMock: vi.fn(() => deepseekModelFactoryMock),
    getRequiredEnvMock: vi.fn(),
  };
});

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: {
    object: outputObjectMock,
  },
}));

vi.mock("@ai-sdk/deepseek", () => ({
  createDeepSeek: createDeepSeekMock,
}));

vi.mock("../../config", () => ({
  getRequiredEnv: getRequiredEnvMock,
}));

import { TicketCategory } from "../../generated/prisma";
import { classifyTicket } from "./classify-ticket";

const classificationContext = {
  bodyText: "支付后一直没有收到退款，请帮我确认什么时候到账。",
  customer: {
    email: "customer@example.com",
    id: 1,
    name: "Taylor",
  },
  subject: "Refund status update",
};

describe("classifyTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequiredEnvMock.mockReturnValue("deepseek-test-key");
    deepseekModelFactoryMock.mockReturnValue("deepseek-model");
  });

  test("requests structured JSON output from DeepSeek", async () => {
    generateTextMock.mockResolvedValue({
      output: {
        category: TicketCategory.refund_request,
      },
    });

    const result = await classifyTicket(classificationContext);

    expect(result).toBe(TicketCategory.refund_request);
    expect(createDeepSeekMock).toHaveBeenCalledWith({
      apiKey: "deepseek-test-key",
    });
    expect(deepseekModelFactoryMock).toHaveBeenCalledWith("deepseek-chat");
    expect(outputObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.anything(),
      }),
    );
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-model",
        system: expect.stringContaining("refund_request"),
        prompt: expect.stringContaining("Refund status update"),
      }),
    );
  });

  test("throws when the model returns no category", async () => {
    generateTextMock.mockResolvedValue({
      output: undefined,
    });

    await expect(classifyTicket(classificationContext)).rejects.toThrow(
      "DeepSeek returned an empty ticket classification.",
    );
  });
});
