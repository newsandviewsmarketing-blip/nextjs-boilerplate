import {cache} from 'react';
import {getCurrentIdentity} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';

export type CoreProfileCheck={label:string;done:boolean};
export type CoreProfileProgress={
  checks:CoreProfileCheck[];
  percent:number;
  isVeterinaryPractitioner:boolean;
};

/**
 * The same four *core information* checks are used on every workspace page.
 * Photos, CV uploads, internships, work history, career alerts and credential
 * verification are optional or independent, and never lower this percentage.
 * Completion is not identity, licence or employer verification.
 */
export function coreProfileChecks(input:{
  fullName?:string|null;
  professionalType?:string|null;
  headline?:string|null;
  publicSummary?:string|null;
  skills?:string[]|null;
  educationCount?:number;
  experienceCount?:number;
}):CoreProfileCheck[]{
 const nonempty=(value?:string|null)=>Boolean(value?.trim());
 return [
  {label:'Basic identity',done:nonempty(input.fullName)},
  {label:'Profession or work focus',done:nonempty(input.professionalType)||nonempty(input.headline)},
  {label:'Professional introduction or skills',done:nonempty(input.publicSummary)||Boolean(input.skills?.some(nonempty))},
  {label:'Education or work background',done:Boolean((input.educationCount??0)>0||(input.experienceCount??0)>0)},
 ];
}
export function coreProfilePercentage(checks:readonly CoreProfileCheck[]):number{
 return checks.length?Math.round(checks.filter(check=>check.done).length/checks.length*100):0;
}

/** Request-scoped so the professional page and its shared layout never disagree. */
export const getCoreProfileProgress=cache(async():Promise<CoreProfileProgress|null>=>{
 const identity=await getCurrentIdentity();
 if(!identity||!identity.roles.some(role=>['veterinarian','professional','candidate'].includes(role)))return null;
 const supabase=await createClient();
 const [profile,education,experience]=await Promise.all([
  supabase.from('professional_profiles').select('professional_type,headline,public_summary,skills').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('professional_education').select('id').eq('professional_user_id',identity.userId).limit(1),
  supabase.from('professional_experience').select('id').eq('professional_user_id',identity.userId).limit(1),
 ]);
 if(profile.error||education.error||experience.error)return null;
 const checks=coreProfileChecks({
  fullName:identity.profile?.full_name,
  professionalType:profile.data?.professional_type,
  headline:profile.data?.headline,
  publicSummary:profile.data?.public_summary,
  skills:profile.data?.skills,
  educationCount:education.data?.length??0,
  experienceCount:experience.data?.length??0,
 });
 return {
  checks,
  percent:coreProfilePercentage(checks),
  isVeterinaryPractitioner:identity.roles.includes('veterinarian'),
 };
});
