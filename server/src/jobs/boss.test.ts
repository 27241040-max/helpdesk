import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  onMock,
  startMock,
  stopMock,
  createQueueMock,
  workMock,
  sendMock,
  pgBossConstructorMock,
  PgBossMock,
  getRequiredEnvMock,
  runTicketAutoClassificationMock,
} = vi.hoisted(() => {
  const onMock = vi.fn();
  const startMock = vi.fn();
  const stopMock = vi.fn();
  const createQueueMock = vi.fn();
  const workMock = vi.fn();
  const sendMock = vi.fn();
  const pgBossConstructorMock = vi.fn();
  class PgBossMock {
    constructor(connectionString: string) {
      pgBossConstructorMock(connectionString);
    }

    on = onMock;
    start = startMock;
    stop = stopMock;
    createQueue = createQueueMock;
    work = workMock;
    send = sendMock;
  }

  return {
    onMock,
    startMock,
    stopMock,
    createQueueMock,
    workMock,
    sendMock,
    pgBossConstructorMock,
    PgBossMock,
    getRequiredEnvMock: vi.fn(),
    runTicketAutoClassificationMock: vi.fn(),
  };
});

vi.mock("pg-boss", () => ({
  PgBoss: PgBossMock,
}));

vi.mock("../config", () => ({
  getRequiredEnv: getRequiredEnvMock,
}));

vi.mock("../lib/ai/ticket-auto-classification", () => ({
  runTicketAutoClassification: runTicketAutoClassificationMock,
}));

import {
  sendTicketAutoClassificationJob,
  startBoss,
  stopBoss,
} from "./boss";

describe("boss job integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    getRequiredEnvMock.mockReturnValue("postgresql://test-connection");
    startMock.mockResolvedValue(undefined);
    stopMock.mockResolvedValue(undefined);
    createQueueMock.mockResolvedValue(undefined);
    workMock.mockResolvedValue("worker-id");
    sendMock.mockResolvedValue("job-id");

    await stopBoss();
  });

  test("starts pg-boss and registers the ticket classification worker", async () => {
    await startBoss();

    expect(pgBossConstructorMock).toHaveBeenCalledWith("postgresql://test-connection");
    expect(onMock).toHaveBeenCalledWith("error", expect.any(Function));
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(createQueueMock).toHaveBeenCalledWith("ticket-auto-classification");
    expect(workMock).toHaveBeenCalledWith(
      "ticket-auto-classification",
      expect.any(Function),
    );

    const handler = workMock.mock.calls[0]?.[1] as (jobs: Array<{ data?: { ticketId?: number } }>) => Promise<void>;
    await handler([{ data: { ticketId: 7 } }, { data: { ticketId: -1 } }, { data: {} }]);

    expect(runTicketAutoClassificationMock).toHaveBeenCalledTimes(1);
    expect(runTicketAutoClassificationMock).toHaveBeenCalledWith(7);
  });

  test("sends ticket classification jobs to the queue", async () => {
    const jobId = await sendTicketAutoClassificationJob(17);

    expect(jobId).toBe("job-id");
    expect(sendMock).toHaveBeenCalledWith("ticket-auto-classification", {
      ticketId: 17,
    });
  });
});
