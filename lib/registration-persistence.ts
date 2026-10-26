import {createClient} from "@/lib/supabase/server";
import {PRACTICE_AREAS,SPECIALIZATIONS} from "@/lib/registration-categories";

type Db=Awaited<ReturnType<typeof createClient>>;
type Metadata=Record<string,unknown>;
const str=(m:Metadata,k:string,size=180)=>typeof m[k]==="string"?(m[k] as string).trim().slice(0,size):"";
const safeList=(m:Metadata,key:string,options:readonly string[])=>Array.isArray(m[key])?
 [...new Set(m[key].filter((x:unknown)=>typeof x==="string"&&options.includes(x)))] as string[]:[];
export async function persistRegisteredCategoryDetails(supabase:Db,userId:string,meta:Metadata):Promise<string|null>{
  // Called after authenticated OTP/confirmation, for profile content only.
  // Self-editable auth metadata MUST NEVER confer staff permissions or PVMC approval.
  const {data:record,error:statusError}=await supabase.from("profiles").select("primary_role").eq("id",userId).maybeSingle();
  if(statusError||!record)return "Registration account could not be loaded.";
  const role=record.primary_role;
  if(role==="veterinarian"){
    const pvmc=str(meta,"pvmc_number",70);
    const areas=safeList(meta,"practice_areas",PRACTICE_AREAS);
    const specs=safeList(meta,"specializations",SPECIALIZATIONS);
    const specialOther=str(meta,"specialization_other",120);
    const qualification=str(meta,"qualifications",120);
    if(!pvmc||!areas.length||!qualification)return "Your veterinary registration is missing a PVMC number, qualification or practice area.";
    const {error}=await supabase.from("veterinarian_profiles").update({
      pvmc_number:pvmc, qualifications:qualification,
      veterinary_sector:areas[0],specialization:[...specs,...(specialOther?[specialOther]:[])].join(", ")||null,
      services:areas.map(x=>"Practice area: "+x),
    }).eq("user_id",userId);
    if(error)return "Unable to save veterinary profile details: "+error.message;
  }else if(role==="professional"||role==="candidate"){
    const track=str(meta,"student_track",36);
    const student=role==="candidate"&&track&&track!=="job_seeker";
    const label=student?track==="dvm_student"?"DVM Student":track==="postgraduate_student"?"Postgraduate Student":"PhD Student":
      role==="candidate"?"Job Seeker":str(meta,"professional_type")||"Allied Professional";
    const {error}=await supabase.from("professional_profiles").update({
      professional_type:label,
      organization_name:student?str(meta,"institution"):str(meta,"organization_name"),
      headline:student?str(meta,"study_program")||label:str(meta,"specialization_other"),
      profile_visibility:"owner_only",
    }).eq("user_id",userId);
    if(error)return "Unable to save professional onboarding details: "+error.message;
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
  // Employer, clinic, and lab records remain in their existing category-specific workflows.
  return null;
}
