import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const output = "RELEASE-MANIFEST.json";
const excluded = new Set(["node_modules", ".next", ".vercel", ".git", output]);
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (excluded.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else {
      const data = readFileSync(path);
      files.push({
        path: relative(root, path).split(sep).join("/"),
        bytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      });
    }
  }
}
walk(root);
files.sort((a,b)=>a.path.localeCompare(b.path));
const payload = {
  product: "VetConnect Pakistan",
  release: "Consolidated RC 2026-08-24",
  generated_at_utc: new Date().toISOString(),
  file_count: files.length,
  files,
};
writeFileSync(join(root, output), JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${output} with ${files.length} SHA-256 file records.`);
