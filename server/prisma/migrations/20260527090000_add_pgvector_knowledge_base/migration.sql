CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "knowledge_base_entry" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_base_entry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_base_chunk" (
  "id" SERIAL NOT NULL,
  "entryId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "embedding" vector(1024) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "knowledge_base_chunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_base_entry_isEnabled_idx" ON "knowledge_base_entry"("isEnabled");
CREATE UNIQUE INDEX "knowledge_base_chunk_entryId_chunkIndex_key" ON "knowledge_base_chunk"("entryId", "chunkIndex");
CREATE INDEX "knowledge_base_chunk_entryId_idx" ON "knowledge_base_chunk"("entryId");
CREATE INDEX "knowledge_base_chunk_embedding_hnsw_idx" ON "knowledge_base_chunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "knowledge_base_chunk"
  ADD CONSTRAINT "knowledge_base_chunk_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "knowledge_base_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
