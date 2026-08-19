import Anthropic from "@anthropic-ai/sdk";
import { providers, defaultProvider, type ProviderName } from "@/config/env.js";

const clients = new Map<ProviderName, Anthropic>();

export const getProviderConfig = (provider: ProviderName = defaultProvider) => providers[provider];

export const getClient = (provider: ProviderName = defaultProvider): Anthropic => {
    const existing = clients.get(provider);
    if (existing) return existing;

    const config = providers[provider];
    if (!config.apiKey) {
        throw new Error(`Missing API key for provider "${provider}"`);
    }

    const client = new Anthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });

    clients.set(provider, client);
    return client;
};
