import { mkdirSync } from "node:fs";

// On Windows-backed checkouts Nitro can fail to create this nested output
// directory during Rollup's write phase. Prepare it before Vite starts.
mkdirSync("node_modules/.nitro/vite", { recursive: true });
