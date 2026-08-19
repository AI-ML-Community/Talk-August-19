import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { fetchAllCatalogs } from "@/mcp-tooling/client.js";
import { compare, run, SAMPLE_QUESTIONS } from "@/mcp-tooling/service.js";
import { mcpEnv } from "@/config/env.js";

const runSchema = z.object({
    question: z.string().min(1),
    mode: z.enum(["naive", "deferred"]).default("deferred"),
    priorityTools: z.array(z.string()).optional(),
});

const compareSchema = z.object({
    question: z.string().min(1),
    priorityTools: z.array(z.string()).optional(),
});

const handle = async (res: Response, work: () => Promise<unknown>): Promise<void> => {
    try {
        res.status(200).json(await work());
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: message });
    }
};

export const mcpToolingRouter: Router = Router();

mcpToolingRouter.get("/catalog", (req: Request, res: Response) => {
    const refresh = req.query.refresh === "true";
    void handle(res, async () => {
        const catalogs = await fetchAllCatalogs(refresh);
        return {
            model: mcpEnv.modelId,
            questions: SAMPLE_QUESTIONS,
            servers: catalogs.map((c) => ({
                server: c.server,
                label: c.label,
                connected: c.connected,
                error: c.error,
                toolCount: c.tools.length,
                tools: c.tools.map((t) => ({
                    name: t.name,
                    description: t.description.slice(0, 160),
                })),
            })),
            totalTools: catalogs.reduce((a, c) => a + c.tools.length, 0),
        };
    });
});

mcpToolingRouter.post("/run", (req: Request, res: Response) => {
    const parsed = runSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: z.treeifyError(parsed.error) });
        return;
    }
    void handle(res, () =>
        run(parsed.data.question, parsed.data.mode, 6, parsed.data.priorityTools),
    );
});

mcpToolingRouter.post("/compare", (req: Request, res: Response) => {
    const parsed = compareSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: z.treeifyError(parsed.error) });
        return;
    }
    void handle(res, () =>
        compare(parsed.data.question, parsed.data.priorityTools),
    );
});
