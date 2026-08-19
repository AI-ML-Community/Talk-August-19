import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ask, compare, run } from "@/prompt-caching/service.js";
import { SAMPLE_QUESTIONS } from "@/prompt-caching/corpus.js";
import { defaultProvider } from "@/config/env.js";

const providerSchema = z.enum(["qwen", "anthropic"]).optional();
const ttlSchema = z.enum(["5m", "1h"]).optional();
const modeSchema = z.enum(["uncached", "implicit", "explicit"]);

const askSchema = z.object({
    question: z.string().min(1),
    mode: modeSchema.default("explicit"),
    provider: providerSchema,
    ttl: ttlSchema,
});

const runSchema = z.object({
    questions: z.array(z.string().min(1)).min(1).default(SAMPLE_QUESTIONS),
    mode: modeSchema.default("explicit"),
    provider: providerSchema,
    ttl: ttlSchema,
});

const compareSchema = z.object({
    questions: z.array(z.string().min(1)).min(1).default(SAMPLE_QUESTIONS),
    provider: providerSchema,
    ttl: ttlSchema,
});

const handle = async (res: Response, work: () => Promise<unknown>): Promise<void> => {
    try {
        res.status(200).json(await work());
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: message });
    }
};

export const promptCachingRouter: Router = Router();

promptCachingRouter.get("/samples", (_req: Request, res: Response) => {
    res.status(200).json({ provider: defaultProvider, questions: SAMPLE_QUESTIONS });
});

promptCachingRouter.post("/ask", (req: Request, res: Response) => {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: z.treeifyError(parsed.error) });
        return;
    }
    void handle(res, () => ask(parsed.data));
});

promptCachingRouter.post("/run", (req: Request, res: Response) => {
    const parsed = runSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: z.treeifyError(parsed.error) });
        return;
    }
    void handle(res, () => run(parsed.data));
});

promptCachingRouter.post("/compare", (req: Request, res: Response) => {
    const parsed = compareSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: z.treeifyError(parsed.error) });
        return;
    }
    void handle(res, () => compare(parsed.data));
});
