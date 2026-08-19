export type CacheMode = "uncached" | "implicit" | "explicit";
export type CacheTtl = "5m" | "1h";

export interface TokenUsage {
  uncachedInputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalInputTokens: number;
  outputTokens: number;
}

export interface CostBreakdown {
  uncachedInputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  outputCost: number;
  totalCost: number;
  costWithoutCaching: number;
  savings: number;
  savingsPercent: number;
}

export interface UsageReport {
  tokens: TokenUsage;
  cost: CostBreakdown;
  cacheHitRate: number;
}

export interface AskResult {
  question: string;
  mode: CacheMode;
  answer: string;
  model: string;
  provider: string;
  latencyMs: number;
  usage: UsageReport;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Request failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const ask = (question: string, mode: CacheMode, ttl?: CacheTtl) =>
  post<AskResult>("/api/prompt-caching/ask", { question, mode, ttl });

export const SAMPLE_QUESTIONS = [
  "I bought an annual plan 10 days ago. Can I get my money back?",
  "We removed a teammate yesterday. Are we still paying for that seat?",
  "Our uptime last month was 98.4 percent. What are we owed?",
  "How long do you keep our chat transcripts on the business plan?",
  "What happens if we blow past our monthly token allowance?",
  "Someone leaked one of our API keys. How fast can we kill it?",
];

export type ToolMode = "naive" | "deferred";

export interface McpServerSummary {
  server: string;
  label: string;
  connected: boolean;
  error?: string;
  toolCount: number;
  tools: { name: string; description: string }[];
}

export interface McpCatalog {
  model: string;
  questions: string[];
  servers: McpServerSummary[];
  totalTools: number;
}

export interface ToolCallRecord {
  server: string;
  tool: string;
  input: Record<string, unknown>;
  resultPreview: string;
  ok: boolean;
}

export interface McpRunResult {
  mode: ToolMode;
  question: string;
  model: string;
  answer: string;
  latencyMs: number;
  toolCount: number;
  deferredCount: number;
  searchQueries: string[];
  discoveredTools: string[];
  toolCalls: ToolCallRecord[];
  usage: UsageReport;
  firstTurnUsage: UsageReport;
  turns: number;
}

export const fetchCatalog = async (): Promise<McpCatalog> => {
  const res = await fetch(`${BASE_URL}/api/mcp-tooling/catalog`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Catalog request failed with ${res.status}`);
  return res.json() as Promise<McpCatalog>;
};

export const runMcp = (
  question: string,
  mode: ToolMode,
  priorityTools?: string[],
) =>
  post<McpRunResult>("/api/mcp-tooling/run", { question, mode, priorityTools });
