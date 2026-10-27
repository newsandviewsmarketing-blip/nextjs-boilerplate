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

const field=(form:FormData,key:string)=>String(form.get(key)??"").trim();
const clean=(v:string,size=180)=>v.length<=size && !/[<>\u0000-\u001f]/.test(v);
const values=(form:FormData,key:string)=>[...new Set(form.getAll(key).map(String).map(x=>x.trim()).filter(Boolean))];
export type RegistrationExtraResult={error?:string;data:Record<string,string|string[]>};
export function registrationExtraFields(form:FormData,role:string,intent:string):RegistrationExtraResult {
  const data:Record<string,string|string[]>={};
  const capture=(key:string,size=180)=>{const v=field(form,key);if(!clean(v,size))return false;if(v)data[key]=v;return true};
  const required=(key:string,size=180)=>capture(key,size)&&Boolean(field(form,key));
  if(role==="veterinarian") {
    const pvmc=field(form,"pvmc_number");
    if(!pvmc || pvmc.length>70 || !/^[a-z0-9\s/\-_.]+$/i.test(pvmc))
      return {error:"Registered veterinarians must provide their PVMC practitioner number.",data:{}};
    if(!required("qualifications",120))return {error:"Select a valid veterinary qualification.",data:{}};
    const qual=field(form,"qualifications");
    if(!/\bDVM\b|Doctor of Veterinary Medicine|B\.?V\.?Sc/i.test(qual))
      return {error:"Select a DVM or applicable PVMC-recognized veterinary qualification.",data:{}};
    if(!required("institution"))return {error:"Enter the awarding university or institution.",data:{}};
    data.qualifications=qual;
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
    for(const k of ["institution","student_college_registration_number","pvmc_student_reference","academic_year","study_program","career_interest","highest_qualification"])
      if(!capture(k,k.includes("number")||k.includes("reference")?75:180))return {error:"A student or career field is invalid.",data:{}};
    if(track==="job_seeker"&&(!field(form,"highest_qualification")||!field(form,"institution")))
      return {error:"Job seekers must provide their highest qualification and awarding institution.",data:{}};
    if(track!=="job_seeker"&&(!field(form,"institution")||!field(form,"study_program")||!field(form,"student_college_registration_number")))
      return {error:"Students must provide their institution, program and college registration number.",data:{}};
  }else if(role==="professional"){
    for(const k of ["highest_qualification","organization_name","specialization_other"])
      if(!capture(k,k==="specialization_other"?120:180))return {error:"An industry-professional field is invalid.",data:{}};
    const categories=[...new Set([...values(form,"professional_types"),field(form,"professional_type")].filter(Boolean))];
    const sectors=[...new Set([...values(form,"industry_sectors"),field(form,"industry_sector")].filter(Boolean))];
    if(!categories.length||categories.length>10||categories.some(x=>!(PROFESSIONAL_CATEGORIES as readonly string[]).includes(x)))
      return {error:"Select at least one valid professional category.",data:{}};
    if(!sectors.length||sectors.length>12||sectors.some(x=>!(PRACTICE_AREAS as readonly string[]).includes(x)))
      return {error:"Select at least one valid industry sector.",data:{}};
    if(!field(form,"highest_qualification")||!field(form,"specialization_other"))
      return {error:"Enter your highest qualification and area of expertise.",data:{}};
    data.professional_types=categories;
    data.professional_type=categories[0];
    data.industry_sectors=sectors;
    data.industry_sector=sectors[0];
  }else if(role==="company"&&intent==="clinic"){
    for(const k of ["organization_name","facility_type","company_registration_number","facility_address","responsible_veterinarian","pvmc_number"])
      if(!required(k,250))return {error:"Clinic name, registration / NTN, address and responsible veterinarian details are required.",data:{}};
    const cities=values(form,"clinic_cities");
    if(cities.length>20||cities.some(city=>!clean(city,120)))return {error:"Add no more than 20 valid clinic service cities.",data:{}};
    data.clinic_cities=cities;
  }else if(role==="company"){
    for(const k of ["organization_name","company_type","company_registration_number","industry_sector"])
      if(!required(k,180))return {error:"Company name, registration / NTN and business sector are required.",data:{}};
  }else if(role==="laboratory"){
    for(const k of ["organization_name","laboratory_type","laboratory_registration_number","tests_offered","lab_location"])
      if(!required(k,250))return {error:"Laboratory name, registration, services and location are required.",data:{}};
  }else if(role==="user"){
    for(const k of ["customer_type","animal_interest"])if(!capture(k,180))return {error:"Invalid customer information.",data:{}};
  }
  return {data};
}
