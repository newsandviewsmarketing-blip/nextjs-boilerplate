export const PRACTICE_AREAS = [
  "Pets / Companion Animals", "Dairy / Cattle", "Livestock / Small Ruminants",
  "Poultry", "Equine", "Aquaculture / Fisheries", "Wildlife / Zoo",
  "Public Health / One Health", "Diagnostics / Laboratory",
  "Feed / Nutrition", "Pharmaceutical / Industry", "Academia / Research"
] as const;
export const SPECIALIZATIONS = [
  "Small Animal Medicine","Small Animal Surgery","Dairy Nutrition","Dairy Herd Health",
  "Bovine Medicine","Large Animal Medicine","Reproduction & Theriogenology",
  "Poultry Health & Disease","Poultry Nutrition","Veterinary Pathology",
  "Microbiology","Veterinary Public Health","Animal Nutrition",
  "Feed Formulation","Diagnostics","Regulatory Affairs","Veterinary Epidemiology"
] as const;

const field=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const clean=(v:string,size=180)=>v.length<=size && !/[<>\u0000-\u001f]/.test(v);
const values=(form:FormData,key:string)=>[...new Set(form.getAll(key).map(String).map(x=>x.trim()).filter(Boolean))];
export type RegistrationExtraResult={error?:string;data:Record<string,string|string[]>};
export function registrationExtraFields(form:FormData,role:string,intent:string):RegistrationExtraResult {
  const data:Record<string,string|string[]>={};
  const capture=(key:string,size=180)=>{const v=field(form,key);if(!clean(v,size))return false;if(v)data[key]=v;return true};
  if(role==="veterinarian") {
    const pvmc=field(form,"pvmc_number");
    if(!pvmc || pvmc.length>70 || !/^[a-z0-9\s/\-_.]+$/i.test(pvmc))
      return {error:"Registered veterinarians must provide a valid-format PVMC registration number before creating a veterinary profile.",data:{}};
    if(!capture("qualifications",120))return {error:"Please enter a valid qualification.",data:{}};
    const qual=field(form,"qualifications");
    if(!/\bDVM\b|Doctor of Veterinary Medicine|B\.?V\.?Sc/i.test(qual))
      return {error:"Select a DVM or applicable PVMC-recognized veterinary qualification. Students and allied professionals should select their own registration pathway.",data:{}};
    if(!capture("institution",180))return {error:"Invalid university name.",data:{}};
    const areas=values(form,"practice_areas");
    if(!areas.length||areas.length>12||areas.some(x=>!(PRACTICE_AREAS as readonly string[]).includes(x)))return {error:"Select at least one valid practice area.",data:{}};
    const specs=values(form,"specializations");
    if(specs.length>12||specs.some(x=>!(SPECIALIZATIONS as readonly string[]).includes(x)))return {error:"Select only listed specializations.",data:{}};
    if(!capture("specialization_other",120))return {error:"Invalid additional specialization.",data:{}};
    data.practice_areas=areas;
    data.specializations=[...specs,...(field(form,"specialization_other")?[field(form,"specialization_other")]:[])];
    data.pvmc_number=pvmc;
  } else if(role==="candidate"){
    const track=field(form,"student_track");
    if(!["dvm_student","postgraduate_student","phd_student","job_seeker"].includes(track))return {error:"Select your student or career pathway.",data:{}};
    data.student_track=track;
    for(const k of ["institution","student_college_registration_number","pvmc_student_reference","academic_year","study_program","career_interest"])
      if(!capture(k,k.includes("number")||k.includes("reference")?75:180))return {error:"A student or career field is invalid.",data:{}};
    if(track!=="job_seeker"&&!field(form,"institution"))return {error:"Students must provide their college or university name.",data:{}};
  }else if(role==="professional"){
    for(const k of ["professional_type","highest_qualification","industry_sector","organization_name","specialization_other"]){if(!capture(k,180))return {error:"An industry professional field is invalid.",data:{}}}
    if(!field(form,"professional_type"))return {error:"Select your allied industry professional role.",data:{}};
  }else if(role==="company"&&intent==="clinic"){
    for(const k of ["organization_name","facility_type","facility_address","responsible_veterinarian","pvmc_number"]){if(!capture(k,250))return {error:"Invalid clinic registration details.",data:{}}}
    if(!field(form,"organization_name"))return {error:"Clinic or hospital name is required.",data:{}};
    if(!field(form,"pvmc_number"))return {error:"Enter the responsible practitioner's PVMC registration number for clinical verification.",data:{}};
  }else if(role==="company"){
    for(const k of ["organization_name","company_type","company_registration_number","industry_sector"]){if(!capture(k,180))return {error:"A company field is invalid.",data:{}}}
    if(!field(form,"organization_name"))return {error:"Company or employer name is required.",data:{}};
  }else if(role==="laboratory"){
    for(const k of ["organization_name","laboratory_type","tests_offered","lab_location"]){if(!capture(k,250))return {error:"A laboratory field is invalid.",data:{}}}
    if(!field(form,"organization_name"))return {error:"Laboratory name is required.",data:{}};
  }else if(role==="user"){
    for(const k of ["customer_type","animal_interest"]){if(!capture(k,180))return {error:"Invalid customer information.",data:{}}}
  }
  return {data};
}
