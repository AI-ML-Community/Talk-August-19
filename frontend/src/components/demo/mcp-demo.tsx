"use client";

import * as React from "react";
import { ArrowRight, Loader2, Search, Server, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CodeDialog, SingleCodeDialog } from "@/components/demo/code-dialog";
import { runMcp, type McpCatalog, type McpRunResult, type ToolMode } from "@/lib/api";
import { TOOL_OPTIONS, MCP_USAGE_CODE } from "@/lib/mcp-modes";
import type { LanguageId } from "@/lib/modes";

const fmt = new Intl.NumberFormat("en-US");

interface McpDemoProps {
  catalog: McpCatalog | null;
  catalogError: string | null;
  snippetHtml: Record<ToolMode, Record<LanguageId, string>>;
  usageCodeHtml: string;
}

export function McpDemo({
  catalog,
  catalogError,
  snippetHtml,
  usageCodeHtml,
}: McpDemoProps) {
  const [mode, setMode] = React.useState<ToolMode>("naive");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<ToolMode, McpRunResult | null>>({
    naive: null,
    deferred: null,
  });

  const active = TOOL_OPTIONS.find((o) => o.id === mode)!;
  const result = results[mode];
  const questions = catalog?.questions ?? [];

  async function send(question: string) {
    setPending(question);
    setError(null);
    try {
      const res = await runMcp(question, mode);
      setResults((prev) => ({ ...prev, [mode]: res }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  // Only meaningful once both modes have run the same question.
  const naive = results.naive;
  const deferred = results.deferred;
  const comparable =
    naive && deferred && naive.question === deferred.question ? { naive, deferred } : null;

  const reduction = comparable
    ? (1 -
        comparable.deferred.firstTurnUsage.tokens.totalInputTokens /
          comparable.naive.firstTurnUsage.tokens.totalInputTokens) *
      100
    : 0;

  if (catalogError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm font-medium">Could not reach the MCP servers</p>
        <p className="mt-1 text-sm text-muted-foreground">{catalogError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {catalog?.servers.map((s) => (
          <div key={s.server} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Server className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-semibold tabular-nums">
                {s.toolCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.toolCount === 1 ? "tool" : "tools"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {s.connected ? "connected" : (s.error ?? "unavailable")}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border p-1">
          {TOOL_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setMode(o.id)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
                mode === o.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <CodeDialog
          title={`${active.label} — ${active.tagline}`}
          description={active.description}
          html={snippetHtml[mode]}
          raw={active.snippets}
        />
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {active.description}
      </p>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask across {catalog?.totalTools ?? 0} MCP tools</CardTitle>
            <CardDescription>
              Run the same question in both modes to compare what each costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.map((q) => {
              const isPending = pending === q;
              return (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={pending !== null}
                  className={cn(
                    "group flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm transition-colors duration-150",
                    "hover:border-foreground/25 disabled:opacity-50",
                    result?.question === q && "border-foreground/40 bg-muted/50",
                  )}
                >
                  <span className="leading-snug">{q}</span>
                  {isPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              );
            })}

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
                {result.searchQueries.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Search className="size-3" />
                      Claude searched for tools
                    </div>
                    {result.searchQueries.map((q, i) => (
                      <code
                        key={i}
                        className="block rounded border bg-background px-2 py-1 font-mono text-xs"
                      >
                        {q}
                      </code>
                    ))}
                  </div>
                ) : null}

                {result.toolCalls.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Wrench className="size-3" />
                      Tools called
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.toolCalls.map((c, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-[10px]">
                          {c.server}/{c.tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <p className="text-sm leading-relaxed">{result.answer}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Tool loading cost</CardTitle>
                <CardDescription>First turn, before any work</CardDescription>
              </div>
              <SingleCodeDialog
                title="Measuring deferred tool loading"
                description="Where the saving shows up in the response."
                html={usageCodeHtml}
                raw={MCP_USAGE_CODE}
              />
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-7">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Tools in context
                      </div>
                      <div className="font-mono text-3xl font-semibold tabular-nums">
                        {result.toolCount - result.deferredCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        of {result.toolCount} available
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        First-turn input
                      </div>
                      <div className="font-mono text-3xl font-semibold tabular-nums">
                        {fmt.format(result.firstTurnUsage.tokens.totalInputTokens)}
                      </div>
                      <div className="text-xs text-muted-foreground">tokens</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 border-t pt-6">
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        All turns
                      </div>
                      <div className="font-mono text-lg tabular-nums">
                        {fmt.format(result.usage.tokens.totalInputTokens)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Cost
                      </div>
                      <div className="font-mono text-lg tabular-nums">
                        ${result.usage.cost.totalCost.toFixed(4)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Latency
                      </div>
                      <div className="font-mono text-lg tabular-nums">
                        {(result.latencyMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Send a question to see tool loading cost.
                </p>
              )}
            </CardContent>
          </Card>

          {comparable ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Side by side</CardTitle>
                <CardDescription>Same question, both modes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(["naive", "deferred"] as const).map((m) => {
                  const r = comparable[m];
                  const opt = TOOL_OPTIONS.find((o) => o.id === m)!;
                  return (
                    <div key={m} className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{opt.label}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {fmt.format(r.firstTurnUsage.tokens.totalInputTokens)} tok · $
                        {r.usage.cost.totalCost.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-baseline justify-between border-t pt-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Tool loading cut by
                  </span>
                  <span className="font-mono text-2xl font-semibold tabular-nums">
                    {reduction.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
