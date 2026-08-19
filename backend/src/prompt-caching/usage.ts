import type Anthropic from "@anthropic-ai/sdk";

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

export interface ProviderPricing {
    inputPricePerMTok: number;
    outputPricePerMTok: number;
}

const CACHE_WRITE_MULTIPLIER_5M = 1.25;
const CACHE_WRITE_MULTIPLIER_1H = 2;
const CACHE_READ_MULTIPLIER = 0.1;

export type CacheTtl = "5m" | "1h";

export const extractUsage = (usage: Anthropic.Usage): TokenUsage => {
    const uncachedInputTokens = usage.input_tokens ?? 0;
    const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;

    return {
        uncachedInputTokens,
        cacheCreationInputTokens,
        cacheReadInputTokens,
        totalInputTokens: uncachedInputTokens + cacheCreationInputTokens + cacheReadInputTokens,
        outputTokens: usage.output_tokens ?? 0,
    };
};

export const computeCost = (
    tokens: TokenUsage,
    pricing: ProviderPricing,
    ttl: CacheTtl = "5m",
): CostBreakdown => {
    const inputRate = pricing.inputPricePerMTok / 1_000_000;
    const outputRate = pricing.outputPricePerMTok / 1_000_000;
    const writeMultiplier = ttl === "1h" ? CACHE_WRITE_MULTIPLIER_1H : CACHE_WRITE_MULTIPLIER_5M;

    const uncachedInputCost = tokens.uncachedInputTokens * inputRate;
    const cacheWriteCost = tokens.cacheCreationInputTokens * inputRate * writeMultiplier;
    const cacheReadCost = tokens.cacheReadInputTokens * inputRate * CACHE_READ_MULTIPLIER;
    const outputCost = tokens.outputTokens * outputRate;

    const totalCost = uncachedInputCost + cacheWriteCost + cacheReadCost + outputCost;
    const costWithoutCaching = tokens.totalInputTokens * inputRate + outputCost;
    const savings = costWithoutCaching - totalCost;

    return {
        uncachedInputCost,
        cacheWriteCost,
        cacheReadCost,
        outputCost,
        totalCost,
        costWithoutCaching,
        savings,
        savingsPercent: costWithoutCaching > 0 ? (savings / costWithoutCaching) * 100 : 0,
    };
};

export const buildUsageReport = (
    usage: Anthropic.Usage,
    pricing: ProviderPricing,
    ttl: CacheTtl = "5m",
): UsageReport => {
    const tokens = extractUsage(usage);
    return {
        tokens,
        cost: computeCost(tokens, pricing, ttl),
        cacheHitRate:
            tokens.totalInputTokens > 0
                ? (tokens.cacheReadInputTokens / tokens.totalInputTokens) * 100
                : 0,
    };
};

export const emptyTokenUsage = (): TokenUsage => ({
    uncachedInputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    totalInputTokens: 0,
    outputTokens: 0,
});

export const sumTokenUsage = (entries: TokenUsage[]): TokenUsage =>
    entries.reduce<TokenUsage>((acc, entry) => ({
        uncachedInputTokens: acc.uncachedInputTokens + entry.uncachedInputTokens,
        cacheCreationInputTokens: acc.cacheCreationInputTokens + entry.cacheCreationInputTokens,
        cacheReadInputTokens: acc.cacheReadInputTokens + entry.cacheReadInputTokens,
        totalInputTokens: acc.totalInputTokens + entry.totalInputTokens,
        outputTokens: acc.outputTokens + entry.outputTokens,
    }), emptyTokenUsage());
