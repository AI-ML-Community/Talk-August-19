import { mcpEnv } from "@/config/env.js";

export interface McpServerDefinition {
    name: string;
    label: string;
    url: string;
    headers?: Record<string, string>;
    requiresKey: boolean;
}

export const buildServers = (): McpServerDefinition[] => {
    const servers: McpServerDefinition[] = [];

    if (mcpEnv.exaApiKey) {
        servers.push({
            name: "exa",
            label: "Exa",
            url: `https://mcp.exa.ai/mcp?exaApiKey=${mcpEnv.exaApiKey}`,
            requiresKey: true,
        });
    }

    if (mcpEnv.firecrawlApiKey) {
        servers.push({
            name: "firecrawl",
            label: "Firecrawl",
            url: `https://mcp.firecrawl.dev/${mcpEnv.firecrawlApiKey}/v2/mcp`,
            requiresKey: true,
        });
    }

    servers.push({
        name: "context7",
        label: "Context7",
        url: "https://mcp.context7.com/mcp",
        headers: mcpEnv.context7Key ? { CONTEXT7_API_KEY: mcpEnv.context7Key } : undefined,
        requiresKey: false,
    });

    servers.push({
        name: "aws-documentation",
        label: "AWS Documentation",
        url: "https://knowledge-mcp.global.api.aws",
        requiresKey: false,
    });

    return servers;
};

export const getServer = (name: string): McpServerDefinition | undefined =>
    buildServers().find((s) => s.name === name);
