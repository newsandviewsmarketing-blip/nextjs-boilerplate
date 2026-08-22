import process from "node:process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const required = [
  "START-HERE.md",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "app/components/SiteHeader.tsx",
  "app/components/MobileNav.tsx",
  "app/components/ProfilePhoto.tsx",
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
  "app/admin/components/AdminNav.tsx",
  "app/admin/reviews/page.tsx",
  "app/admin/products/page.tsx",
  "app/admin/products/actions.ts",
  "app/admin/products/new/page.tsx",
  "app/admin/products/[id]/page.tsx",
  "app/admin/users/page.tsx",
  "app/admin/users/actions.ts",
  "app/admin/audit/page.tsx",
  "app/components/ProductEditorFields.tsx",
  "app/dashboard/company/products/[id]/page.tsx",
  "app/forgot-password/page.tsx",
  "app/update-password/page.tsx",
  "app/coming-soon/page.tsx",
  "app/marketplace/actions.ts",
  "app/marketplace/[slug]/page.tsx",
  "app/companies/[id]/page.tsx",
  "app/vets/[id]/page.tsx",
  "app/clinics/page.tsx",
  "app/clinics/[slug]/page.tsx",
  "app/labs/page.tsx",
  "app/labs/[slug]/page.tsx",
  "app/professionals/page.tsx",
  "app/professionals/[slug]/page.tsx",
  "app/jobs/actions.ts",
  "app/jobs/[slug]/page.tsx",
  "lib/auth.ts",
  "lib/admin.ts",
  "lib/product-input.ts",
  "lib/directories.ts",
  "lib/jobs.ts",
  "lib/marketplace.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/proxy.ts",
  "proxy.ts",
  "public/vetconnect-logo.png",
  "public/favicon.svg",
  "supabase/migrations/202608090001_backend_phase1.sql",
  "supabase/migrations/202608090002_backend_phase2.sql",
  "supabase/migrations/202608110001_phase3_roles.sql",
  "supabase/migrations/202608110002_phase3_foundation.sql",
  "supabase/migrations/202608110003_phase3_master_data.sql",
  "supabase/migrations/202608110004_phase3_permissions.sql",
  "supabase/migrations/202608110005_phase3_privacy_cutover.sql",
  "supabase/migrations/202608170001_phase4_admin_control.sql",
  "docs/BACKEND-PHASE1-SETUP.md",
  "docs/BACKEND-PHASE1-AUDIT.md",
  "docs/BACKEND-PHASE2-SETUP.md",
  "docs/BACKEND-PHASE2-AUDIT.md",
  "docs/PHASE3-IMPLEMENTATION-AUDIT.md",
  "docs/PHASE3-SETUP.md",
  "docs/PHASE3-RELEASE-CHECKLIST.md",
  "docs/PHASE4-IMPLEMENTATION-AUDIT.md",
  "docs/PHASE4-SETUP.md",
  "docs/PHASE4-RELEASE-CHECKLIST.md",
  "scripts/source.test.mjs",
  ".github/workflows/ci.yml",
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
  ".github/workflows/deno.yml",
  ".github/workflows/generator-generic-ossf-slsa3-publish.yml",
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
  `VetConnect Phase 4 structure audit passed: ${required.length} required entries verified.`,
);
