import dotenv from "dotenv";

dotenv.config();

const toInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const appEnv = {
    port: toInt(process.env.PORT, 4000),
    environment: process.env.NODE_ENV ?? "development",
    webUrl: process.env.WEB_URL ?? "http://localhost:3000",
    webOrigins: (process.env.WEB_ORIGINS ?? process.env.WEB_URL ?? "http://localhost:3000")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
};

export const anthropicEnv = {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? "",
    modelId: process.env.ANTHROPIC_MODEL_ID ?? "claude-sonnet-5",
    inputPricePerMTok: toFloat(process.env.ANTHROPIC_INPUT_PRICE_PER_MTOK, 5),
    outputPricePerMTok: toFloat(process.env.ANTHROPIC_OUTPUT_PRICE_PER_MTOK, 25),
};

export const qwenEnv = {
    apiKey: process.env.QWEN_API_KEY ?? "",
    baseUrl: process.env.QWEN_BASE_URL ?? "",
    modelId: process.env.QWEN_MODEL_ID ?? "qwen3-coder-plus",
    inputPricePerMTok: toFloat(process.env.QWEN_INPUT_PRICE_PER_MTOK, 1),
    outputPricePerMTok: toFloat(process.env.QWEN_OUTPUT_PRICE_PER_MTOK, 4),
};

export const mcpEnv = {
    exaApiKey: process.env.EXA_API_KEY ?? "",
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
    context7Key: process.env.CONTEXT7_KEY ?? "",
    e2bApiKey: process.env.E2B_API_KEY ?? "",
    modelId: process.env.MCP_MODEL_ID ?? "claude-sonnet-5",
};

export type ProviderName = "qwen" | "anthropic";

export const defaultProvider: ProviderName =
    process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "qwen";

export const providers = {
    qwen: qwenEnv,
    anthropic: anthropicEnv,
} as const;
