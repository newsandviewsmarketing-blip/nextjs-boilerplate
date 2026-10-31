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
 assert.ok(gate.includes('institutionFor("institution",String(data.qualifications))'));
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
 assert.match(gate,/institutionFor\("institution",String\(data.highest_qualification\)\)/);
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
   if(name.startsWith("../public/data/") && name.endsWith(".json"))return JSON.parse(read(name.replace("../","")));
   if(name.startsWith("@/lib/"))return load(name.replace("@/","" )+".ts");
   throw new Error("Unexpected import: "+name);
  }});
  return exported.exports;
 };
 return {validate:load("lib/registration-categories.ts").registrationExtraFields,
  persist:load("lib/registration-persistence.ts").persistRegisteredCategoryDetails,
  mergeDraft:load("lib/registration-persistence.ts").registrationDraftMetadata,
  institutions:load("lib/registration-institutions.ts"),
  locations:load("lib/pakistan-locations.ts")};
}
function registrationForm(overrides={}) {
 const form=new FormData();
 for(const [key,value] of Object.entries({city:"Lahore",province:"Punjab",institution:"UAF",
  highest_qualification_choice:"MPhil",professional_types:"Animal Nutritionist",
  industry_sectors:"Feed / Nutrition",specialization_other:"Animal nutrition",...overrides})) form.set(key,value);
 if([overrides.qualifications_choice,overrides.study_program_choice,overrides.highest_qualification_choice].includes("DVM"))form.set("institution_choice","uaf");
 return form;
}
function addDegree(form,id,degree,institution="UAF") {
 form.append("additional_qualification_index",String(id));
 form.set("additional_qualification_"+id+"_choice",degree);
 form.set("additional_institution_"+id,institution);
 if(degree==="DVM")form.set("additional_institution_"+id+"_choice",institution==="UVAS"?"uvas-lahore":"uaf");
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
 assert.deepEqual(Array.from(result.data.additional_institutions),["UAF","University of Veterinary and Animal Sciences, Lahore"]);
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
 const custom=registrationForm();addDegree(custom,0,"__other__");custom.set("additional_qualification_0_other","Doctor of Veterinary Medicine");custom.set("additional_institution_0_choice","uaf");
 assert.match(validate(custom,"professional","").error,/PVMC/);
});
test("Veterinarian persistence retains DVM, additional degrees and private details",async()=>{
 const {persist}=await registrationModules();
 let saved,vet;
 const db={from(table){
  if(table==="profiles")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{primary_role:"veterinarian"}})})}),update:()=>({eq:async()=>({})})};
  if(table==="registration_profile_details")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})}),upsert:async(row)=>{saved=row;return {};}};
  if(table==="veterinarian_profiles")return {update:(row)=>({eq:async()=>{vet=row;return {};}})};
  throw new Error("Unexpected table: "+table);
 }};
 const issue=await persist(db,"owner",{qualifications:"DVM",institution:"UAF",pvmc_number:"12345",
  practice_areas:["Dairy / Cattle"],additional_qualifications:["MPhil","PhD"],additional_institutions:["UAF","UVAS"]});
 assert.equal(issue,null);
 assert.match(vet.qualifications,/DVM.*MPhil.*PhD/);
 assert.deepEqual(Array.from(saved.category_details.additional_institutions),["UAF","UVAS"]);
});

function veterinarianDraftDb(existingDetails) {
 const writes=[];
 const db={from(table){
  if(table==="profiles")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{primary_role:"veterinarian"}})})}),update:()=>({eq:async()=>({})})};
  if(table==="registration_profile_details")return {
   select:()=>({eq:()=>({maybeSingle:async()=>({data:existingDetails?{category_details:existingDetails}:null})})}),
   upsert:async(row)=>{writes.push(row);return {};}
  };
  if(table==="veterinarian_profiles")return {update:()=>({eq:async()=>({})})};
  throw new Error("Unexpected table: "+table);
 }};
 return {db,writes};
}
const veterinarianMetadata={qualifications:"DVM",institution:"UAF",pvmc_number:"12345",practice_areas:["Dairy / Cattle"]};

test("Saved additional degrees preserve repeated institution and degree positions",async()=>{
 const {persist}=await registrationModules();
 const {db,writes}=veterinarianDraftDb();
 assert.equal(await persist(db,"owner",{...veterinarianMetadata,
  additional_qualifications:["MPhil","PhD","MPhil"],additional_institutions:["UAF","UAF","UVAS"]}),null);
 assert.deepEqual(Array.from(writes[0].category_details.additional_qualifications),["MPhil","PhD","MPhil"]);
 assert.deepEqual(Array.from(writes[0].category_details.additional_institutions),["UAF","UAF","UVAS"]);
});
test("OTP resume and submission preserve the database draft over stale account metadata",async()=>{
 const {persist}=await registrationModules();
 const {db,writes}=veterinarianDraftDb({current_designation:"Updated designation",professional_summary:"Saved summary"});
 assert.equal(await persist(db,"owner",{...veterinarianMetadata,current_designation:"Old designation"}),null);
 assert.equal(writes[0].category_details.current_designation,"Updated designation");
 assert.equal(writes[0].category_details.professional_summary,"Saved summary");
});
test("An explicit draft edit can replace saved values without losing other saved category data",async()=>{
 const {persist,mergeDraft}=await registrationModules();
 const saved={current_designation:"Saved",additional_qualifications:["PhD"],additional_institutions:["UAF"]};
 const {db,writes}=veterinarianDraftDb(saved);
 const meta={...mergeDraft(veterinarianMetadata,saved),current_designation:"Edited"};
 assert.equal(await persist(db,"owner",meta,{replaceSavedDetails:true}),null);
 assert.equal(writes[0].category_details.current_designation,"Edited");
 assert.deepEqual(Array.from(writes[0].category_details.additional_qualifications),["PhD"]);
});
test("A saved-draft read failure stops persistence before any overwrite",async()=>{
 const {persist}=await registrationModules();
 let write=false;
 const db={from(table){
  if(table==="profiles")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{primary_role:"veterinarian"}})})}),update:()=>({eq:async()=>({})})};
  if(table==="registration_profile_details")return {select:()=>({eq:()=>({maybeSingle:async()=>({error:{message:"unavailable"}})})}),
   upsert:async()=>{write=true;return {};}};
  throw new Error("Unexpected write");
 }};
 assert.match(await persist(db,"owner",veterinarianMetadata),/load your saved registration/);
 assert.equal(write,false);
});
test("File preflight rejects unsupported, empty or oversized evidence",async()=>{
 const ts=(await import("typescript")).default;
 const {runInNewContext}=await import("node:vm");
 const exported={exports:{}};
 runInNewContext(ts.transpileModule(read("lib/registration-evidence.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
  {exports:exported.exports,module:exported});
 const {isAcceptedEvidenceFile,isValidPakistaniCnic}=exported.exports;
 assert.equal(isAcceptedEvidenceFile("application/pdf",1024,false),true);
 assert.equal(isAcceptedEvidenceFile("application/pdf",1024,true),false);
 assert.equal(isAcceptedEvidenceFile("image/jpeg",6*1024*1024,true),false);
 assert.equal(isAcceptedEvidenceFile("application/pdf",9*1024*1024,false),false);
 assert.equal(isAcceptedEvidenceFile("image/png",0,true),false);
 assert.equal(isAcceptedEvidenceFile("application/javascript",10,false),false);
 assert.equal(isValidPakistaniCnic(""),false);
 assert.equal(isValidPakistaniCnic("12345-1234567-1"),true);
});

test("Invalid saved geography and unpaired degree arrays cause no writes",async()=>{
 const {persist}=await registrationModules();
 for(const extra of [{province:"Sindh",city:"Lahore"},{additional_qualifications:["PhD"],additional_institutions:[]}]){
  const {db,writes}=veterinarianDraftDb();
  assert.ok(await persist(db,"owner",{...veterinarianMetadata,...extra}));
  assert.equal(writes.length,0);
 }
});

test("DVM institution reference keeps all 20 PVMC entries and conditional admission notes",async()=>{
 const {institutions}=await registrationModules();
 assert.equal(institutions.DVM_INSTITUTIONS.length,20);
 assert.equal(new Set(institutions.DVM_INSTITUTIONS.map(item=>item.id)).size,20);
 assert.ok(institutions.DVM_INSTITUTIONS.find(item=>item.id==="uvas-swat"));
 for(const id of ["poonch","cuvas","must-bhimber"])
  assert.match(institutions.DVM_INSTITUTIONS.find(item=>item.id===id).reviewNote,/fall 2025/);
 const form=new FormData();
 for(const item of institutions.DVM_INSTITUTIONS){
  form.set("institution_choice",item.id);
  const result=institutions.registrationInstitution(form,"institution","DVM");
  assert.equal(result.institution,item.name);
  assert.equal(result.source,"pvmc:"+item.id);
 }
});
test("DVM requires a listed selection or an explicit Other / International institution",async()=>{
 const {institutions}=await registrationModules();
 const form=new FormData();form.set("institution","Misspelled institute");
 assert.ok(institutions.registrationInstitution(form,"institution","DVM").error);
 for(const choice of ["__other__","__international__"]){
  form.set("institution_choice",choice);form.set("institution","Misspelled institute");
  assert.equal(institutions.registrationInstitution(form,"institution","DVM").institution,"Misspelled institute");
  form.set("institution","");assert.ok(institutions.registrationInstitution(form,"institution","DVM").error);
  form.set("institution","International Veterinary University");
 }
 form.set("institution_choice","forged-id");assert.ok(institutions.registrationInstitution(form,"institution","DVM").error);
});
test("Non-DVM qualifications retain open institutions without imposing the DVM dropdown",async()=>{
 const {validate,institutions}=await registrationModules();
 for(const degree of ["MPhil","PhD","Diploma / Certificate","BSc (Hons) Animal Husbandry","BS Poultry Science"]){
  const form=registrationForm({highest_qualification_choice:degree,institution:"Another university"});
  assert.equal(institutions.registrationInstitution(form,"institution",degree).institution,"Another university");
  const result=validate(form,"professional","");
  assert.equal(result.error,undefined);
  assert.equal(result.data.institution_source,"open");assert.equal(result.data.pvmc_number,undefined);
 }
 assert.equal(institutions.isDvmQualification("D.V.M"),true);
 assert.equal(institutions.isDvmQualification("MPhil Animal Nutrition"),false);
});
test("A DVM applicant can explicitly save a pending-number draft without gaining approval",async()=>{
 const {validate,persist}=await registrationModules();
 const form=registrationForm({qualifications_choice:"DVM",pvmc_number_pending:"true",practice_areas:"Dairy / Cattle"});
 const result=validate(form,"veterinarian","");
 assert.equal(result.error,undefined);assert.equal(result.data.pvmc_number_pending,"true");
 const {db,writes}=veterinarianDraftDb();
 assert.equal(await persist(db,"owner",result.data),null);
 assert.equal(writes[0].category_details.institution_source,"pvmc:uaf");
 assert.equal(writes[0].category_details.pvmc_number,"");
 assert.equal(writes[0].category_details.verification_status,undefined);
 form.delete("pvmc_number_pending");assert.match(validate(form,"veterinarian","").error,/PVMC/);
});
test("Additional DVM institutions normalize alongside open PhD institutions in row order",async()=>{
 const {validate}=await registrationModules();
 const form=registrationForm();addDegree(form,0,"DVM");addDegree(form,1,"PhD","Another university");
 form.set("additional_institution_0_choice","__international__");form.set("additional_institution_0","Foreign Veterinary University");
 form.set("pvmc_number","12345-P");
 const result=validate(form,"professional","");
 assert.equal(result.error,undefined);
 assert.deepEqual(Array.from(result.data.additional_institutions),["Foreign Veterinary University","Another university"]);
 assert.deepEqual(Array.from(result.data.additional_institution_sources),["international","open"]);
});

test("Pending-number veterinarian drafts cannot invoke final submission",async()=>{
 const ts=(await import("typescript")).default;
 const {runInNewContext}=await import("node:vm");
 let rpcCalled=false,persistCalled=false;
 const draft={pvmc_number_pending:"true",pvmc_number:""};
 const db={auth:{getUser:async()=>({data:{user:{id:"owner",user_metadata:draft}}})},from(table){
  const row=table==="profiles"?{primary_role:"veterinarian"}:table==="registration_completion_gate"?
   {review_status:"pending",completed_at:null,cnic_number:"1234512345671"}:{category_details:draft};
  return {select:()=>({eq:()=>({maybeSingle:async()=>({data:row})})})};
 },rpc:async()=>{rpcCalled=true;return {};}};
 const exported={exports:{}};
 const code=ts.transpileModule(read("app/register/complete/actions.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{module:exported,exports:exported.exports,FormData,require:(name)=>{
  if(name==="next/navigation")return {redirect:(url)=>{throw new Error(url);}};
  if(name==="next/cache")return {revalidatePath:()=>{}};
  if(name==="@/lib/supabase/server")return {createClient:async()=>db};
  if(name==="@/lib/registration-persistence")return {registrationDraftMetadata:(meta,saved)=>({...meta,...saved}),persistRegisteredCategoryDetails:async()=>{persistCalled=true;return null;}};
  if(name==="@/lib/registration-evidence"||name==="@/lib/registration-notifications")return {};
  throw new Error("Unexpected import "+name);
 }});
 await assert.rejects(()=>exported.exports.completeRegistrationAction(),/Add%20your%20PVMC%20number/);
 assert.equal(rpcCalled,false);assert.equal(persistCalled,false);
});
