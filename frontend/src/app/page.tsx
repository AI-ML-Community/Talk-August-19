import { CachingDemo } from "@/components/demo/caching-demo";
import { McpDemo } from "@/components/demo/mcp-demo";
import { highlight } from "@/lib/highlight";
import {
  CACHE_OPTIONS,
  LANGUAGES,
  USAGE_CODE,
  type LanguageId,
} from "@/lib/modes";
import { TOOL_OPTIONS, MCP_USAGE_CODE } from "@/lib/mcp-modes";
import { fetchCatalog, type McpCatalog, type ToolMode } from "@/lib/api";

// The catalog is fetched live from the MCP servers, so never prerender it.
export const dynamic = "force-dynamic";

async function highlightAll<T extends string>(
  options: { id: T; snippets: Record<LanguageId, string> }[],
) {
  const entries = await Promise.all(
    options.map(async (option) => {
      const perLanguage = Object.fromEntries(
        await Promise.all(
          LANGUAGES.map(async (l) => [
            l.id,
            await highlight(option.snippets[l.id], l.grammar),
          ]),
        ),
      ) as Record<LanguageId, string>;
      return [option.id, perLanguage] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<T, Record<LanguageId, string>>;
}

function SectionHeading({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12 max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {index}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export default async function Home() {
  const [cacheSnippets, mcpSnippets, usageCodeHtml, mcpUsageCodeHtml] =
    await Promise.all([
      highlightAll(CACHE_OPTIONS),
      highlightAll(TOOL_OPTIONS),
      highlight(USAGE_CODE),
      highlight(MCP_USAGE_CODE),
    ]);

  // A dead MCP server should degrade this section, not take down the page.
  let catalog: McpCatalog | null = null;
  let catalogError: string | null = null;
  try {
    catalog = await fetchCatalog();
  } catch (err) {
    catalogError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <header className="mb-24 max-w-3xl space-y-5 md:mb-32">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Live demo
        </p>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          How to cut API costs without compromising agent reliability
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Two levers, measured live against real providers. Nothing here is
          estimated — every number comes back from the API.
        </p>
      </header>

      <section id="prompt-caching">
        <SectionHeading index="01" title="Prompt caching">
          Same model, same questions, same answers. The only thing that changes
          is how we tell the provider which part of the prompt is stable.
        </SectionHeading>
        <CachingDemo
          snippetHtml={cacheSnippets}
          usageCodeHtml={usageCodeHtml}
        />
      </section>

      <div className="my-32 md:my-48" aria-hidden />

      <section id="mcp-tooling">
        <SectionHeading index="02" title="MCP tooling">
          Connect a handful of MCP servers and their tool definitions land in
          context before Claude does any work. Tool search loads only what the
          request actually needs.
        </SectionHeading>
        <McpDemo
          catalog={catalog}
          catalogError={catalogError}
          snippetHtml={mcpSnippets as Record<ToolMode, Record<LanguageId, string>>}
          usageCodeHtml={mcpUsageCodeHtml}
        />
      </section>
    </main>
  );
}
