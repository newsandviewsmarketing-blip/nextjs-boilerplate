import process from "node:process";
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
  "app/verify-email/page.tsx",
  "app/marketplace/page.tsx",
  "app/register/page.tsx",
  "app/vets/page.tsx",
  "app/auth/actions.ts",
  "app/auth/confirm/route.ts",
  "app/dashboard/page.tsx",
  "app/dashboard/actions.ts",
  "app/dashboard/company/page.tsx",
  "app/dashboard/company/actions.ts",
  "app/admin/page.tsx",
  "app/admin/actions.ts",
  "app/forgot-password/page.tsx",
  "app/update-password/page.tsx",
  "app/coming-soon/page.tsx",
  "app/marketplace/actions.ts",
  "app/marketplace/[slug]/page.tsx",
  "app/companies/[id]/page.tsx",
  "lib/auth.ts",
  "lib/marketplace.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "public/vetconnect-logo.png",
  "public/favicon.svg",
  "supabase/migrations/202608090001_backend_phase1.sql",
  "supabase/migrations/202608090002_backend_phase2.sql",
  "docs/BACKEND-PHASE1-SETUP.md",
  "docs/BACKEND-PHASE1-AUDIT.md",
  "docs/BACKEND-PHASE2-SETUP.md",
  "docs/BACKEND-PHASE2-AUDIT.md",
  ".env.example",
  "types/index.ts",
  "package.json",
  "next.config.ts",
];

const forbidden = [
  ".vercel",
  ".openai",
  ".env",
  ".env.local",
  "next.config.mjs",
];

const missing = required.filter((path) => !existsSync(join(root, path)));
const includedForbidden = forbidden.filter((path) =>
  existsSync(join(root, path)),
);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory()
      ? collectFiles(fullPath)
      : [relative(root, fullPath)];
  });
}

const files = collectFiles(root).filter(
  (path) => !path.startsWith("node_modules/"),
);
const unexpectedArchives = files.filter((path) =>
  /\.(zip|rar|7z)$/i.test(path),
);

if (missing.length || includedForbidden.length || unexpectedArchives.length) {
  if (missing.length) console.error("Missing required files:", missing);
  if (includedForbidden.length)
    console.error("Forbidden entries:", includedForbidden);
  if (unexpectedArchives.length)
    console.error("Unexpected archives:", unexpectedArchives);

  process.exit(1);
}

console.log(
  `VetConnect Backend Phase 2 structure audit passed: ${required.length} required entries verified.`,
);
