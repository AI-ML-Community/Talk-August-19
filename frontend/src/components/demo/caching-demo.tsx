"use client";

import * as React from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Metrics } from "@/components/demo/metrics";
import { ask, SAMPLE_QUESTIONS, type AskResult } from "@/lib/api";
import { CACHE_OPTIONS, USAGE_CODE, type LanguageId } from "@/lib/modes";

interface CachingDemoProps {
  // Snippets are highlighted on the server and handed down as HTML:
  // option id -> language -> highlighted markup.
  snippetHtml: Record<string, Record<LanguageId, string>>;
  usageCodeHtml: string;
}

export function CachingDemo({ snippetHtml, usageCodeHtml }: CachingDemoProps) {
  const [optionId, setOptionId] = React.useState<string>("off");
  const [pending, setPending] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AskResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Keyed by option id so switching cache mechanisms shows that mechanism's
  // own history — this is what makes the before/after comparison land.
  const [history, setHistory] = React.useState<Record<string, AskResult[]>>(
    () => Object.fromEntries(CACHE_OPTIONS.map((o) => [o.id, []])),
  );

  const active = CACHE_OPTIONS.find((o) => o.id === optionId)!;
  const runs = history[optionId] ?? [];

  async function send(question: string) {
    setPending(question);
    setError(null);
    try {
      const res = await ask(question, active.mode, active.ttl);
      setResult(res);
      setHistory((prev) => ({ ...prev, [optionId]: [...prev[optionId], res] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  function reset() {
    setHistory(Object.fromEntries(CACHE_OPTIONS.map((o) => [o.id, []])));
    setResult(null);
    setError(null);
  }

  // Averaged across every call made in this mode — a single call is noisy,
  // the running average is what actually holds up in front of an audience.
  const avgHitRate =
    runs.length > 0
      ? runs.reduce((a, r) => a + r.usage.cacheHitRate, 0) / runs.length
      : 0;
  const totalCost = runs.reduce((a, r) => a + r.usage.cost.totalCost, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CACHE_OPTIONS.map((o) => {
          const isActive = o.id === optionId;
          return (
            <button
              key={o.id}
              onClick={() => {
                setOptionId(o.id);
                setResult(history[o.id].at(-1) ?? null);
              }}
              className={cn(
                "space-y-3 rounded-xl border p-4 text-left transition-colors duration-150",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "hover:border-foreground/30",
              )}
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold">{o.label}</div>
                <div
                  className={cn(
                    "text-xs leading-snug",
                    isActive ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  {o.tagline}
                </div>
              </div>
              <div
                className={cn(
                  "flex gap-3 font-mono text-[11px] tabular-nums",
                  isActive ? "text-background/70" : "text-muted-foreground",
                )}
              >
                <span>write {o.writeCost}</span>
                <span>read {o.readCost}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {active.description}
        </p>
        <CodeDialog
          title={`${active.label} — ${active.tagline}`}
          description={active.description}
          html={snippetHtml[active.id]}
          raw={active.snippets}
        />
      </div>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask the support agent</CardTitle>
            <CardDescription>
              Each question reuses the same ~1,700 token policy handbook as its
              prefix. Click one to send it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SAMPLE_QUESTIONS.map((q) => {
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
              <div className="space-y-2 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {result.model}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {result.latencyMs}ms
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{result.answer}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Token consumption</CardTitle>
                <CardDescription>Reported by the API, not estimated</CardDescription>
              </div>
              <SingleCodeDialog
                title="Reading usage from the response"
                description="How the three token classes map to what you actually pay."
                html={usageCodeHtml}
                raw={USAGE_CODE}
              />
            </CardHeader>
            <CardContent>
              {result ? (
                <Metrics result={result} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Send a question to see token usage.
                </p>
              )}
            </CardContent>
          </Card>

          {runs.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="space-y-1.5">
                  <CardTitle className="text-base">
                    {active.label} · {runs.length}{" "}
                    {runs.length === 1 ? "call" : "calls"}
                  </CardTitle>
                  <CardDescription>
                    Running totals for this mechanism
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Avg hit rate
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums">
                    {avgHitRate.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Total spend
                  </div>
                  <div className="font-mono text-2xl font-semibold tabular-nums">
                    ${totalCost.toFixed(6)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
