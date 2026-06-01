import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extensionDir = path.join(root, "extension");
const distDir = path.join(root, "dist");
const manifest = JSON.parse(await fs.readFile(path.join(extensionDir, "manifest.json"), "utf8"));
const output = path.join(distDir, `ai-form-autofill-${manifest.version}.zip`);

await fs.mkdir(distDir, { recursive: true });
await fs.rm(output, { force: true });

await execFileAsync("zip", [
  "-r",
  output,
  ".",
  "-x",
  "*.DS_Store"
], { cwd: extensionDir });

const stat = await fs.stat(output);
console.log(JSON.stringify({
  package: path.relative(root, output),
  size_bytes: stat.size,
  version: manifest.version
}, null, 2));
