import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildServers, type McpServerDefinition } from "@/mcp-tooling/servers.js";

export interface McpTool {
    server: string;
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface ServerCatalog {
    server: string;
    label: string;
    connected: boolean;
    error?: string;
    tools: McpTool[];
}

const connect = async (definition: McpServerDefinition): Promise<Client> => {
    const transport = new StreamableHTTPClientTransport(new URL(definition.url), {
        requestInit: definition.headers ? { headers: definition.headers } : undefined,
    });

    const client = new Client(
        { name: "talk-mcp-tooling", version: "1.0.0" },
        { capabilities: {} },
    );

    await client.connect(transport);
    return client;
};

export const fetchCatalog = async (
    definition: McpServerDefinition,
): Promise<ServerCatalog> => {
    try {
        const client = await connect(definition);
        const { tools } = await client.listTools();
        await client.close();

        return {
            server: definition.name,
            label: definition.label,
            connected: true,
            tools: tools.map((tool) => ({
                server: definition.name,
                name: tool.name,
                description: tool.description ?? "",
                inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
            })),
        };
    } catch (error) {
        return {
            server: definition.name,
            label: definition.label,
            connected: false,
            error: error instanceof Error ? error.message : String(error),
            tools: [],
        };
    }
};

let cache: ServerCatalog[] | null = null;

export const fetchAllCatalogs = async (refresh = false): Promise<ServerCatalog[]> => {
    if (cache && !refresh) return cache;
    cache = await Promise.all(buildServers().map(fetchCatalog));
    return cache;
};

export const callTool = async (
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
): Promise<string> => {
    const definition = buildServers().find((s) => s.name === serverName);
    if (!definition) throw new Error(`Unknown MCP server: ${serverName}`);

    const client = await connect(definition);
    try {
        const result = await client.callTool({ name: toolName, arguments: args });
        const content = Array.isArray(result.content) ? result.content : [];
        return content
            .map((block) =>
                typeof block === "object" && block !== null && "text" in block
                    ? String((block as { text: unknown }).text)
                    : JSON.stringify(block),
            )
            .join("\n");
    } finally {
        await client.close();
    }
};
