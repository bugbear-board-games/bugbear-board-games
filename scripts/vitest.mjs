// Runs Vitest with an upper-case Windows drive letter in the working directory.
// VS Code often opens folders as "c:\..." while Node resolves modules as "C:\...", and Vite
// then loads Vitest twice ("Vitest failed to find the current suite"). Normalizing fixes it.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const cwd = process.cwd().replace(/^[a-z](?=:)/, (c) => c.toUpperCase());
const require = createRequire(join(cwd, "package.json"));
const bin = join(dirname(require.resolve("vitest/package.json")), "vitest.mjs");

const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
process.exit(result.status ?? 1);
