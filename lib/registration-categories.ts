import { hasDocumentedVeterinaryQualification } from "@/lib/veterinary-verification";
import { isPakistanLocation, isPakistanLocationInProvince, PAKISTAN_PROVINCES } from "@/lib/pakistan-locations";

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
export const PROFESSIONAL_CATEGORIES = [
  "Animal Nutritionist","Dairy Nutritionist","Farm Manager","Livestock Production Specialist",
  "Poultry Professional","Veterinary Sales / Marketing","Laboratory Technologist",
  "Researcher / Academic","Feed Formulation Specialist","Other Allied Professional"
] as const;

export const VETERINARY_QUALIFICATIONS = ["DVM", "BVSc (PVMC-recognized)"] as const;
export const ACADEMIC_QUALIFICATIONS = [
  "DVM", "BVSc (PVMC-recognized)", "BS / BSc", "MSc / MS", "MPhil",
  "PhD", "Diploma / Certificate", "Intermediate / Higher Secondary"
] as const;
export const STUDENT_PROGRAMS_BY_TRACK = {
  dvm_student: ["DVM"],
  postgraduate_student: ["MSc / MS", "MPhil", "Postgraduate Diploma / Certificate"],
  phd_student: ["PhD"],
} as const;

const field=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const clean=(v:string,size=180)=>v.length<=size && !/[<>\u0000-\u001f]/.test(v);
const values=(form:FormData,key:string)=>[...new Set(form.getAll(key).map(String).map(x=>x.trim()).filter(Boolean))];
export type RegistrationExtraResult={error?:string;data:Record<string,string|string[]>};
export function registrationExtraFields(form:FormData,role:string,intent:string):RegistrationExtraResult {
  const data:Record<string,string|string[]>={};
  const capture=(key:string,size=180)=>{const v=field(form,key);if(!clean(v,size))return false;if(v)data[key]=v;return true;};
  const required=(key:string,size=180)=>capture(key,size)&&Boolean(field(form,key));
  const qualification=(key:string,options:readonly string[])=>{
    const selected=field(form,key+"_choice");
    if(selected==="__other__"){
      const other=field(form,key+"_other");
      if(!other||!clean(other,173))return false;
      data[key]="Other: "+other;
      return true;
    }
    if(!options.includes(selected))return false;
    data[key]=selected;
    return true;
  };
  if (["veterinarian", "candidate", "professional"].includes(role)) {
    for (const key of ["current_designation", "current_workplace", "professional_summary"])
      if (!capture(key, key === "professional_summary" ? 250 : 180)) return {error:"Invalid professional experience information.",data:{}};
    const years = field(form,"experience_years");
    if (years && (!/^\d{1,2}$/.test(years) || Number(years) > 80)) return {error:"Experience must be a whole number from 0 to 80 years.",data:{}};
    if (years) data.experience_years = years;
  }
  const city=field(form,"city");
  if(!isPakistanLocation(city))return {error:"Choose your city or town from the Pakistan locations list.",data:{}};
  const province=field(form,"province");
  if (!PAKISTAN_PROVINCES.includes(province) || !isPakistanLocationInProvince(city, province))
    return {error:"Select a province / territory and a city belonging to that province.",data:{}};
  data.city=city;
  data.province=province;

  if (["veterinarian", "candidate", "professional"].includes(role)) {
    const indices=form.getAll("additional_qualification_index").map(String);
    if(indices.length>10 || new Set(indices).size!==indices.length || indices.some(index=>!/^\d{1,6}$/.test(index)))
      return {error:"Add up to 10 additional degrees using the degree fields.",data:{}};
    const degrees:string[]=[], institutions:string[]=[];
    for(const index of indices){
      const key="additional_qualification_"+index;
      if(!qualification(key,ACADEMIC_QUALIFICATIONS))return {error:"Select or specify each additional degree.",data:{}};
      const institution=field(form,"additional_institution_"+index);
      if(!institution||!clean(institution))return {error:"Enter the awarding institution for each additional degree.",data:{}};
      degrees.push(String(data[key]));institutions.push(institution);delete data[key];
    }
    data.additional_qualifications=degrees;
    data.additional_institutions=institutions;
  }

  if(role==="veterinarian") {
    const pvmc=field(form,"pvmc_number");
    if(!pvmc || pvmc.length>70 || !/^[a-z0-9\s/\\_.-]+$/i.test(pvmc))
      return {error:"Registered veterinarians must provide their PVMC practitioner number.",data:{}};
    if(!qualification("qualifications",VETERINARY_QUALIFICATIONS))return {error:"Select a listed veterinary qualification or specify another qualification for administrator review.",data:{}};
    const qual=String(data.qualifications);
    if(!/^(DVM|BVSc \(PVMC-recognized\)|Other: .{2,})$/i.test(qual))
      return {error:"Select a DVM, PVMC-recognized BVSc or specify another veterinary qualification.",data:{}};
    if(!required("institution"))return {error:"Enter the awarding university or institution.",data:{}};
    data.institution=field(form,"institution");
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
    if(!["dvm_student","postgraduate_student","phd_student","job_seeker"].includes(track))return {error:"Select your student or job-seeker pathway.",data:{}};
    data.student_track=track;
    for(const k of ["institution","student_college_registration_number","pvmc_student_reference","academic_year","career_interest"])
      if(!capture(k,k.includes("number")||k.includes("reference")?75:180))return {error:"A student or career field is invalid.",data:{}};
    if(track==="job_seeker"){
      if(!qualification("highest_qualification",ACADEMIC_QUALIFICATIONS))return {error:"Select your highest qualification or specify it for administrator review.",data:{}};
      if(!field(form,"institution"))return {error:"Job seekers must provide their awarding institution.",data:{}};
    }else{
      const allowed=STUDENT_PROGRAMS_BY_TRACK[track as keyof typeof STUDENT_PROGRAMS_BY_TRACK];
      if(!qualification("study_program",allowed))return {error:"Select a valid study program or specify it for administrator review.",data:{}};
      if(!field(form,"institution")||!field(form,"student_college_registration_number"))return {error:"Students must provide their institution, program and college registration number.",data:{}};
    }
  }else if(role==="professional"){
    if(!qualification("highest_qualification",ACADEMIC_QUALIFICATIONS))return {error:"Select your highest qualification or specify it for administrator review.",data:{}};
    for(const k of ["institution","organization_name","specialization_other"])
      if(!capture(k,k==="specialization_other"?120:180))return {error:"An industry-professional field is invalid.",data:{}};
    const categories=[...new Set([...values(form,"professional_types"),field(form,"professional_type")].filter(Boolean))];
    const sectors=[...new Set([...values(form,"industry_sectors"),field(form,"industry_sector")].filter(Boolean))];
    if(!categories.length||categories.length>10||categories.some(x=>!(PROFESSIONAL_CATEGORIES as readonly string[]).includes(x)))
      return {error:"Select at least one valid professional category.",data:{}};
    if(!sectors.length||sectors.length>12||sectors.some(x=>!(PRACTICE_AREAS as readonly string[]).includes(x)))
      return {error:"Select at least one valid industry sector.",data:{}};
    if(!field(form,"institution")||!field(form,"specialization_other"))
      return {error:"Enter your qualification, awarding institution and area of expertise.",data:{}};
    data.professional_types=categories;
    data.professional_type=categories[0];
    data.industry_sectors=sectors;
    data.industry_sector=sectors[0];
  }else if(role==="company"&&intent==="clinic"){
    for(const k of ["organization_name","facility_type","company_registration_number","facility_address","responsible_veterinarian","pvmc_number"])
      if(!required(k,250))return {error:"Clinic name, registration / NTN, address and responsible veterinarian details are required.",data:{}};
    const cities=values(form,"clinic_cities");
    if(cities.length>20||cities.some(city=>!isPakistanLocation(city)))return {error:"Choose up to 20 clinic service cities from the Pakistan locations list.",data:{}};
    data.clinic_cities=cities;
  }else if(role==="company"){
    for(const k of ["organization_name","company_type","company_registration_number","industry_sector"])
      if(!required(k,180))return {error:"Company name, registration / NTN and business sector are required.",data:{}};
  }else if(role==="laboratory"){
    for(const k of ["organization_name","laboratory_type","laboratory_registration_number","tests_offered","lab_location"])
      if(!required(k,250))return {error:"Laboratory name, registration, services and address are required.",data:{}};
  }else if(role==="user"){
    for(const k of ["customer_type","animal_interest"])if(!capture(k,180))return {error:"Invalid customer information.",data:{}};
  }
  const completedPrimary=role==="veterinarian" ? String(data.qualifications??"") :
    role==="professional" || (role==="candidate" && data.student_track==="job_seeker") ? String(data.highest_qualification??"") : "";
  const completedDegrees=[completedPrimary,...(Array.isArray(data.additional_qualifications)?data.additional_qualifications:[])];
  if (["candidate","professional"].includes(role) && completedDegrees.some(hasDocumentedVeterinaryQualification)) {
    const pvmc=field(form,"pvmc_number");
    if(!pvmc || pvmc.length>70 || !/^[a-z0-9\s/\\_.-]+$/i.test(pvmc))
      return {error:"A completed DVM / recognized veterinary degree requires a PVMC practitioner registration number. Current students do not need a practitioner number for their ongoing program.",data:{}};
    data.pvmc_number=pvmc;
  }
  return {data};
}
