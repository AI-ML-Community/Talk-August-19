import Anthropic from "@anthropic-ai/sdk";
import { anthropicEnv, mcpEnv } from "@/config/env.js";
import { fetchAllCatalogs, callTool, type McpTool } from "@/mcp-tooling/client.js";
import {
    buildUsageReport,
    extractUsage,
    sumTokenUsage,
    computeCost,
    type TokenUsage,
    type UsageReport,
} from "@/prompt-caching/usage.js";

export type ToolMode = "naive" | "deferred";

const SEARCH_TOOL_NAME = "tool_search_tool_regex";

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
    if (!anthropicEnv.apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required for the MCP tooling demo");
    }
    client ??= new Anthropic({ apiKey: anthropicEnv.apiKey });
    return client;
};

const qualifiedName = (tool: McpTool): string =>
    `${tool.server.replace(/-/g, "_")}__${tool.name}`.slice(0, 128);

const toAnthropicTool = (tool: McpTool, defer: boolean) => ({
    name: qualifiedName(tool),
    description: tool.description,
    input_schema: {
        ...(tool.inputSchema as Record<string, unknown>),
        type: "object" as const,
    },
    ...(defer ? { defer_loading: true } : {}),
});

const DEFAULT_PRIORITY = ["exa__web_search_exa", "context7__query-docs"];

const priorityFor = (names: string[] | undefined): Set<string> =>
    new Set(names ?? DEFAULT_PRIORITY);

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

const resolveTool = (all: McpTool[], name: string): McpTool | undefined =>
    all.find((t) => qualifiedName(t) === name);

export const run = async (
    question: string,
    mode: ToolMode,
    maxTurns = 6,
    priorityTools?: string[],
): Promise<McpRunResult> => {
    const priority = priorityFor(priorityTools);
    const catalogs = await fetchAllCatalogs();
    const allTools = catalogs.flatMap((c) => c.tools);
    const deferred = mode === "deferred";

    const tools: Anthropic.ToolUnion[] = [];
    if (deferred) {
        tools.push({
            type: "tool_search_tool_regex_20251119",
            name: SEARCH_TOOL_NAME,
        } as unknown as Anthropic.ToolUnion);
    }

    let deferredCount = 0;
    for (const tool of allTools) {
        const defer = deferred && !priority.has(qualifiedName(tool));
        if (defer) deferredCount += 1;
        tools.push(toAnthropicTool(tool, defer) as unknown as Anthropic.ToolUnion);
    }

    const messages: Anthropic.MessageParam[] = [
        { role: "user", content: question },
    ];

    const searchQueries: string[] = [];
    const discoveredTools: string[] = [];
    const toolCalls: ToolCallRecord[] = [];

    let firstTurnUsage: Anthropic.Usage | null = null;
    const perTurnTokens: TokenUsage[] = [];
    let answer = "";
    let turns = 0;
    const startedAt = Date.now();

    for (let turn = 0; turn < maxTurns; turn += 1) {
        turns = turn + 1;
        const response = await getClient().messages.create({
            model: mcpEnv.modelId,
            max_tokens: 2048,
            system: [
                {
                    type: "text",
                    text: "You are a research assistant with access to MCP tools. Use them to answer the question, then give a concise answer in under 100 words.",
                },
            ],
            tools,
            messages,
        });

        if (turn === 0) firstTurnUsage = response.usage;
        perTurnTokens.push(extractUsage(response.usage));

        for (const block of response.content) {
            if (block.type === "text") answer = block.text;
            if (block.type === "server_tool_use") {
                const input = block.input as { pattern?: string; query?: string };
                searchQueries.push(input.pattern ?? input.query ?? "");
            }
            if (block.type === "tool_search_tool_result") {
                const content = block.content as unknown as {
                    tool_references?: { tool_name: string }[];
                };
                for (const ref of content?.tool_references ?? []) {
                    discoveredTools.push(ref.tool_name);
                }
            }
        }

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason !== "tool_use") break;

        const uses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );
        if (uses.length === 0) break;

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of uses) {
            const tool = resolveTool(allTools, use.name);
            if (!tool) {
                results.push({
                    type: "tool_result",
                    tool_use_id: use.id,
                    content: `Unknown tool: ${use.name}`,
                    is_error: true,
                });
                continue;
            }
            try {
                const output = await callTool(
                    tool.server,
                    tool.name,
                    use.input as Record<string, unknown>,
                );
                const trimmed = output.slice(0, 4000);
                toolCalls.push({
                    server: tool.server,
                    tool: tool.name,
                    input: use.input as Record<string, unknown>,
                    resultPreview: trimmed.slice(0, 200),
                    ok: true,
                });
                results.push({
                    type: "tool_result",
                    tool_use_id: use.id,
                    content: trimmed,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                toolCalls.push({
                    server: tool.server,
                    tool: tool.name,
                    input: use.input as Record<string, unknown>,
                    resultPreview: message.slice(0, 200),
                    ok: false,
                });
                results.push({
                    type: "tool_result",
                    tool_use_id: use.id,
                    content: message,
                    is_error: true,
                });
            }
        }
        messages.push({ role: "user", content: results });
    }

    return {
        mode,
        question,
        model: mcpEnv.modelId,
        answer,
        latencyMs: Date.now() - startedAt,
        toolCount: allTools.length,
        deferredCount,
        searchQueries,
        discoveredTools,
        toolCalls,
        turns,
        usage: (() => {
            const tokens = sumTokenUsage(perTurnTokens);
            return {
                tokens,
                cost: computeCost(tokens, anthropicEnv),
                cacheHitRate:
                    tokens.totalInputTokens > 0
                        ? (tokens.cacheReadInputTokens / tokens.totalInputTokens) * 100
                        : 0,
            };
        })(),
        firstTurnUsage: buildUsageReport(
            firstTurnUsage ?? ({} as Anthropic.Usage),
            anthropicEnv,
        ),
    };
};

export interface McpComparison {
    question: string;
    model: string;
    naive: McpRunResult;
    deferred: McpRunResult;
    delta: {
        inputTokenReduction: number;
        inputTokenReductionPercent: number;
        costReduction: number;
        costReductionPercent: number;
    };
}

export const compare = async (
    question: string,
    priorityTools?: string[],
): Promise<McpComparison> => {
    const naive = await run(question, "naive");
    const deferred = await run(question, "deferred", 6, priorityTools);

    const naiveInput = naive.usage.tokens.totalInputTokens;
    const deferredInput = deferred.usage.tokens.totalInputTokens;
    const inputTokenReduction = naiveInput - deferredInput;
    const costReduction = naive.usage.cost.totalCost - deferred.usage.cost.totalCost;

    return {
        question,
        model: mcpEnv.modelId,
        naive,
        deferred,
        delta: {
            inputTokenReduction,
            inputTokenReductionPercent:
                naiveInput > 0 ? (inputTokenReduction / naiveInput) * 100 : 0,
            costReduction,
            costReductionPercent:
                naive.usage.cost.totalCost > 0
                    ? (costReduction / naive.usage.cost.totalCost) * 100
                    : 0,
        },
    };
};

export const SAMPLE_QUESTIONS = [
    "Search the web for what Anthropic's tool search tool does and summarize it.",
    "Find the Next.js documentation on the App Router and summarize routing basics.",
    "What does AWS documentation say about S3 bucket versioning?",
    "Scrape example.com and tell me what the page says.",
];
