import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
    },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: true,
    sourcemap: true,
    paths: {
        "@/*": ["./src/*"],
    },
});
