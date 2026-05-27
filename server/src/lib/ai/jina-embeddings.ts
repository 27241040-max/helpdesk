import { getOptionalEnv, getRequiredEnv } from "../../config";

export type JinaEmbeddingTask = "retrieval.passage" | "retrieval.query";

type JinaEmbeddingResponse = {
  data?: Array<{
    embedding?: unknown;
    index?: number;
  }>;
  embeddings?: unknown;
  model?: string;
  usage?: {
    total_tokens?: number;
  };
};

const defaultModel = "jina-embeddings-v5-text-small";
const defaultDimensions = 1024;

function getEmbeddingDimensions() {
  const raw = getOptionalEnv("JINA_EMBEDDING_DIMENSIONS");

  if (!raw) {
    return defaultDimensions;
  }

  const dimensions = Number(raw);

  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error("JINA_EMBEDDING_DIMENSIONS must be a positive integer.");
  }

  return dimensions;
}

function assertEmbedding(value: unknown, dimensions: number): number[] {
  if (!Array.isArray(value) || value.length !== dimensions) {
    throw new Error(`Jina returned an invalid embedding. Expected ${dimensions} dimensions.`);
  }

  const embedding = value.map((item) => Number(item));

  if (embedding.some((item) => !Number.isFinite(item))) {
    throw new Error("Jina returned an embedding with non-numeric values.");
  }

  return embedding;
}

function parseEmbeddings(responseBody: JinaEmbeddingResponse, dimensions: number): number[][] {
  if (Array.isArray(responseBody.data)) {
    return responseBody.data
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((item) => assertEmbedding(item.embedding, dimensions));
  }

  if (Array.isArray(responseBody.embeddings)) {
    return responseBody.embeddings.map((item) => assertEmbedding(item, dimensions));
  }

  throw new Error("Jina returned an unsupported embeddings response shape.");
}

export function vectorToSql(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

export async function createJinaEmbeddings(inputs: string[], task: JinaEmbeddingTask): Promise<number[][]> {
  const normalizedInputs = inputs.map((input) => input.trim()).filter(Boolean);

  if (normalizedInputs.length === 0) {
    return [];
  }

  const dimensions = getEmbeddingDimensions();
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${getRequiredEnv("JINA_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      dimensions,
      input: normalizedInputs,
      model: getOptionalEnv("JINA_EMBEDDING_MODEL") ?? defaultModel,
      normalized: true,
      task,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Jina embeddings request failed with ${response.status}: ${text || response.statusText}`);
  }

  const body = (await response.json()) as JinaEmbeddingResponse;
  const embeddings = parseEmbeddings(body, dimensions);

  if (embeddings.length !== normalizedInputs.length) {
    throw new Error("Jina returned a different number of embeddings than requested.");
  }

  return embeddings;
}
