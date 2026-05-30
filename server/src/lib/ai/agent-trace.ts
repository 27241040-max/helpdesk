import { Prisma } from "../../generated/prisma";
import { prisma } from "../../prisma";

type AgentStepStatus = "completed" | "failed" | "skipped";
type AgentRunStatus = "completed" | "failed";

type JsonRecord = Prisma.InputJsonObject;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function startAgentRun(input: {
  metadata?: JsonRecord;
  ticketId: number;
  workflow: string;
}) {
  return prisma.agentRun.create({
    data: {
      metadata: input.metadata,
      ticketId: input.ticketId,
      workflow: input.workflow,
    },
    select: {
      id: true,
    },
  });
}

export async function completeAgentRun(input: {
  error?: unknown;
  outcome?: string;
  runId: string;
  status: AgentRunStatus;
}) {
  await prisma.agentRun.update({
    where: {
      id: input.runId,
    },
    data: {
      completedAt: new Date(),
      errorMessage: input.error ? normalizeError(input.error) : null,
      outcome: input.outcome,
      status: input.status,
    },
  });
}

export async function recordAgentStep(input: {
  agentName: string;
  error?: unknown;
  inputSummary?: string;
  metadata?: JsonRecord;
  outputSummary?: string;
  runId: string;
  status: AgentStepStatus;
  stepName: string;
}) {
  await prisma.agentStep.create({
    data: {
      agentName: input.agentName,
      completedAt: new Date(),
      errorMessage: input.error ? normalizeError(input.error) : null,
      inputSummary: input.inputSummary,
      metadata: input.metadata,
      outputSummary: input.outputSummary,
      runId: input.runId,
      status: input.status,
      stepName: input.stepName,
    },
  });
}
