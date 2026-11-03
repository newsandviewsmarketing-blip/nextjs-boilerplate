import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("company owner, admin creation and staff editor use one reusable form",()=>{
  const editor=read("app/components/CompanyProfileFields.tsx");
  assert.match(read("app/admin/create/page.tsx"),/CompanyProfileFields mode="admin-create"/);
  assert.match(read("app/admin/company-profile/[id]/page.tsx"),/CompanyProfileFields mode="admin-edit"/);
  assert.match(read("app/dashboard/company/page.tsx"),/CompanyProfileFields mode="company-edit"/);
  for(const field of ["facebook_url","instagram_url","linkedin_url","youtube_url","private_contacts_json","profile_tone","tagline"])
    assert.match(editor,new RegExp(field));
  assert.doesNotMatch(editor,/localStorage|sessionStorage/);
});

test("company private contacts have separate RLS tables and are not public fields",()=>{
  const migration=read("supabase/migrations/20261103070000_unified_company_profile_supplement.sql");
  assert.match(migration,/alter table public\.company_private_contacts enable row level security/);
  assert.match(migration,/revoke all on table public\.company_private_contacts from anon, authenticated/);
  assert.match(migration,/create policy company_private_contacts_read.*?to authenticated/s);
  assert.match(migration,/public\.company_has_permission\(company_id,'company\.view_private'\)/);
  assert.match(migration,/security invoker/);
  assert.match(migration,/public\.save_company_profile_supplement/);
  assert.match(read("app/dashboard/company/export/page.tsx"),/requireCompanyPermission\("company\.view_private"/);
  assert.match(read("app/admin/company-profile/[id]/export/page.tsx"),/requireAdminPermission\("directories\.manage"/);
  const publicDetail=read("app/companies/[id]/page.tsx");
  assert.doesNotMatch(publicDetail,/company_private_contacts|private_contacts_json/);
});

test("company owner save and staff editing preserve approval authority",()=>{
  const owner=read("app/dashboard/company/actions.ts");
  assert.match(owner,/requireWorkspace\("company\.manage", formData\)/);
  assert.match(owner,/saveCompleteCompanyProfile\(supabase,workspace\.company_id,formData,"company_name"/);
  const action=read("app/admin/company-profile/actions.ts");
  assert.match(action,/identity\.roles\.includes\("super_admin"\)/);
  assert.match(action,/acknowledge_live_edit/);
  const created=read("app/admin/create/actions.ts");
  assert.match(created,/saveCompanySupplement\(supabase,String\(data\.id\),formData\)/);
  assert.match(created,/requireAdminPermission\("directories\.manage"/);
});

test("public story uses escaped React output and safe protocols",()=>{
  const story=read("app/components/CompanyStory.tsx");
  assert.match(story,/new URL\(m\[2\]\)/);
  assert.match(story,/url\.protocol === "http:"/);
  assert.doesNotMatch(story,/dangerouslySetInnerHTML/);
  const print=read("app/components/CompanyPrintBody.tsx");
  assert.match(print,/privateRecord&&<section/);
  assert.match(print,/CompanyPrintButton/);
});
