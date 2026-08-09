import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const required = [
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "app/components/SiteHeader.tsx",
  "app/components/SiteFooter.tsx",
  "app/companies/page.tsx",
  "app/jobs/page.tsx",
  "app/learn/page.tsx",
  "app/login/page.tsx",
  "app/marketplace/page.tsx",
  "app/register/page.tsx",
  "app/vets/page.tsx",
  "public/vetconnect-logo.png",
  "public/favicon.svg",
  "types/index.ts",
  "package.json",
  "next.config.mjs",
];

const forbidden = [
  ".vercel",
  ".openai",
  ".env",
  ".env.local",
  "next.config.ts",
];

const missing = required.filter((path) => !existsSync(join(root, path)));
const includedForbidden = forbidden.filter((path) => existsSync(join(root, path)));

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [relative(root, fullPath)];
  });
}

const files = collectFiles(root).filter((path) => !path.startsWith("node_modules/"));
const unexpectedArchives = files.filter((path) => /\.(zip|rar|7z)$/i.test(path));

if (missing.length || includedForbidden.length || unexpectedArchives.length) {
  if (missing.length) console.error("Missing required files:", missing);
  if (includedForbidden.length) console.error("Forbidden entries:", includedForbidden);
  if (unexpectedArchives.length) console.error("Unexpected archives:", unexpectedArchives);
  process.exit(1);
}

console.log(`VetConnect frontend structure audit passed: ${required.length} required entries verified.`);
