import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=(f)=>readFileSync(f,"utf8");

test("Veterinary practitioner enrolment is explicitly selected, not auto-assigned",()=>{
 const registration=read("app/register/page.tsx");
 assert.match(registration,/Select your registration category above/);
 assert.match(registration,/Registered Veterinarian \(DVM \/ PVMC\)/);
 assert.match(registration,/Veterinary Student \/ Job Seeker/);
 assert.match(registration,/Livestock \/ Allied Industry Professional/);
 assert.match(registration,/\: "";\s*return \(/);
});
test("PVMC reviewer cannot approve credentials without source evidence",()=>{
 const guard=read("lib/veterinary-verification.ts");
 const actions=read("app/admin/actions.ts");
 assert.match(guard,/PVMC registration number is required/);
 assert.match(guard,/at least 25 characters/);
 assert.match(guard,/hasDocumentedVeterinaryQualification/);
 assert.match(actions,/veterinaryCredentialApprovalProblem\(data,reason\)/);
 assert.match(actions,/vetProfileApprovalProblem\(vetData\?\.qualifications\)/);
});
test("Old approvals with missing documentation remain flagged until manual recheck",()=>{
 const guard=read("lib/veterinary-verification.ts");
 const actions=read("app/admin/actions.ts");
 const admin=read("app/admin/page.tsx");
 const dossier=read("app/admin/users/[id]/page.tsx");
 const rechecks=read("app/admin/credential-recheck/page.tsx");
 assert.match(guard,/credentialDataFlags/);
 assert.match(admin,/PVMC data rechecks/);
 assert.match(admin,/recheckCount/);
 assert.match(dossier,/RECHECK REQUIRED/);
 assert.match(actions,/export async function reopenVeterinaryCredentialAction/);
 assert.match(actions,/identity\.roles\.includes\("super_admin"\)/);
 assert.match(actions,/pvmc_verification_status:"pending"/);
 assert.match(actions,/audit_logs/);
 assert.match(rechecks,/records needing review/);
});

test("Staged clinic publication remains separate from account registration",()=>{
 const sql=read("supabase/migrations/20261101162000_separate_clinic_publication_from_registration.sql");
 assert.match(sql,/required_types\s*:=\s*array\['cnic_front','cnic_back'\]/);
 assert.match(sql,/registration_intent = 'clinic' then required_types := required_types \|\| array\['clinic_registration'\]/);
 assert.match(sql,/required_types := required_types \|\| array\['degree_certificate','pvmc_registration'\]/);
 assert.match(sql,/if gate_row\.registration_intent = 'clinic' then[\s\S]*?update public\.clinics set[\s\S]*?is_published = false/);
 assert.match(sql,/create trigger clinics_publication_readiness/);
 assert.match(sql,/new\.pvmc_reviewed_at is null or new\.pvmc_reviewed_by is null/);
 assert.match(sql,/where a\.clinic_id = new\.id and a\.is_open = true/);
 assert.match(sql,/where s\.clinic_id = new\.id and s\.is_active = true and s\.is_public = true/);
});

test("Public clinic labels distinguish facility review from a PVMC credential check",()=>{
 const listing=read("app/clinics/page.tsx");
 const detail=read("app/clinics/[slug]/page.tsx");
 assert.match(listing,/Facility approved/);
 assert.match(detail,/VETCONNECT-REVIEWED FACILITY/);
 assert.match(detail,/does not establish that the responsible veterinarian's PVMC registration has been verified/);
});
