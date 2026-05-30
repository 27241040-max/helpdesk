CREATE TABLE "agent_run" (
    "id" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "workflow" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "outcome" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_step" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_step_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_run_ticketId_startedAt_idx" ON "agent_run"("ticketId", "startedAt");
CREATE INDEX "agent_step_runId_startedAt_idx" ON "agent_step"("runId", "startedAt");

ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_step" ADD CONSTRAINT "agent_step_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
