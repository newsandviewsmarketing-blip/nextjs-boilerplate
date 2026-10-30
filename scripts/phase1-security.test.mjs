import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("every admin review action enforces effective per-user permission", () => {
  const actions = read("app/admin/actions.ts");
  const expected = [
    ["reviewProfileAction", "profiles.review"],
    ["reviewVeterinarianCredentialAction", "regulatory.review"],
    ["reviewProductAction", "products.manage"],
    ["reviewJobAction", "jobs.manage"],
    ["reviewProductRegulatoryAction", "regulatory.review"],
  ];
  for (let i=0;i<expected.length;i++) {
    const [action, permission]=expected[i];
    const start=actions.indexOf(`export async function ${action}(`);
    const next=i+1<expected.length ? actions.indexOf(`export async function ${expected[i+1][0]}(`) : actions.length;
    assert.ok(start>=0 && next>start, `missing ${action}`);
    const body=actions.slice(start,next);
    assert.ok(body.includes(`await getEffectiveAdminPermission(identity, "${permission}")`), `missing effective permission in ${action}`);
    assert.ok(!body.includes("identity.roles.some("), `role-only guard still present in ${action}`);
  }
});

test("permission lookup fails closed and override revocation takes precedence", () => {
  const admin=read("lib/admin.ts");
  assert.match(admin, /if \(error\) return new Set<AdminPermission>\(\)/);
  assert.match(admin, /!revocations\.has\(permission\)/);
  assert.match(admin, /catch \{\s*return new Set<AdminPermission>\(\)/);
  assert.match(admin, /return allowed\.has\(permission\)/);
  const nav=read("app/admin/components/AdminNav.tsx");
  const dashboard=read("app/admin/page.tsx");
  const reviews=read("app/admin/reviews/page.tsx");
  assert.ok(nav.includes("await getEffectiveAdminPermissions(identity)"));
  assert.ok(dashboard.includes("await getEffectiveAdminPermissions(identity)"));
  assert.ok(reviews.includes("await getEffectiveAdminPermissions(identity)"));
  assert.ok(!dashboard.includes("hasAdminPermission(identity,"));
  assert.ok(!reviews.includes("hasAdminPermission(identity,"));
});

test("PVMC number never auto-approves assisted veterinarian", () => {
  const source=read("app/admin/create/actions.ts");
  const start=source.indexOf("export async function createManagedPersonAction");
  const end=source.indexOf("export async function createCompanyAction",start);
  assert.ok(start>=0 && end>start);
  const person=source.slice(start,end);
  assert.ok(person.includes('const canPublishNow = publish && profileKind === "professional"'));
  assert.ok(person.includes('pvmc_verification_status: "pending"'));
  assert.ok(person.includes('verification_status: canPublishNow ? "approved" : "pending"'));
  assert.ok(person.includes("is_published: canPublishNow"));
  assert.ok(!person.includes('pvmc_verification_status: publish'));
  assert.ok(read("app/admin/create/page.tsx").includes("PVMC number or document alone does not verify registration"));
});
