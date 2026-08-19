import type { LanguageId } from "@/lib/modes";
import type { ToolMode } from "@/lib/api";

export interface ToolOption {
  id: ToolMode;
  label: string;
  tagline: string;
  description: string;
  snippets: Record<LanguageId, string>;
}

// Every snippet shows the same request, differing only in whether tool
// definitions are loaded up front or discovered on demand.

const NAIVE: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "anthropic-beta: mcp-client-2025-11-20" \\
  -d '{
    "model": "claude-sonnet-5",
    "max_tokens": 2048,
    "messages": [{"role": "user", "content": "..."}],
    "mcp_servers": [
      { "type": "url", "url": "https://mcp.exa.ai/mcp", "name": "exa" },
      { "type": "url", "url": "https://mcp.context7.com/mcp", "name": "context7" }
    ],
    "tools": [
      { "type": "mcp_toolset", "mcp_server_name": "exa" },
      { "type": "mcp_toolset", "mcp_server_name": "context7" }
    ]
  }'`,
  typescript: `const response = await client.beta.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 2048,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [
    { type: "url", url: "https://mcp.exa.ai/mcp", name: "exa" },
    { type: "url", url: "https://mcp.context7.com/mcp", name: "context7" },
  ],
  // Every tool from every server loads into context before Claude
  // does any work. 35 tools here costs ~20k tokens per request.
  tools: [
    { type: "mcp_toolset", mcp_server_name: "exa" },
    { type: "mcp_toolset", mcp_server_name: "context7" },
  ],
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.beta.messages.create(
    model="claude-sonnet-5",
    max_tokens=2048,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[
        {"type": "url", "url": "https://mcp.exa.ai/mcp", "name": "exa"},
        {"type": "url", "url": "https://mcp.context7.com/mcp", "name": "context7"},
    ],
    # Every tool from every server loads into context before Claude
    # does any work. 35 tools here costs ~20k tokens per request.
    tools=[
        {"type": "mcp_toolset", "mcp_server_name": "exa"},
        {"type": "mcp_toolset", "mcp_server_name": "context7"},
    ],
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Beta.Messages.New(ctx, anthropic.BetaMessageNewParams{
    Model:     anthropic.ModelClaudeSonnet5,
    MaxTokens: 2048,
    Betas:     []anthropic.AnthropicBeta{anthropic.AnthropicBetaMCPClient2025_11_20},
    MCPServers: []anthropic.BetaRequestMCPServerURLDefinitionParam{
        {URL: "https://mcp.exa.ai/mcp", Name: "exa"},
    },
    // All tools load up front — no deferral.
    Tools: []anthropic.BetaToolUnionParam{
        {OfMCPToolset: &anthropic.BetaMCPToolsetParam{MCPServerName: "exa"}},
    },
    Messages: []anthropic.BetaMessageParam{
        anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_SONNET_5)
    .maxTokens(2048L)
    .addBeta(AnthropicBeta.MCP_CLIENT_2025_11_20)
    .addMcpServer(BetaRequestMcpServerUrlDefinition.builder()
        .url("https://mcp.exa.ai/mcp")
        .name("exa")
        .build())
    // All tools load up front — no deferral.
    .addTool(BetaMcpToolset.builder()
        .mcpServerName("exa")
        .build())
    .addUserMessage(question)
    .build();`,
  csharp: `var parameters = new MessageCreateParams {
    Model = Model.ClaudeSonnet5,
    MaxTokens = 2048,
    Betas = [AnthropicBeta.McpClient2025_11_20],
    McpServers = new List<BetaRequestMcpServerUrlDefinition> {
        new() { Url = "https://mcp.exa.ai/mcp", Name = "exa" },
    },
    // All tools load up front — no deferral.
    Tools = new List<BetaToolUnion> { new BetaMcpToolset("exa") },
    Messages = [new() { Role = Role.User, Content = question }],
};`,
  php: `$message = $client->beta->messages->create(
    model: 'claude-sonnet-5',
    maxTokens: 2048,
    betas: ['mcp-client-2025-11-20'],
    mcpServers: [
        ['type' => 'url', 'url' => 'https://mcp.exa.ai/mcp', 'name' => 'exa'],
    ],
    // All tools load up front — no deferral.
    tools: [['type' => 'mcp_toolset', 'mcp_server_name' => 'exa']],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `response = client.beta.messages.create(
  model: "claude-sonnet-5",
  max_tokens: 2048,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [
    { type: "url", url: "https://mcp.exa.ai/mcp", name: "exa" }
  ],
  # All tools load up front — no deferral.
  tools: [{ type: "mcp_toolset", mcp_server_name: "exa" }],
  messages: [{ role: "user", content: question }]
)`,
};

const DEFERRED: Record<LanguageId, string> = {
  curl: `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "anthropic-beta: mcp-client-2025-11-20" \\
  -d '{
    "model": "claude-sonnet-5",
    "max_tokens": 2048,
    "messages": [{"role": "user", "content": "..."}],
    "mcp_servers": [
      { "type": "url", "url": "https://mcp.exa.ai/mcp", "name": "exa" }
    ],
    "tools": [
      { "type": "tool_search_tool_regex_20251119",
        "name": "tool_search_tool_regex" },
      { "type": "mcp_toolset",
        "mcp_server_name": "exa",
        "default_config": { "defer_loading": true },
        "configs": { "web_search_exa": { "defer_loading": false } } }
    ]
  }'`,
  typescript: `const response = await client.beta.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 2048,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [
    { type: "url", url: "https://mcp.exa.ai/mcp", name: "exa" },
  ],
  tools: [
    // The search tool itself must never be deferred.
    { type: "tool_search_tool_regex_20251119", name: "tool_search_tool_regex" },
    {
      type: "mcp_toolset",
      mcp_server_name: "exa",
      // Defer the whole server, then keep your 3-5 most-used tools
      // loaded. Deferring everything is measurably worse.
      default_config: { defer_loading: true },
      configs: { web_search_exa: { defer_loading: false } },
    },
  ],
  messages: [{ role: "user", content: question }],
});`,
  python: `response = client.beta.messages.create(
    model="claude-sonnet-5",
    max_tokens=2048,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[
        {"type": "url", "url": "https://mcp.exa.ai/mcp", "name": "exa"},
    ],
    tools=[
        # The search tool itself must never be deferred.
        {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
        {
            "type": "mcp_toolset",
            "mcp_server_name": "exa",
            # Defer the whole server, then keep your 3-5 most-used tools
            # loaded. Deferring everything is measurably worse.
            "default_config": {"defer_loading": True},
            "configs": {"web_search_exa": {"defer_loading": False}},
        },
    ],
    messages=[{"role": "user", "content": question}],
)`,
  go: `resp, err := client.Beta.Messages.New(ctx, anthropic.BetaMessageNewParams{
    Model:     anthropic.ModelClaudeSonnet5,
    MaxTokens: 2048,
    Betas:     []anthropic.AnthropicBeta{anthropic.AnthropicBetaMCPClient2025_11_20},
    MCPServers: []anthropic.BetaRequestMCPServerURLDefinitionParam{
        {URL: "https://mcp.exa.ai/mcp", Name: "exa"},
    },
    Tools: []anthropic.BetaToolUnionParam{
        // The search tool itself must never be deferred.
        {OfToolSearchToolRegex20251119: &anthropic.ToolSearchToolRegex20251119Param{}},
        {OfMCPToolset: &anthropic.BetaMCPToolsetParam{
            MCPServerName: "exa",
            DefaultConfig: &anthropic.BetaMCPToolConfigParam{
                DeferLoading: anthropic.Bool(true),
            },
        }},
    },
    Messages: []anthropic.BetaMessageParam{
        anthropic.NewBetaUserMessage(anthropic.NewBetaTextBlock(question)),
    },
})`,
  java: `MessageCreateParams params = MessageCreateParams.builder()
    .model(Model.CLAUDE_SONNET_5)
    .maxTokens(2048L)
    .addBeta(AnthropicBeta.MCP_CLIENT_2025_11_20)
    .addMcpServer(BetaRequestMcpServerUrlDefinition.builder()
        .url("https://mcp.exa.ai/mcp")
        .name("exa")
        .build())
    // The search tool itself must never be deferred.
    .addTool(ToolSearchToolRegex20251119.builder().build())
    .addTool(BetaMcpToolset.builder()
        .mcpServerName("exa")
        .defaultConfig(BetaMcpToolConfig.builder()
            .deferLoading(true)
            .build())
        .build())
    .addUserMessage(question)
    .build();`,
  csharp: `var parameters = new MessageCreateParams {
    Model = Model.ClaudeSonnet5,
    MaxTokens = 2048,
    Betas = [AnthropicBeta.McpClient2025_11_20],
    McpServers = new List<BetaRequestMcpServerUrlDefinition> {
        new() { Url = "https://mcp.exa.ai/mcp", Name = "exa" },
    },
    Tools = new List<BetaToolUnion> {
        // The search tool itself must never be deferred.
        new ToolSearchToolRegex20251119(),
        new BetaMcpToolset("exa") {
            DefaultConfig = new() { DeferLoading = true },
        },
    },
    Messages = [new() { Role = Role.User, Content = question }],
};`,
  php: `$message = $client->beta->messages->create(
    model: 'claude-sonnet-5',
    maxTokens: 2048,
    betas: ['mcp-client-2025-11-20'],
    mcpServers: [
        ['type' => 'url', 'url' => 'https://mcp.exa.ai/mcp', 'name' => 'exa'],
    ],
    tools: [
        // The search tool itself must never be deferred.
        ['type' => 'tool_search_tool_regex_20251119',
         'name' => 'tool_search_tool_regex'],
        ['type' => 'mcp_toolset',
         'mcp_server_name' => 'exa',
         'default_config' => ['defer_loading' => true],
         'configs' => ['web_search_exa' => ['defer_loading' => false]]],
    ],
    messages: [['role' => 'user', 'content' => $question]],
);`,
  ruby: `response = client.beta.messages.create(
  model: "claude-sonnet-5",
  max_tokens: 2048,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [
    { type: "url", url: "https://mcp.exa.ai/mcp", name: "exa" }
  ],
  tools: [
    # The search tool itself must never be deferred.
    { type: "tool_search_tool_regex_20251119", name: "tool_search_tool_regex" },
    { type: "mcp_toolset",
      mcp_server_name: "exa",
      default_config: { defer_loading: true },
      configs: { web_search_exa: { defer_loading: false } } }
  ],
  messages: [{ role: "user", content: question }]
)`,
};

export const TOOL_OPTIONS: ToolOption[] = [
  {
    id: "naive",
    label: "Load everything",
    tagline: "All 35 tools in context, every call",
    description:
      "Every tool definition from every connected MCP server is serialized into the prompt prefix before Claude does any work. You pay for all of them on every request, whether or not any get used.",
    snippets: NAIVE,
  },
  {
    id: "deferred",
    label: "Tool search",
    tagline: "Claude finds what it needs",
    description:
      "Tools are declared with defer_loading, so they stay out of the context window until Claude searches for them. Discovered tools are appended inline rather than in the prefix, which means the prompt cache survives.",
    snippets: DEFERRED,
  },
];

export const MCP_USAGE_CODE = `// Deferred tools never enter the prefix, so the first turn is where
// the saving shows up most clearly.
const first = response.usage;

first.input_tokens; // ~20k loading all 35 tools, ~1.8k deferred

// When Claude needs a tool it does not have, it searches:
for (const block of response.content) {
  if (block.type === "server_tool_use") {
    block.input.pattern; // e.g. "aws|s3|documentation"
  }
  if (block.type === "tool_search_tool_result") {
    // The API expands these into full definitions automatically.
    block.content.tool_references; // [{ tool_name: "aws___search_documentation" }]
  }
}

// Deferred tools cannot also carry cache_control — that is a 400.
// Put the cache breakpoint on a tool you are NOT deferring.`;
