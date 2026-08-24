import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const required = [
  "app/layout.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/manifest.ts",
  "app/admin/page.tsx",
  "app/admin/reviews/page.tsx",
  "app/admin/products/page.tsx",
  "app/admin/users/page.tsx",
  "app/admin/audit/page.tsx",
  "docs/FINAL-RELEASE-RUNBOOK.md",
  "docs/EDITORIAL-AND-ADMIN-ACCOUNTABILITY.md",
  "docs/SEO-AND-INDEXING-RELEASE-CHECKLIST.md",
  "supabase/preflight/20260824_read_only_preflight.sql",
  "supabase/migrations/202608170001_phase4_admin_control.sql",
];

const forbiddenNames = new Set([".env.local", ".vercel", ".next", "node_modules"]);
const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/i,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i,
];

const errors = [];
for (const item of required) {
  if (!existsSync(join(root, item))) errors.push(`Missing required release file: ${item}`);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (forbiddenNames.has(name)) {
      errors.push(`Forbidden build/secret path present: ${relative(root, join(dir, name))}`);
      continue;
    }
    const path = join(dir, name);
    const rel = relative(root, path).split(sep).join("/");
    const st = statSync(path);
    if (st.isDirectory()) {
      if (rel.startsWith(".git/")) continue;
      walk(path);
      continue;
    }
    if (/\.(zip|pem|p12|pfx)$/i.test(name)) errors.push(`Forbidden archive/key file inside repository: ${rel}`);
    if (/\.(ts|tsx|js|mjs|cjs|json|md|sql|env|example)$/i.test(name) || name.startsWith(".env")) {
      const text = readFileSync(path, "utf8");
      for (const pattern of secretPatterns) {
        if (pattern.test(text) && !rel.endsWith(".env.example")) errors.push(`Possible committed secret in ${rel}: ${pattern}`);
      }
    }
  }
}
walk(root);

if (errors.length) {
  console.error("VetConnect release gate FAILED:\n" + errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log("VetConnect release gate passed: required release files present and no prohibited build/secret artifacts detected.");
