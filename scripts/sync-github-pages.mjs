import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");

await fs.mkdir(docs, { recursive: true });
await fs.copyFile(path.join(root, "braiins-dashboard.html"), path.join(docs, "index.html"));
await fs.copyFile(path.join(root, "braiins-report.json"), path.join(docs, "braiins-report.json"));
await fs.copyFile(path.join(root, "calculator.html"), path.join(docs, "calculator.html"));
await fs.writeFile(path.join(docs, ".nojekyll"), "", "utf8");
console.log("Synced docs/ for GitHub Pages: index.html, calculator.html, braiins-report.json, .nojekyll");
