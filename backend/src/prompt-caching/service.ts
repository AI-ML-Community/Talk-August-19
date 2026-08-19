import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { getClient, getProviderConfig } from "@/prompt-caching/client.js";
import { SUPPORT_SYSTEM_PROMPT } from "@/prompt-caching/corpus.js";
import {
    buildUsageReport,
    computeCost,
    sumTokenUsage,
    type CacheTtl,
    type TokenUsage,
    type UsageReport,
} from "@/prompt-caching/usage.js";
import { defaultProvider, type ProviderName } from "@/config/env.js";

export type CacheMode = "uncached" | "implicit" | "explicit";

export interface AskOptions {
    question: string;
    mode: CacheMode;
    provider?: ProviderName;
    ttl?: CacheTtl;
    maxTokens?: number;
    runId?: string;
}

export interface AskResult {
    question: string;
    mode: CacheMode;
    answer: string;
    model: string;
    provider: ProviderName;
    latencyMs: number;
    usage: UsageReport;
}

const buildSystem = (
    mode: CacheMode,
    ttl: CacheTtl,
    runId: string,
): Anthropic.TextBlockParam[] => {
    const text =
        mode === "uncached"
            ? `Session reference: ${runId}\n\n${SUPPORT_SYSTEM_PROMPT}`
            : SUPPORT_SYSTEM_PROMPT;

    return [
        {
            type: "text",
            text,
            ...(mode === "explicit"
                ? { cache_control: { type: "ephemeral" as const, ttl } }
                : {}),
        },
    ];
};

const readText = (content: Anthropic.ContentBlock[]): string =>
    content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

export const ask = async ({
    question,
    mode,
    provider,
    ttl = "5m",
    maxTokens = 512,
    runId = randomUUID(),
}: AskOptions): Promise<AskResult> => {
    const resolved = provider ?? defaultProvider;
    const client = getClient(resolved);
    const config = getProviderConfig(resolved);
    const startedAt = Date.now();

    const response = await client.messages.create({
        model: config.modelId,
        max_tokens: maxTokens,
        system: buildSystem(mode, ttl, runId),
        messages: [{ role: "user", content: question }],
    });

    return {
        question,
        mode,
        answer: readText(response.content),
        model: response.model,
        provider: resolved,
        latencyMs: Date.now() - startedAt,
        usage: buildUsageReport(response.usage, config, ttl),
    };
};

export interface RunOptions {
    questions: string[];
    mode: CacheMode;
    provider?: ProviderName;
    ttl?: CacheTtl;
}

export interface RunSummary {
    mode: CacheMode;
    ttl: CacheTtl;
    requests: number;
    tokens: TokenUsage;
    totalCost: number;
    costWithoutCaching: number;
    savings: number;
    savingsPercent: number;
    cacheHitRate: number;
    totalLatencyMs: number;
    turns: AskResult[];
}

export const run = async ({
    questions,
    mode,
    provider,
    ttl = "5m",
}: RunOptions): Promise<RunSummary> => {
    const resolved = provider ?? defaultProvider;
    const config = getProviderConfig(resolved);
    const turns: AskResult[] = [];
    const runId = randomUUID();

    for (const [index, question] of questions.entries()) {
        turns.push(
            await ask({
                question,
                mode,
                provider: resolved,
                ttl,
                runId: mode === "uncached" ? `${runId}-${index}` : runId,
            }),
        );
    }

    const tokens = sumTokenUsage(turns.map((turn) => turn.usage.tokens));
    const cost = computeCost(tokens, config, ttl);

    return {
        mode,
        ttl,
        requests: turns.length,
        tokens,
        totalCost: cost.totalCost,
        costWithoutCaching: cost.costWithoutCaching,
        savings: cost.savings,
        savingsPercent: cost.savingsPercent,
        cacheHitRate:
            tokens.totalInputTokens > 0
                ? (tokens.cacheReadInputTokens / tokens.totalInputTokens) * 100
                : 0,
        totalLatencyMs: turns.reduce((acc, turn) => acc + turn.latencyMs, 0),
        turns,
    };
};

export interface ComparisonDelta {
    costReduction: number;
    costReductionPercent: number;
    latencyReductionMs: number;
    cachedInputTokens: number;
}

export interface ComparisonResult {
    provider: ProviderName;
    model: string;
    ttl: CacheTtl;
    uncached: RunSummary;
    implicit: RunSummary;
    explicit: RunSummary;
    implicitVsUncached: ComparisonDelta;
    explicitVsUncached: ComparisonDelta;
    explicitVsImplicit: ComparisonDelta;
}

const delta = (baseline: RunSummary, candidate: RunSummary): ComparisonDelta => {
    const costReduction = baseline.totalCost - candidate.totalCost;
    return {
        costReduction,
        costReductionPercent:
            baseline.totalCost > 0 ? (costReduction / baseline.totalCost) * 100 : 0,
        latencyReductionMs: baseline.totalLatencyMs - candidate.totalLatencyMs,
        cachedInputTokens: candidate.tokens.cacheReadInputTokens,
    };
};

export const compare = async ({
    questions,
    provider,
    ttl = "5m",
}: Omit<RunOptions, "mode">): Promise<ComparisonResult> => {
    const resolved = provider ?? defaultProvider;
    const config = getProviderConfig(resolved);

    const uncached = await run({ questions, mode: "uncached", provider: resolved, ttl });
    const implicit = await run({ questions, mode: "implicit", provider: resolved, ttl });
    const explicit = await run({ questions, mode: "explicit", provider: resolved, ttl });

    return {
        provider: resolved,
        model: config.modelId,
        ttl,
        uncached,
        implicit,
        explicit,
        implicitVsUncached: delta(uncached, implicit),
        explicitVsUncached: delta(uncached, explicit),
        explicitVsImplicit: delta(implicit, explicit),
    };
};
