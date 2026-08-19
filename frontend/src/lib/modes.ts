import type { CacheMode, CacheTtl } from "@/lib/api";

export type LanguageId =
  | "curl"
  | "typescript"
  | "python"
  | "go"
  | "java"
  | "csharp"
  | "php"
  | "ruby";

export interface Language {
  id: LanguageId;
  label: string;
  /** Shiki grammar name, which differs from our display label. */
  grammar: string;
}

export const LANGUAGES: Language[] = [
  { id: "curl", label: "cURL", grammar: "bash" },
  { id: "typescript", label: "TypeScript", grammar: "typescript" },
  { id: "python", label: "Python", grammar: "python" },
  { id: "go", label: "Go", grammar: "go" },
  { id: "java", label: "Java", grammar: "java" },
  { id: "csharp", label: "C#", grammar: "csharp" },
  { id: "php", label: "PHP", grammar: "php" },
  { id: "ruby", label: "Ruby", grammar: "ruby" },
];

export interface CacheOption {
  /** Sent to the backend: which prefix strategy to use. */
  mode: CacheMode;
  /** Only meaningful when mode === "explicit". */
  ttl?: CacheTtl;
  id: string;
  label: string;
  tagline: string;
  description: string;
  /** Multiplier applied to the input rate for a cache write, if any. */
  writeCost: string;
  readCost: string;
  snippets: Record<LanguageId, string>;
}

// Every snippet below shows the SAME request in each language, differing only
// in how (or whether) the system block is marked cacheable. That is deliberate:
// the audience should see that caching is a one-line change in their stack.

const NO_CACHE: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 512,
    "system": [
      { "type": "text", "text": "<policy handbook>" }
    ],
    "messages": [
      { "role": "user", "content": "What is the refund window?" }
    ]
  }'`,
  typescript: `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 512,
  system: [
    { type: "text", text: POLICY_HANDBOOK },
    // no cache_control — every token is billed at the full input rate
  ],
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.messages.create(
    model="claude-opus-5",
    max_tokens=512,
    system=[
        {"type": "text", "text": POLICY_HANDBOOK},
        # no cache_control — every token is billed at the full input rate
    ],
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus5,
    MaxTokens: 512,
    System: []anthropic.TextBlockParam{{
        Text: policyHandbook,
        // no CacheControl — every token is billed at the full input rate
    }},
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_5)
    .maxTokens(512)
    // no cacheControl — every token is billed at the full input rate
    .systemOfTextBlockParams(List.of(
        TextBlockParam.builder()
            .text(policyHandbook)
            .build()))
    .addUserMessage(question)
    .build();`,
  csharp: `var response = await client.Messages.Create(new MessageCreateParams {
    Model = Model.ClaudeOpus5,
    MaxTokens = 512,
    System = new List<TextBlockParam> {
        new() {
            Text = policyHandbook,
            // no CacheControl — every token billed at the full input rate
        },
    },
    Messages = [new() { Role = "user", Content = question }],
});`,
  php: `$message = $client->messages->create(
    model: 'claude-opus-5',
    maxTokens: 512,
    system: [
        // no cacheControl — every token billed at the full input rate
        ['type' => 'text', 'text' => $policyHandbook],
    ],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `message = client.messages.create(
  model: :"claude-opus-5",
  max_tokens: 512,
  system_: [
    # no cache_control — every token is billed at the full input rate
    { type: "text", text: policy_handbook }
  ],
  messages: [{ role: "user", content: question }]
)`,
};

const STANDARD: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 512,
    "cache_control": { "type": "ephemeral" },
    "system": [
      { "type": "text", "text": "<policy handbook>" }
    ],
    "messages": [
      { "role": "user", "content": "What is the refund window?" }
    ]
  }'`,
  typescript: `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 512,
  // Top-level cache_control auto-places the breakpoint on the last
  // cacheable block. Simplest option when you do not need fine control.
  cache_control: { type: "ephemeral" },
  system: [{ type: "text", text: POLICY_HANDBOOK }],
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.messages.create(
    model="claude-opus-5",
    max_tokens=512,
    # Top-level cache_control auto-places the breakpoint on the last
    # cacheable block. Simplest option when you do not need fine control.
    cache_control={"type": "ephemeral"},
    system=[{"type": "text", "text": POLICY_HANDBOOK}],
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus5,
    MaxTokens: 512,
    // Top-level CacheControl auto-places on the last cacheable block.
    CacheControl: anthropic.NewCacheControlEphemeralParam(),
    System: []anthropic.TextBlockParam{{Text: policyHandbook}},
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_5)
    .maxTokens(512)
    // Top-level cacheControl auto-places on the last cacheable block.
    .cacheControl(CacheControlEphemeral.builder().build())
    .systemOfTextBlockParams(List.of(
        TextBlockParam.builder().text(policyHandbook).build()))
    .addUserMessage(question)
    .build();`,
  csharp: `var response = await client.Messages.Create(new MessageCreateParams {
    Model = Model.ClaudeOpus5,
    MaxTokens = 512,
    // Top-level CacheControl auto-places on the last cacheable block.
    CacheControl = new CacheControlEphemeral(),
    System = new List<TextBlockParam> {
        new() { Text = policyHandbook },
    },
    Messages = [new() { Role = "user", Content = question }],
});`,
  php: `$message = $client->messages->create(
    model: 'claude-opus-5',
    maxTokens: 512,
    // Top-level cacheControl auto-places on the last cacheable block.
    cacheControl: ['type' => 'ephemeral'],
    system: [['type' => 'text', 'text' => $policyHandbook]],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `message = client.messages.create(
  model: :"claude-opus-5",
  max_tokens: 512,
  # Top-level cache_control auto-places on the last cacheable block.
  cache_control: { type: "ephemeral" },
  system_: [{ type: "text", text: policy_handbook }],
  messages: [{ role: "user", content: question }]
)`,
};

const TTL_5M: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 512,
    "system": [
      {
        "type": "text",
        "text": "<policy handbook>",
        "cache_control": { "type": "ephemeral" }
      }
    ],
    "messages": [
      { "role": "user", "content": "What is the refund window?" }
    ]
  }'`,
  typescript: `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 512,
  system: [
    {
      type: "text",
      text: POLICY_HANDBOOK,
      // 5 minutes is the default TTL — the ttl field is optional here.
      // Every hit inside the window resets the 5 minute clock.
      cache_control: { type: "ephemeral", ttl: "5m" },
    },
  ],
  // The question is volatile, so it sits AFTER the breakpoint and
  // never invalidates the cached prefix above it.
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.messages.create(
    model="claude-opus-5",
    max_tokens=512,
    system=[
        {
            "type": "text",
            "text": POLICY_HANDBOOK,
            # 5 minutes is the default TTL — "ttl" is optional here.
            # Every hit inside the window resets the 5 minute clock.
            "cache_control": {"type": "ephemeral", "ttl": "5m"},
        }
    ],
    # The question is volatile, so it sits AFTER the breakpoint.
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus5,
    MaxTokens: 512,
    System: []anthropic.TextBlockParam{{
        Text: policyHandbook,
        // NewCacheControlEphemeralParam defaults to the 5 minute TTL.
        CacheControl: anthropic.NewCacheControlEphemeralParam(),
    }},
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_5)
    .maxTokens(512)
    .systemOfTextBlockParams(List.of(
        TextBlockParam.builder()
            .text(policyHandbook)
            // TTL_5M is the default; stated here for clarity.
            .cacheControl(CacheControlEphemeral.builder()
                .ttl(CacheControlEphemeral.Ttl.TTL_5M)
                .build())
            .build()))
    .addUserMessage(question)
    .build();`,
  csharp: `var response = await client.Messages.Create(new MessageCreateParams {
    Model = Model.ClaudeOpus5,
    MaxTokens = 512,
    System = new List<TextBlockParam> {
        new() {
            Text = policyHandbook,
            // Ttl5m is the default; stated here for clarity.
            CacheControl = new CacheControlEphemeral { Ttl = Ttl.Ttl5m },
        },
    },
    Messages = [new() { Role = "user", Content = question }],
});`,
  php: `$message = $client->messages->create(
    model: 'claude-opus-5',
    maxTokens: 512,
    system: [
        [
            'type' => 'text',
            'text' => $policyHandbook,
            // 5 minutes is the default TTL — 'ttl' is optional here.
            'cacheControl' => ['type' => 'ephemeral', 'ttl' => '5m'],
        ],
    ],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `message = client.messages.create(
  model: :"claude-opus-5",
  max_tokens: 512,
  system_: [
    {
      type: "text",
      text: policy_handbook,
      # 5 minutes is the default TTL — :ttl is optional here.
      cache_control: { type: "ephemeral", ttl: "5m" }
    }
  ],
  messages: [{ role: "user", content: question }]
)`,
};

const TTL_1H: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 512,
    "system": [
      {
        "type": "text",
        "text": "<policy handbook>",
        "cache_control": { "type": "ephemeral", "ttl": "1h" }
      }
    ],
    "messages": [
      { "role": "user", "content": "What is the refund window?" }
    ]
  }'`,
  typescript: `const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 512,
  system: [
    {
      type: "text",
      text: POLICY_HANDBOOK,
      // 1 hour survives gaps in bursty traffic, but the write costs 2x
      // instead of 1.25x — you need ~3 reads to break even, not 2.
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ],
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.messages.create(
    model="claude-opus-5",
    max_tokens=512,
    system=[
        {
            "type": "text",
            "text": POLICY_HANDBOOK,
            # 1 hour survives gaps in bursty traffic, but the write costs
            # 2x instead of 1.25x — ~3 reads to break even, not 2.
            "cache_control": {"type": "ephemeral", "ttl": "1h"},
        }
    ],
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
    Model:     anthropic.ModelClaudeOpus5,
    MaxTokens: 512,
    System: []anthropic.TextBlockParam{{
        Text: policyHandbook,
        // 1 hour TTL: write costs 2x, so it needs ~3 reads to pay off.
        CacheControl: anthropic.CacheControlEphemeralParam{
            TTL: anthropic.CacheControlEphemeralTTLTTL1h,
        },
    }},
    Messages: []anthropic.MessageParam{
        anthropic.NewUserMessage(anthropic.NewTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_OPUS_5)
    .maxTokens(512)
    .systemOfTextBlockParams(List.of(
        TextBlockParam.builder()
            .text(policyHandbook)
            // 1 hour TTL: write costs 2x, needs ~3 reads to pay off.
            .cacheControl(CacheControlEphemeral.builder()
                .ttl(CacheControlEphemeral.Ttl.TTL_1H)
                .build())
            .build()))
    .addUserMessage(question)
    .build();`,
  csharp: `var response = await client.Messages.Create(new MessageCreateParams {
    Model = Model.ClaudeOpus5,
    MaxTokens = 512,
    System = new List<TextBlockParam> {
        new() {
            Text = policyHandbook,
            // 1 hour TTL: write costs 2x, needs ~3 reads to pay off.
            CacheControl = new CacheControlEphemeral { Ttl = Ttl.Ttl1h },
        },
    },
    Messages = [new() { Role = "user", Content = question }],
});`,
  php: `$message = $client->messages->create(
    model: 'claude-opus-5',
    maxTokens: 512,
    system: [
        [
            'type' => 'text',
            'text' => $policyHandbook,
            // 1 hour TTL: write costs 2x, needs ~3 reads to pay off.
            'cacheControl' => ['type' => 'ephemeral', 'ttl' => '1h'],
        ],
    ],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `message = client.messages.create(
  model: :"claude-opus-5",
  max_tokens: 512,
  system_: [
    {
      type: "text",
      text: policy_handbook,
      # 1 hour TTL: write costs 2x, needs ~3 reads to pay off.
      cache_control: { type: "ephemeral", ttl: "1h" }
    }
  ],
  messages: [{ role: "user", content: question }]
)`,
};

export const CACHE_OPTIONS: CacheOption[] = [
  {
    id: "off",
    mode: "uncached",
    label: "No cache",
    tagline: "Every token at full price",
    description:
      "No cache_control anywhere. A unique session id is prepended to the prefix so the provider's automatic cache cannot hit either — this is the honest baseline every other mode is measured against.",
    writeCost: "—",
    readCost: "—",
    snippets: NO_CACHE,
  },
  {
    id: "standard",
    mode: "implicit",
    label: "Standard",
    tagline: "Provider decides, you pay 20%",
    description:
      "The prefix is stable but unmarked. Qwen caches it implicitly anyway — this is on by default and cannot be disabled — and bills hits at 20% of the input rate. Anthropic offers the equivalent as top-level cache_control, which auto-places the breakpoint for you.",
    writeCost: "1.0x",
    readCost: "0.2x",
    snippets: STANDARD,
  },
  {
    id: "5m",
    mode: "explicit",
    ttl: "5m",
    label: "5 minutes",
    tagline: "Default TTL, cheapest write",
    description:
      "One explicit breakpoint with the default 5 minute TTL, refreshed on every hit. The write costs 1.25x and each read costs 10%, so it pays for itself from the second request onward. This is the right default for continuous traffic.",
    writeCost: "1.25x",
    readCost: "0.1x",
    snippets: TTL_5M,
  },
  {
    id: "1h",
    mode: "explicit",
    ttl: "1h",
    label: "1 hour",
    tagline: "Survives gaps, pricier write",
    description:
      "Same breakpoint, longer window. Keeps the prefix alive across idle gaps in bursty traffic, but the write costs 2x rather than 1.25x — so it needs roughly three reads to break even instead of two.",
    writeCost: "2.0x",
    readCost: "0.1x",
    snippets: TTL_1H,
  },
];

export const USAGE_CODE = `// The response tells us exactly what was cached.
// These three fields are the entire measurement story:
const { usage } = response;

usage.input_tokens;                 // paid at 1.0x  — never cached
usage.cache_creation_input_tokens;  // paid at 1.25x — written to cache
usage.cache_read_input_tokens;      // paid at 0.1x  — served from cache

// Total prompt size is the SUM of all three, not input_tokens alone.
const totalInput =
  usage.input_tokens +
  usage.cache_creation_input_tokens +
  usage.cache_read_input_tokens;

// Cost with caching vs the counterfactual bill without it
const inputRate = pricing.inputPricePerMTok / 1_000_000;
const totalCost =
  usage.input_tokens * inputRate +
  usage.cache_creation_input_tokens * inputRate * 1.25 +
  usage.cache_read_input_tokens * inputRate * 0.1 +
  usage.output_tokens * (pricing.outputPricePerMTok / 1_000_000);

const costWithoutCaching =
  totalInput * inputRate +
  usage.output_tokens * (pricing.outputPricePerMTok / 1_000_000);`;

export const getOption = (id: string): CacheOption =>
  CACHE_OPTIONS.find((o) => o.id === id) ?? CACHE_OPTIONS[0];
