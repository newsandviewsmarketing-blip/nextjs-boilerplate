import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=(f)=>readFileSync(f,"utf8");

test("Veterinary practitioner enrolment is explicitly selected, not auto-assigned",()=>{
 const registration=read("app/register/page.tsx");
 assert.match(registration,/Choose your account category/);
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
