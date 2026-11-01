/**
 * VetConnect publication readiness for a veterinary practice.
 *
 * This is a completeness gate, not PVMC registry verification.
 * A human reviewer must separately check registration, evidence,
 * clinical responsibility and authorization before publication.
 */
export type ClinicPracticeRecord = {
  clinic_name?:string|null;
  responsible_veterinarian_name?:string|null;
  responsible_veterinarian_pvmc?:string|null;
  province?:string|null;
  city?:string|null;
};
export function clinicPracticeReadiness(
 clinic:ClinicPracticeRecord,
 activeDays:number,
 activePublicServices:number
):string[]{
 const missing:string[]=[];
 if(!clinic.clinic_name?.trim())missing.push("Clinic or hospital name");
 if(!clinic.responsible_veterinarian_name?.trim())missing.push("Responsible registered veterinarian's name");
 const pvmc=clinic.responsible_veterinarian_pvmc?.trim()??"";
 if(!pvmc||pvmc.length<3||pvmc.length>70)missing.push("Responsible veterinarian's PVMC registration number");
 if(!clinic.province?.trim()||!clinic.city?.trim())missing.push("Province and city");
 if(activeDays<1)missing.push("At least one open day in the weekly schedule");
 if(activePublicServices<1)missing.push("At least one active public clinical service");
 return missing;
}
