import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const phase3Paths = [
  "supabase/migrations/202608110001_phase3_roles.sql",
  "supabase/migrations/202608110002_phase3_foundation.sql",
  "supabase/migrations/202608110003_phase3_master_data.sql",
  "supabase/migrations/202608110004_phase3_permissions.sql",
  "supabase/migrations/202608110005_phase3_privacy_cutover.sql",
];
const phase4Path = "supabase/migrations/202608170001_phase4_admin_control.sql";

test("Phase 1 and Phase 2 migrations remain byte-for-byte unchanged", () => {
  const expected = new Map([
    ["supabase/migrations/202608090001_backend_phase1.sql", "51c9945b827290c403ee320696a11a76d30af1dae71afde1a4375961cb99dbcf"],
    ["supabase/migrations/202608090002_backend_phase2.sql", "399fe7a5f4927d050da12dbd51bb50f4292a78c2265006042b2c396ae5d7834c"],
  ]);

  for (const [path, hash] of expected) {
    const actual = createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
    assert.equal(actual, hash, `${path} must not be changed by Phase 3`);
  }
});

test("every Phase 3 migration has an explicit transaction boundary", () => {
  for (const path of phase3Paths) {
    const sql = read(path);
    assert.match(sql, /^begin;$/m, `${path} is missing begin`);
    assert.match(sql, /^commit;$/m, `${path} is missing commit`);
  }
});

test("Phase 3 migrations do not delete existing schema or data", () => {
  const sql = phase3Paths.map(read).join("\n");
  assert.doesNotMatch(sql, /\bdrop\s+table\b|\bdrop\s+column\b|\btruncate\b|\bdelete\s+from\b/i);
});

test("all additive Phase 3 policies can be retried", () => {
  for (const path of phase3Paths.slice(1, 3)) {
    const sql = read(path);
    const policies = [...sql.matchAll(/create policy "([^"]+)" on public\.([a-z_]+)/g)];
    for (const [, name, table] of policies) {
      assert.ok(
        sql.includes(`drop policy if exists "${name}" on public.${table};`),
        `${path} must drop ${name} before recreating it`,
      );
    }
  }
});

test("legacy public-table access is revoked only after frontend cutover", () => {
  const preDeploy = phase3Paths.slice(0, 4).map(read).join("\n");
  const cutover = read(phase3Paths[4]);
  assert.doesNotMatch(preDeploy, /drop policy if exists "vets_public_approved"|drop policy if exists "companies_public_approved"|revoke all on public\.veterinarian_profiles/i);
  assert.match(cutover, /drop policy if exists "vets_public_approved"/);
  assert.match(cutover, /drop policy if exists "companies_public_approved"/);
  assert.match(cutover, /revoke all on public\.veterinarian_profiles, public\.company_profiles from anon/);
});

test("public company view preserves its original first nine columns", () => {
  const sql = read("supabase/migrations/202608110003_phase3_master_data.sql");
  assert.match(
    sql,
    /select c\.user_id, coalesce\(c\.trade_name, c\.company_name\) as company_name, c\.business_type, c\.city, c\.address, coalesce\(c\.short_description, c\.description\) as description, c\.website, c\.contact_email, c\.logo_url, c\.slug/,
  );
});

test("approved profile images flow from privacy-safe views to public pages", () => {
  const foundation = read("supabase/migrations/202608110002_phase3_foundation.sql");
  const directories = read("lib/directories.ts");
  const pages = [
    "app/components/ProfilePhoto.tsx",
    "app/vets/page.tsx",
    "app/vets/[id]/page.tsx",
    "app/professionals/page.tsx",
    "app/professionals/[slug]/page.tsx",
  ].map(read).join("\n");

  assert.match(foundation, /true as pvmc_verified, v\.image_url/);
  assert.match(foundation, /true as profile_verified, pp\.image_url/);
  assert.match(directories, /image_url: string \| null/);
  assert.match(pages, /profile-photo/);
  assert.doesNotMatch(pages, /pvmc_number/);
});

test("mobile navigation remains accessible at compact widths", () => {
  const header = read("app/components/SiteHeader.tsx");
  const mobile = read("app/components/MobileNav.tsx");
  const css = read("app/globals.css");

  assert.match(header, /<MobileNav items=\{navItems\}/);
  assert.match(mobile, /aria-expanded=\{isOpen\}/);
  assert.match(mobile, /aria-controls="mobile-navigation-panel"/);
  assert.match(mobile, /event\.key === "Escape"/);
  assert.match(css, /@media \(max-width: 1050px\)[\s\S]*?\.mobile-navigation \{\s*display: block;/);
});

test("Phase 4 migration is transactional and preserves existing data", () => {
  const sql = read(phase4Path);
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^commit;$/m);
  assert.doesNotMatch(sql, /\bdrop\s+table\b|\bdrop\s+column\b|\btruncate\b|\bdelete\s+from\b/i);
  assert.match(sql, /add column if not exists archived_at timestamptz/);
  assert.match(sql, /create table if not exists public\.admin_role_permissions/);
});

test("administrator hierarchy narrows legacy access and protects role management", () => {
  const sql = read(phase4Path);
  const admin = read("lib/admin.ts");
  assert.match(sql, /select public\.is_super_admin\(check_user_id\);/);
  assert.match(sql, /create policy "roles_admin_manage"[\s\S]*?public\.is_super_admin\(\)/);
  assert.match(sql, /create policy "products_content_manage"[\s\S]*?public\.can_manage_content\(\)/);
  assert.match(sql, /create policy "jobs_content_manage"[\s\S]*?public\.can_manage_jobs\(\)/);
  assert.match(admin, /verification_officer:[\s\S]*?"profiles\.review"/);
  assert.match(admin, /analyst: \["admin\.view", "audit\.view", "analytics\.view"\]/);
});

test("product administration implements the complete controlled lifecycle", () => {
  const actions = read("app/admin/products/actions.ts");
  const pages = [
    "app/admin/products/page.tsx",
    "app/admin/products/new/page.tsx",
    "app/admin/products/[id]/page.tsx",
    "app/dashboard/company/products/[id]/page.tsx",
  ].map(read).join("\n");
  assert.match(actions, /requireAdminPermission\("products\.manage"/);
  assert.match(actions, /\["publish", "unpublish", "pending", "reject", "archive", "restore"\]/);
  assert.match(actions, /requireAdminPermission\("products\.delete"/);
  assert.match(actions, /confirmation !== "DELETE"/);
  assert.match(pages, /Add product/);
  assert.match(pages, /Approve & publish/);
  assert.match(pages, /Save and submit changes/);
});

test("new administrator mutations verify permissions inside server actions", () => {
  const productActions = read("app/admin/products/actions.ts");
  const userActions = read("app/admin/users/actions.ts");
  assert.match(productActions, /^"use server";/);
  assert.match(productActions, /requireAdminPermission\("products\.manage"/);
  assert.match(userActions, /^"use server";/);
  assert.match(userActions, /requireAdminPermission\("users\.manage"/);
  assert.match(userActions, /cannot remove your own Super Administrator role/);
  assert.match(userActions, /cannot suspend your own administrator account/);
});

test("veterinarian profile uses standardized sector, specialization and service selectors", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const fields = read("app/components/VeterinaryProfileFields.tsx");
  const actions = read("app/dashboard/actions.ts");
  assert.match(dashboard, /<VeterinaryProfileFields/);
  assert.match(fields, /name="veterinary_sector"/);
  assert.match(fields, /name="specialization"/);
  assert.match(fields, /type="checkbox"[\s\S]*?name="services"|name="services"[\s\S]*?type="checkbox"/);
  assert.match(actions, /formData\.getAll\("services"\)/);
});

test("account location uses dependent Pakistan administrative selectors", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const locations = read("app/components/PakistanLocationFields.tsx");
  const migration = read("supabase/migrations/202608300001_profile_standardization.sql");
  assert.match(dashboard, /<PakistanLocationFields/);
  assert.match(locations, /Province \/ Territory/);
  assert.match(locations, /District/);
  assert.match(locations, /Tehsil \/ Taluka/);
  assert.match(locations, /open-admin-data\/pakistan-administrative-divisions/);
  assert.match(migration, /^begin;$/m);
  assert.match(migration, /^commit;$/m);
  assert.doesNotMatch(migration, /\bdrop\s+table\b|\bdrop\s+column\b|\btruncate\b|\bdelete\s+from\b/i);
});

test("career workspace and veterinarian job application flow are active", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const career = read("app/dashboard/career/page.tsx");
  const jobs = read("app/jobs/actions.ts");
  assert.match(dashboard, /href="\/dashboard\/career"/);
  assert.match(career, /MY APPLICATIONS/);
  assert.match(career, /job_applications/);
  assert.match(jobs, /"veterinarian"/);
  assert.match(jobs, /verification_status !== "approved"/);
});

test("admin directory supports standardized filters and CSV export", () => {
  const users = read("app/admin/users/page.tsx");
  const route = read("app/admin/users/export/route.ts");
  assert.match(users, /Veterinary sector/);
  assert.match(users, /All provinces/);
  assert.match(users, /All districts/);
  assert.match(users, /admin-directory-table/);
  assert.match(users, /\/admin\/users\/export/);
  assert.match(route, /vetconnect-users-directory\.csv/);
  assert.match(route, /"PVMC"/);
  assert.match(route, /"Veterinary Sector"/);
});


test("professional workspace supports rich profile, photo, education, experience and CV records", () => {
  const page = read("app/dashboard/professional/page.tsx");
  const actions = read("app/dashboard/professional/actions.ts");
  const migration = read("supabase/migrations/202608300002_workspaces_and_media.sql");
  const publicPage = read("app/professionals/[slug]/page.tsx");
  assert.match(page, /PROFESSIONAL WORKSPACE/);
  assert.match(page, /professional_education/);
  assert.match(page, /professional_experience/);
  assert.match(page, /professional_credentials/);
  assert.match(page, /career_documents/);
  assert.match(actions, /profile-media/);
  assert.match(actions, /career-documents/);
  assert.match(migration, /insert into storage\.buckets/);
  assert.match(migration, /professional_education_public_read/);
  assert.match(publicPage, /Professional experience/);
  assert.match(publicPage, /VERIFIED CREDENTIALS/);
});

test("clinic workspace activates facility profile, media, services and affiliation request", () => {
  const listPage = read("app/dashboard/clinics/page.tsx");
  const detailPage = read("app/dashboard/clinics/[id]/page.tsx");
  const actions = read("app/dashboard/clinics/actions.ts");
  const publicPage = read("app/clinics/[slug]/page.tsx");
  assert.match(listPage, /CLINIC WORKSPACE/);
  assert.match(detailPage, /Standardized service catalogue/);
  assert.match(detailPage, /uploadClinicMediaAction/);
  assert.match(actions, /request_clinic_membership/);
  assert.match(actions, /clinic_services/);
  assert.match(publicPage, /Request clinic affiliation/);
  assert.match(publicPage, /clinic_services/);
});

test("career workspace supports saved jobs and calculated job matches", () => {
  const career = read("app/dashboard/career/page.tsx");
  const jobActions = read("app/jobs/actions.ts");
  const jobDetail = read("app/jobs/[slug]/page.tsx");
  assert.match(career, /SAVED JOBS/);
  assert.match(career, /JOB MATCHES/);
  assert.match(career, /job_matches/);
  assert.match(jobActions, /toggleSavedJobAction/);
  assert.match(jobActions, /saved_jobs/);
  assert.match(jobDetail, /Save job/);
});

test("new 30 August migrations are additive and transactional", () => {
  for (const path of [
    "supabase/migrations/202608300001_profile_standardization.sql",
    "supabase/migrations/202608300002_workspaces_and_media.sql",
  ]) {
    const sql = read(path);
    assert.match(sql, /^begin;$/m);
    assert.match(sql, /^commit;$/m);
    assert.doesNotMatch(sql, /\bdrop\s+table\b|\bdrop\s+column\b|\btruncate\b|\bdelete\s+from\b/i);
  }
});

test("admin home provides operational pulse and eight-entry recent update summary", async () => {
  const admin = await read("app/admin/page.tsx");
  assert.match(admin, /LAST 24 HOURS/);
  assert.match(admin, /New registrations/);
  assert.match(admin, /Pending clinic affiliations/);
  assert.match(admin, /Latest recorded actions/);
  assert.match(admin, /\.limit\(8\)/);
});

test("release closure preserves assisted-entry data and adds media/document uploads", () => {
  const page = read("app/admin/create/page.tsx");
  const persistentForm = read("app/admin/create/PersistentForm.tsx");
  const uploads = read("lib/admin-uploads.ts");
  assert.match(page, /<PersistentForm/);
  assert.match(page, /type="file"/);
  assert.match(uploads, /record-documents/);
  assert.match(persistentForm, /localStorage/);
  assert.match(persistentForm, /clearSaved/);
  assert.match(uploads, /uploadPublicImage/);
  assert.match(uploads, /uploadPrivateDocument/);
  assert.match(uploads, /admin_record_documents/);
});

test("release closure provides guarded CSV and XLSX assisted imports", () => {
  const page = read("app/admin/create/page.tsx");
  const actions = read("app/admin/create/bulk-actions.ts");
  const parser = read("lib/tabular-import.ts");
  assert.match(page, /bulkImportAction/);
  assert.match(page, /accept="\.csv,\.xlsx/);
  assert.match(actions, /maximum%20of%20250/);
  assert.match(actions, /verification_status: "pending"/);
  assert.match(actions, /is_published: false/);
  assert.match(parser, /parseCsv/);
  assert.match(parser, /parseXlsx/);
});

test("release closure publishes approved professional records through controlled review", () => {
  const actions = read("app/admin/actions.ts");
  const reviews = read("app/admin/reviews/page.tsx");
  assert.match(actions, /profile_visibility: decision === "approved" \? "public" : "owner_only"/);
  assert.match(actions, /recordSource === "managed_people"/);
  assert.match(actions, /recordSource === "companies"/);
  assert.match(actions, /recordSource === "clinics"/);
  assert.match(reviews, /managed_people/);
  assert.match(reviews, /canonicalCompanies/);
  assert.match(reviews, /admin_record_documents/);
});

test("release closure migration is transactional and adds private evidence storage", () => {
  const sql = read("supabase/migrations/202608300004_release_closure_uploads.sql");
  assert.match(sql, /^begin;$/m);
  assert.match(sql, /^commit;$/m);
  assert.match(sql, /create table if not exists public\.admin_record_documents/);
  assert.match(sql, /'record-documents'/);
  assert.match(sql, /add column if not exists company_id uuid references public\.companies/);
  assert.match(sql, /coalesce\(c\.canonical_name/);
  assert.doesNotMatch(sql, /\btruncate\b|\bdelete\s+from\b/i);
});

test("marketplace and review queues resolve canonical companies", () => {
  const marketplace = read("app/marketplace/page.tsx") + read("app/marketplace/[slug]/page.tsx");
  const reviews = read("app/admin/reviews/page.tsx");
  assert.match(marketplace, /company_id/);
  assert.match(marketplace, /public_company_directory/);
  assert.match(reviews, /canonicalProductCompanyMap/);
  assert.match(reviews, /companyNameFor/);
});

test("master closure migration can build canonical public jobs before release closure", () => {
  const sql = read("supabase/migrations/202608300003_master_closure_operations.sql");
  assert.match(sql, /coalesce\(c\.canonical_name, cp\.trade_name, cp\.company_name/);
  assert.doesNotMatch(sql, /coalesce\(c\.company_name, cp\.trade_name/);
});
