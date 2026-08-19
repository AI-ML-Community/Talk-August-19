"use client";

import { cn } from "@/lib/utils";
import type { AskResult } from "@/lib/api";

const fmt = new Intl.NumberFormat("en-US");

// Costs land around $0.001 — six decimals keeps the difference legible on stage.
const money = (n: number) => `$${n.toFixed(6)}`;

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-3xl font-semibold tracking-tight" : "text-lg",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

// Three token classes, three prices. This bar is the whole argument of the talk:
// the darker the bar leans right, the more of the prompt is being billed at 10%.
function TokenBar({ result }: { result: AskResult }) {
  const { tokens } = result.usage;
  const total = tokens.totalInputTokens || 1;

  const segments = [
    {
      key: "full",
      label: "Full price",
      value: tokens.uncachedInputTokens,
      className: "bg-foreground",
    },
    {
      key: "write",
      label: "Cache write",
      value: tokens.cacheCreationInputTokens,
      className: "bg-foreground/45",
    },
    {
      key: "read",
      label: "Cache read",
      value: tokens.cacheReadInputTokens,
      className: "bg-foreground/15",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className={cn("transition-[width] duration-500 ease-out", s.className)}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs">
            <span className={cn("size-2 rounded-full", s.className)} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-mono tabular-nums">{fmt.format(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Metrics({ result }: { result: AskResult }) {
  const { tokens, cost, cacheHitRate } = result.usage;

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-6">
        <Stat
          label="Cache hit rate"
          value={`${cacheHitRate.toFixed(1)}%`}
          hint={`${fmt.format(tokens.cacheReadInputTokens)} of ${fmt.format(tokens.totalInputTokens)} input tokens`}
          emphasis
        />
        <Stat
          label="Cost this call"
          value={money(cost.totalCost)}
          hint={
            cost.savings > 0
              ? `${money(cost.costWithoutCaching)} without caching`
              : "no caching applied"
          }
          emphasis
        />
      </div>

      <TokenBar result={result} />

      <div className="grid grid-cols-3 gap-6 border-t pt-6">
        <Stat label="Input tokens" value={fmt.format(tokens.totalInputTokens)} />
        <Stat label="Output tokens" value={fmt.format(tokens.outputTokens)} />
        <Stat label="Latency" value={`${fmt.format(result.latencyMs)}ms`} />
      </div>

      {cost.savings > 0 ? (
        <div className="flex items-baseline justify-between border-t pt-6">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Saved vs no caching
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {cost.savingsPercent.toFixed(1)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
