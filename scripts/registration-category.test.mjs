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
  assert.match(fields,new RegExp('role *=== *"'+path+'"'));
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
 assert.ok(gate.includes("Job seekers must provide their awarding institution."));
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

test("Veterinarian degree and institution survive OTP metadata persistence",()=>{
 const gate=read("lib/registration-categories.ts");
 const persist=read("lib/registration-persistence.ts");
 assert.ok(gate.includes("data[key]=selected;"));
 assert.ok(gate.includes('data.institution=field(form,"institution")'));
 assert.ok(persist.includes("credentialLabel=institution?qualification"));
});
test("Clinic onboarding persists a clinic record and reviewer evidence",()=>{
 const fields=read("app/register/RegistrationDetails.tsx");
 const persist=read("lib/registration-persistence.ts");
 const migration=read("supabase/migrations/20261027130000_registration_clinic_profile_fields.sql");
 const review=read("supabase/migrations/202610280001_registration_review_workflow.sql");
 const admin=read("app/admin/reviews/page.tsx");
 const publicDirectory=read("app/clinics/page.tsx");
 const publicDetail=read("app/clinics/[slug]/page.tsx");
 const publicView=read("supabase/migrations/20261027150000_public_clinic_service_cities.sql");
 assert.ok(fields.includes('name="clinic_cities"'));
 assert.ok(persist.includes('from("clinics")'));
 assert.ok(persist.includes("responsible_veterinarian_pvmc"));
 assert.ok(persist.includes("other_cities:additionalCities"));
 assert.ok(migration.includes("responsible_veterinarian_pvmc"));
 assert.ok(review.includes("Clinic registration profile is missing"));
 assert.ok(admin.includes("registration_profile_details"));
 assert.ok(admin.includes("detailEntries"));
 assert.ok(publicView.includes("other_cities"));
 assert.ok(publicDirectory.includes("clinic.other_cities"));
 assert.ok(publicDetail.includes("clinic.other_cities"));
});
test("Employer job posting keeps existing multi-city coverage workflow",()=>{
 const page=read("app/dashboard/company/page.tsx");
 const actions=read("app/dashboard/company/actions.ts");
 assert.ok(page.includes("JobTerritoryFields"));
 assert.ok(actions.includes("coverage_cities"));
 assert.ok(actions.includes('from("job_coverage")'));
});

test("Pending registration details stay private and reviewed company accounts get workspaces",()=>{
 const persistence=read("lib/registration-persistence.ts");
 const detailsMigration=read("supabase/migrations/20261027140000_registration_profile_details.sql");
 const workflow=read("supabase/migrations/202610280001_registration_review_workflow.sql");
 const admin=read("app/admin/reviews/page.tsx");
 assert.ok(persistence.includes('from("registration_profile_details")'));
 assert.ok(detailsMigration.includes("has_admin_permission('profiles.review')"));
 assert.ok(detailsMigration.includes("g.review_status = 'rejected'"));
 assert.ok(workflow.includes("insert into public.company_members"));
 assert.ok(workflow.includes("insert into public.companies"));
 assert.ok(admin.includes("registration_profile_details"));
});

// Regression: QualificationField submits highest_qualification_choice, not a legacy highest_qualification input.
test("Allied professional registration accepts the category qualification selector",()=>{
 const fields=read("app/register/RegistrationDetails.tsx");
 const gate=read("lib/registration-categories.ts");
 assert.match(fields,/name=\{name \+ "_choice"\}/);
 assert.match(fields,/name="highest_qualification"/);
 assert.match(gate,/qualification\("highest_qualification",ACADEMIC_QUALIFICATIONS\)/);
 assert.doesNotMatch(gate,/!field\(form,"highest_qualification"\)/);
 assert.match(gate,/!field\(form,"institution"\)\|\|!field\(form,"specialization_other"\)/);
});

 test("Experience is validated and retained privately through registration", () => {
   const fields=read("app/register/RegistrationDetails.tsx");
   const gate=read("lib/registration-categories.ts");
   const persistence=read("lib/registration-persistence.ts");
   for (const name of ["experience_years","current_designation","current_workplace","professional_summary"]) {
     assert.ok(fields.includes('name="'+name+'"'));
     assert.ok(gate.includes(name));
     assert.ok(persistence.includes('"'+name+'"'));
   }
   assert.ok(read("app/register/page.tsx").includes("Registration and verification fee: PKR 0"));
 });

test("First registration migration declares the role variable and review status before policies need them", () => {
 const sql=read("supabase/migrations/20261027120000_private_registration_evidence.sql");
 assert.doesNotMatch(sql,/\bcurrent_role\b/);
 assert.match(sql,/account_role_value text/);
 assert.match(sql,/review_status text not null default 'pending'/);
 assert.match(sql,/grant select, insert, delete on public.registration_evidence to authenticated/);
 assert.match(read("app/register/complete/actions.ts"),/saveRegistrationProfileDraftAction/);
});

// Execute the actual validators, including forged submissions that bypass browser required fields.
async function registrationModules() {
 const ts=(await import("typescript")).default;
 const {runInNewContext}=await import("node:vm");
 const cache=new Map();
 const load=(path)=>{
  if(cache.has(path))return cache.get(path);
  const exported={exports:{}};cache.set(path,exported.exports);
  const compiled=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,
   target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText;
  runInNewContext(compiled,{module:exported,exports:exported.exports,FormData,console,require:(name)=>{
   if(name==="../public/data/pakistan-administrative-hierarchy.json")return JSON.parse(read("public/data/pakistan-administrative-hierarchy.json"));
   if(name.startsWith("@/lib/"))return load(name.replace("@/","" )+".ts");
   throw new Error("Unexpected import: "+name);
  }});
  return exported.exports;
 };
 return {validate:load("lib/registration-categories.ts").registrationExtraFields,
  persist:load("lib/registration-persistence.ts").persistRegisteredCategoryDetails,
  locations:load("lib/pakistan-locations.ts")};
}
function registrationForm(overrides={}) {
 const form=new FormData();
 for(const [key,value] of Object.entries({city:"Lahore",province:"Punjab",institution:"UAF",
  highest_qualification_choice:"MPhil",professional_types:"Animal Nutritionist",
  industry_sectors:"Feed / Nutrition",specialization_other:"Animal nutrition",...overrides})) form.set(key,value);
 return form;
}
function addDegree(form,id,degree,institution="UAF") {
 form.append("additional_qualification_index",String(id));
 form.set("additional_qualification_"+id+"_choice",degree);
 form.set("additional_institution_"+id,institution);
}

test("Province and city validator rejects mismatches and accepts every listed pairing",async()=>{
 const {validate,locations}=await registrationModules();
 assert.match(validate(registrationForm({province:"Sindh"}),"professional","").error,/province/i);
 assert.match(validate(registrationForm({province:""}),"professional","").error,/province/i);
 assert.equal(validate(registrationForm(),"professional","").error,undefined);
 for(const item of locations.PAKISTAN_LOCATION_OPTIONS)
  assert.equal(locations.isPakistanLocationInProvince(item.value,item.province),true,item.label);
 assert.equal(locations.isPakistanLocationInProvince("Lahore","Sindh"),false);
});
test("Completed DVM requires a PVMC number even on the allied or job-seeker pathway",async()=>{
 const {validate}=await registrationModules();
 for(const role of ["professional","candidate"]){
  const form=registrationForm({highest_qualification_choice:"DVM",student_track:"job_seeker"});
  assert.match(validate(form,role,"").error,/PVMC/);
  form.set("pvmc_number","12345-P");
  assert.equal(validate(form,role,"").error,undefined);
  assert.equal(validate(form,role,"").data.pvmc_number,"12345-P");
 }
});
test("MPhil and PhD without a veterinary degree need no practitioner number",async()=>{
 const {validate}=await registrationModules();
 for(const degree of ["MPhil","PhD","BS / BSc"])
  assert.equal(validate(registrationForm({highest_qualification_choice:degree}),"professional","").error,undefined);
});
test("Current DVM and non-veterinary students do not need a PVMC practitioner number",async()=>{
 const {validate}=await registrationModules();
 for(const [track,degree] of [["dvm_student","DVM"],["postgraduate_student","MPhil"],["phd_student","PhD"]]){
  const form=registrationForm({student_track:track,study_program_choice:degree,student_college_registration_number:"UAF-123"});
  assert.equal(validate(form,"candidate","").error,undefined);
 }
});
test("Additional completed DVM triggers PVMC; degrees and institutions retain their pairing",async()=>{
 const {validate}=await registrationModules();
 const form=registrationForm({highest_qualification_choice:"PhD"});
 addDegree(form,0,"MPhil","UAF");addDegree(form,3,"DVM","UVAS");
 assert.match(validate(form,"professional","").error,/PVMC/);
 form.set("pvmc_number","12345");
 const result=validate(form,"professional","");
 assert.equal(result.error,undefined);
 assert.deepEqual(Array.from(result.data.additional_qualifications),["MPhil","DVM"]);
 assert.deepEqual(Array.from(result.data.additional_institutions),["UAF","UVAS"]);
 form.delete("additional_qualification_index");form.append("additional_qualification_index","0");
 assert.equal(validate(form,"professional","").error,undefined,"Removing a DVM removes its PVMC requirement");
});
test("Invalid additional degree submissions cannot bypass bounds or institution checks",async()=>{
 const {validate}=await registrationModules();
 const missing=registrationForm();addDegree(missing,0,"PhD","");
 assert.match(validate(missing,"professional","").error,/institution/);
 const forged=registrationForm();forged.append("additional_qualification_index","../bad");
 assert.match(validate(forged,"professional","").error,/degrees/);
 const tooMany=registrationForm();for(let i=0;i<11;i++)addDegree(tooMany,i,"PhD");
 assert.match(validate(tooMany,"professional","").error,/10/);
 const custom=registrationForm();addDegree(custom,0,"__other__");custom.set("additional_qualification_0_other","Doctor of Veterinary Medicine");
 assert.match(validate(custom,"professional","").error,/PVMC/);
});
test("Veterinarian persistence retains DVM, additional degrees and private details",async()=>{
 const {persist}=await registrationModules();
 let saved,vet;
 const db={from(table){
  if(table==="profiles")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{primary_role:"veterinarian"}})})})};
  if(table==="registration_profile_details")return {upsert:async(row)=>{saved=row;return {};}};
  if(table==="veterinarian_profiles")return {update:(row)=>({eq:async()=>{vet=row;return {};}})};
  throw new Error("Unexpected table: "+table);
 }};
 const issue=await persist(db,"owner",{qualifications:"DVM",institution:"UAF",pvmc_number:"12345",
  practice_areas:["Dairy / Cattle"],additional_qualifications:["MPhil","PhD"],additional_institutions:["UAF","UVAS"]});
 assert.equal(issue,null);
 assert.match(vet.qualifications,/DVM.*MPhil.*PhD/);
 assert.deepEqual(Array.from(saved.category_details.additional_institutions),["UAF","UVAS"]);
});
