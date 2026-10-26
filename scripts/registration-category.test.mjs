import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
const read=(path)=>readFileSync(path,"utf8");

test("Registration selection renders category-specific forms without default veterinarian",()=>{
 const src=read("app/register/page.tsx");
 const fields=read("app/register/RegistrationDetails.tsx");
 assert.match(src,/selectedRole \? <form/);
 assert.match(src,/RegistrationDetails role=\{selectedRole\}/);
 assert.match(src,/Select your registration category above/);
 for(const path of ["veterinarian","candidate","professional","company","laboratory"])
  assert.match(fields,new RegExp('role==="'+path+'"'));
 assert.match(fields,/student_college_registration_number/);
 assert.match(fields,/pvmc_student_reference/);
 assert.match(fields,/practice_areas/);
 assert.match(fields,/specializations/);
});
test("Category-sensitive required fields validated before both OTP and signup",()=>{
 const auth=read("app/auth/actions.ts");
 const gate=read("lib/registration-categories.ts");
 const confirm=read("app/auth/confirm/route.ts");
 const persist=read("lib/registration-persistence.ts");
 assert.equal((auth.match(/registrationExtraFields\(formData,role/g)||[]).length,2);
 assert.match(gate,/Registered veterinarians must provide/);
 assert.match(gate,/Select at least one valid practice area/);
 assert.match(auth,/persistRegisteredCategoryDetails/);
 assert.match(confirm,/persistRegisteredCategoryDetails/);
 assert.match(persist,/professional_credentials/);
 assert.match(persist,/profile_visibility:"owner_only"/);
});
test("Assisted registration matches chosen profile type and veterinarian needs PVMC",()=>{
 const form=read("app/admin/create/page.tsx");
 const action=read("app/admin/create/actions.ts");
 assert.match(form,/profileMode/);
 assert.match(form,/practice_areas/);
 assert.match(form,/student_college_registration_number/);
 assert.match(action,/registrationExtraFields\(formData,"veterinarian",""\)/);
 assert.match(action,/assisted.student_enrollment_submitted/);
 assert.match(action,/pvmc_verification_status: "pending"/);
});
test("Member profile keeps multiple practice areas and requires licence number",()=>{
 const form=read("app/components/VeterinaryProfileFields.tsx");
 const action=read("app/dashboard/actions.ts");
 assert.match(form,/specializations_extra/);
 assert.match(form,/practice_areas/);
 assert.match(action,/PVMC registration number is required/);
 assert.match(action,/Practice area:/);
});
