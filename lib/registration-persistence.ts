import {createClient} from "@/lib/supabase/server";
import {PRACTICE_AREAS,SPECIALIZATIONS,PROFESSIONAL_CATEGORIES} from "@/lib/registration-categories";

type Db=Awaited<ReturnType<typeof createClient>>;
type Metadata=Record<string,unknown>;
const str=(m:Metadata,k:string,size=180)=>typeof m[k]==="string"?(m[k] as string).trim().slice(0,size):"";
const safeList=(m:Metadata,key:string,options:readonly string[])=>Array.isArray(m[key])?
 [...new Set(m[key].filter((x:unknown)=>typeof x==="string"&&options.includes(x)))] as string[]:[];
const textList=(m:Metadata,key:string,max=120)=>Array.isArray(m[key])?
 [...new Set(m[key].filter((x:unknown)=>typeof x==="string").map((x:string)=>x.trim()).filter((x:string)=>x.length>0&&x.length<=max&&!/[<>\\u0000-\\u001f]/.test(x)))].slice(0,30):[];
export async function persistRegisteredCategoryDetails(supabase:Db,userId:string,meta:Metadata):Promise<string|null>{
  // Called after authenticated OTP/confirmation, for profile content only.
  // Self-editable auth metadata MUST NEVER confer staff permissions or PVMC approval.
  const {data:record,error:statusError}=await supabase.from("profiles").select("primary_role").eq("id",userId).maybeSingle();
  if(statusError||!record)return "Registration account could not be loaded.";
  const role=record.primary_role;
  const allowedKeys=[
    "experience_years","current_designation","current_workplace","professional_summary",
    "pvmc_number","qualifications","institution","practice_areas","specializations","specialization_other",
    "student_track","highest_qualification","study_program","student_college_registration_number",
    "pvmc_student_reference","academic_year","career_interest","professional_type","professional_types",
    "industry_sector","industry_sectors","organization_name","facility_type","company_type",
    "company_registration_number","facility_address","responsible_veterinarian","clinic_cities",
    "laboratory_type","laboratory_registration_number","tests_offered","lab_location","customer_type","animal_interest"
  ];
  const categoryDetails:Metadata={};
  for(const key of allowedKeys){
    const value=meta[key];
    if(typeof value==="string"&&value.length<=250)categoryDetails[key]=value;
    else if(Array.isArray(value)&&value.length<=30&&value.every(item=>typeof item==="string"&&item.length<=180))
      categoryDetails[key]=[...new Set(value.map((item:string)=>item.trim()).filter(Boolean))];
  }
  const {error:detailsError}=await supabase.from("registration_profile_details").upsert(
    {user_id:userId,category_details:categoryDetails},
    {onConflict:"user_id"}
  );
  if(detailsError)return "Unable to securely save your registration details: "+detailsError.message;
  if(role==="veterinarian"){
    const pvmc=str(meta,"pvmc_number",70);
    const areas=safeList(meta,"practice_areas",PRACTICE_AREAS);
    const specs=safeList(meta,"specializations",SPECIALIZATIONS);
    const specialOther=str(meta,"specialization_other",120);
    const qualification=str(meta,"qualifications",120);
    const institution=str(meta,"institution",180);
    if(!pvmc||!areas.length||!qualification||!institution)return "Your veterinary registration is missing a PVMC number, qualification, awarding institution or practice area.";
    const credentialLabel=institution?qualification+" — "+institution:qualification;
    const {error}=await supabase.from("veterinarian_profiles").update({
      pvmc_number:pvmc, qualifications:credentialLabel,
      veterinary_sector:areas[0],specialization:[...specs,...(specialOther?[specialOther]:[])].join(", ")||null,
      services:areas.map(x=>"Practice area: "+x),
    }).eq("user_id",userId);
    if(error)return "Unable to save veterinary profile details: "+error.message;
  }else if(role==="professional"||role==="candidate"){
    const track=str(meta,"student_track",36);
    const student=role==="candidate"&&track&&track!=="job_seeker";
    const label=student?track==="dvm_student"?"DVM Student":track==="postgraduate_student"?"Postgraduate Student":"PhD Student":
      role==="candidate"?"Job Seeker":str(meta,"professional_type")||"Allied Professional";
    const institution=str(meta,"institution",180);
    const qualification=student?str(meta,"study_program",180):str(meta,"highest_qualification",180);
    const interest=str(meta,"career_interest",180);
    const selectedFields=[
      ...safeList(meta,"professional_types",PROFESSIONAL_CATEGORIES),
      str(meta,"professional_type",100),
    ].filter(Boolean);
    const sectors=[
      ...safeList(meta,"industry_sectors",PRACTICE_AREAS),
      str(meta,"industry_sector",120),
    ].filter(Boolean);
    const expertise=[str(meta,"specialization_other",120),interest].filter(Boolean);
    const skills=[...new Set([...selectedFields,...sectors,...expertise].map(x=>x.trim()).filter(Boolean))];
    const {error}=await supabase.from("professional_profiles").update({
      professional_type:label,
      organization_name:student?institution:str(meta,"organization_name"),
      headline:student?str(meta,"study_program")||label:role==="candidate"?(interest||"Job Seeker"):str(meta,"specialization_other"),
      skills,
      profile_visibility:"owner_only",
    }).eq("user_id",userId);
    if(error)return "Unable to save professional onboarding details: "+error.message;
    // Store the qualification and institution in the normalized education record
    // so the reviewer can see the submitted credential after OTP confirmation.
    if(qualification){
      const {data:educationRows,error:educationReadError}=await supabase.from("professional_education")
        .select("id").eq("professional_user_id",userId).eq("degree",qualification).eq("institution",institution||"");
      if(educationReadError)return "Could not verify the saved education record: "+educationReadError.message;
      if(!educationRows?.length){
        const {error:educationInsertError}=await supabase.from("professional_education").insert({
          professional_user_id:userId,degree:qualification,institution:institution||null,
          field_of_study:str(meta,"industry_sector",120)||str(meta,"study_program",180)||null,
          is_current:Boolean(student),visibility:"owner_only"
        });
        if(educationInsertError)return "Unable to save the submitted education details: "+educationInsertError.message;
      }
    }
    // Student registration numbers are PRIVATE credential records, never public skills or CV text.
    // Do not treat university and PVMC student references as RVMP practitioner licence numbers.
    if(student){
      const institution=str(meta,"institution");
      const collegeNumber=str(meta,"student_college_registration_number",75);
      const studentPvmc=str(meta,"pvmc_student_reference",75);
      for(const item of [
        {number:collegeNumber,type:"college_university_student_number"},
        {number:studentPvmc,type:"pvmc_student_reference"}
      ]){
        if(!item.number)continue;
        const {data:existing,error:readError}=await supabase.from("professional_credentials")
          .select("id").eq("professional_user_id",userId).eq("credential_type",item.type).eq("credential_number",item.number).limit(1);
        if(readError)return "Could not check private student identifiers: "+readError.message;
        if(existing?.length)continue;
        const {error:insertError}=await supabase.from("professional_credentials").insert({
          professional_user_id:userId,credential_type:item.type,credential_number:item.number,
          issuing_authority:institution||"Institution not provided",
          verification_status:"pending",visibility:"owner_only"
        });
        if(insertError)return "Unable to save student registration identifier: "+insertError.message;
      }
    }
  }
  if(role==="company"){
    const clinic=str(meta,"registration_intent")==="clinic";
    const companyName=str(meta,"organization_name",180);
    // Business details stay in the private registration row until admin approval.
    // A pending company has no active workspace membership and cannot update canonical company tables.
    if(clinic){
      const clinicName=companyName||str(meta,"full_name",180);
      const slug=clinicName.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)+"-"+userId.slice(0,8);
      const {data:existingClinic,error:clinicReadError}=await supabase.from("clinics").select("id").eq("owner_id",userId).limit(1).maybeSingle();
      if(clinicReadError)return "Unable to check the clinic profile: "+clinicReadError.message;
      const primaryCity=str(meta,"city",120);
      const additionalCities=textList(meta,"clinic_cities").filter(city=>city.toLowerCase()!==primaryCity.toLowerCase());
      const clinicData={
        clinic_name:clinicName,
        facility_type:str(meta,"facility_type",120)||"Veterinary Clinic",
        city:primaryCity||additionalCities[0]||null,
        other_cities:additionalCities,
        address:str(meta,"facility_address",250)||null,
        registration_number:str(meta,"company_registration_number",180)||null,
        responsible_veterinarian_name:str(meta,"responsible_veterinarian",180)||null,
        responsible_veterinarian_pvmc:str(meta,"pvmc_number",70)||null,
        public_phone:str(meta,"phone",35)||null,
        public_email:str(meta,"email",254)||null,
        verification_status:"pending",
        is_published:false,
      };
      const clinicResult=existingClinic
        ? await supabase.from("clinics").update(clinicData).eq("id",existingClinic.id)
        : await supabase.from("clinics").insert({...clinicData,owner_id:userId,slug});
      if(clinicResult.error)return "Unable to save the clinic profile: "+clinicResult.error.message;
    }
  }
  if(role==="laboratory"){
    const {error}=await supabase.from("laboratories").update({
      laboratory_type:str(meta,"laboratory_type")||null,
      registration_number:str(meta,"laboratory_registration_number",120)||null,
      address:str(meta,"lab_location",250)||null,
      tests_offered:str(meta,"tests_offered",250).split(",").map(x=>x.trim()).filter(Boolean)
    }).eq("owner_id",userId);
    if(error)return "Unable to save laboratory onboarding details: "+error.message;
  }
  return null;
}
