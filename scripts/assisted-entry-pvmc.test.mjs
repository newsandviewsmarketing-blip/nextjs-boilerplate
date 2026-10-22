import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("assisted entry does not equate PVMC number with verification", () => {
  const action = readFileSync("app/admin/create/actions.ts", "utf8");
  const page = readFileSync("app/admin/create/page.tsx", "utf8");
  const start = action.indexOf("export async function createManagedPersonAction");
  const end = action.indexOf("export async function createCompanyAction", start);
  assert.ok(start >= 0 && end > start);
  const person = action.slice(start, end);
  assert.ok(person.includes('const canPublishNow = publish && profileKind === "professional";'));
  assert.ok(person.includes('pvmc_verification_status: "pending"'));
  assert.ok(person.includes('verification_status: canPublishNow ? "approved" : "pending"'));
  assert.ok(person.includes("is_published: canPublishNow"));
  assert.ok(!person.includes('pvmc_verification_status: publish'));
  assert.ok(page.includes("PVMC number or uploaded document alone does not verify registration"));
});
