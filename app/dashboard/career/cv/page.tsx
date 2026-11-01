import CvComposer from "./CvComposer";
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {careerPhoto} from "@/lib/career-photo";
import Link from "next/link";
import {careerCvDefaults} from "@/lib/career-cv-defaults";
import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {uploadCareerCvAction,uploadCareerPhotoAction} from "../actions";

export const dynamic="force-dynamic";
export default async function BuildCV({searchParams}:{
 searchParams:Promise<{error?:string;message?:string;print?:string;mode?:string;review?:string}>
}){
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/career/cv");
 if(!identity.roles.some(role=>["candidate","professional","veterinarian"].includes(role)))
  redirect("/dashboard?error=Career%20account%20required.");
 const supabase=await createClient();
 const {data:savedCv,error:cvError}=await supabase.from("career_cv_profiles")
  .select("full_name,contact_email,phone,headline,education,experience,skills,photo_path")
  .eq("user_id",identity.userId).maybeSingle();
 const [profile,education,experience,registration,documents]=await Promise.all([
  supabase.from("professional_profiles").select("headline,skills,image_url,verification_status").eq("user_id",identity.userId).maybeSingle(),
  supabase.from("professional_education").select("degree,institution").eq("professional_user_id",identity.userId).order("is_current",{ascending:false}),
  supabase.from("professional_experience").select("designation,organization_name,responsibilities").eq("professional_user_id",identity.userId).order("is_current",{ascending:false}),
  supabase.from("registration_profile_details").select("category_details").eq("user_id",identity.userId).maybeSingle(),
  supabase.from("career_documents").select("id,created_at,is_current").eq("professional_user_id",identity.userId).eq("document_type","cv").order("created_at",{ascending:false}).limit(5),
 ]);
 const cv=careerCvDefaults(savedCv,{
  name:identity.profile?.full_name??"",email:identity.email,phone:identity.profile?.phone??null,
  headline:profile.data?.headline,skills:profile.data?.skills,
  education:education.data??[],experience:experience.data??[],registration:registration.data?.category_details,
 });
 const loadError=cvError||profile.error||education.error||experience.error;
 const photoUrl=await careerPhoto(supabase,identity.userId,savedCv?.photo_path,profile.data?.image_url);
 const params=await searchParams;
 return <CareerWorkspaceFrame
   active="cv"
   name={identity.profile?.full_name||identity.email}
   headline={profile.data?.headline}
   location={[identity.profile?.city,identity.profile?.province].filter(Boolean).join(', ')}
   photoUrl={photoUrl}
   verificationStatus={profile.data?.verification_status}
   approved={profile.data?.verification_status==='approved'}
   cvStatus={savedCv?'saved':'missing'}
   checklist={[
     {label:"Basic identity",done:Boolean(identity.profile?.full_name)},
     {label:"Profession / headline",done:Boolean(cv.headline?.trim())},
     {label:"Education information",done:Boolean(cv.education?.trim())},
     {label:"Technical skills",done:Boolean(cv.skills?.trim())},
     {label:"CV photograph",done:Boolean(photoUrl),optional:true}
   ]}
   title="Your CV, professionally arranged."
   description="Create a clean VetConnect résumé, or privately upload the CV you already have.">
   <div className="vcx-cv-body">
    {params.error&&<p role="alert" className="form-message form-message-error">{params.error}</p>}
    {params.message&&<p role="status" className="form-message form-message-success">{params.message}</p>}
    {loadError&&<p role="alert" className="form-message form-message-error">Saved information could not be loaded. Please retry before saving.</p>}
    <nav className="cv-mode-choice" aria-label="CV creation method"><Link href="/career/cv" aria-current={params.mode!=='upload'?'page':undefined}>Build from my profile</Link><Link href="/career/cv?mode=upload" aria-current={params.mode==='upload'?'page':undefined}>Upload an existing CV</Link></nav>
    {params.mode==='upload'?<div className="backend-form-card"><h2>Use your existing CV</h2>{documents.error?<p role="alert">Saved CV files could not be loaded. Please retry.</p>:(documents.data??[]).length>0&&<ul>{documents.data?.map(doc=><li key={doc.id}><a href={'/api/career/documents/'+doc.id} target="_blank" rel="noopener noreferrer">Saved CV · {new Date(doc.created_at).toLocaleDateString('en-PK')}{doc.is_current?' · Current':''}</a></li>)}</ul>}<p>Upload your original file for job applications. Uploading does not automatically extract or overwrite profile details.</p><form action={uploadCareerCvAction} className="profile-form" encType="multipart/form-data"><input type="hidden" name="return_to" value="/career/cv"/><label htmlFor="existing-cv">CV file (PDF, Word, JPG or PNG; up to 5 MB)</label><input id="existing-cv" name="cv_file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required/><label htmlFor="existing-cv-email">Confirm your verified login email</label><input id="existing-cv-email" name="confirm_email" type="email" defaultValue={identity.email} required/><button className="button button-primary" type="submit">Save original CV privately</button></form></div>:
    <div className="backend-form-card"><CvComposer saved={params.review==="1"} cv={cv} photoUrl={photoUrl} location={[identity.profile?.city,identity.profile?.province].filter(Boolean).join(', ')} disabled={Boolean(loadError)} photoForm={<form action={uploadCareerPhotoAction} encType="multipart/form-data"><label htmlFor="private-cv-photo">Private photograph (JPG, PNG, WebP; up to 5 MB)</label><input id="private-cv-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/><button type="submit" className="button button-secondary">Upload photograph</button><p>Upload your photograph before editing CV fields. It is saved separately; your existing profile photograph is reused where available.</p></form>}/></div>}
    <div className="cv-next-actions">{savedCv&&<a className="button button-secondary" href="/career/cv/print" target="_blank" rel="noopener noreferrer">Open saved CV / Save PDF</a>}<Link className="button button-primary" href="/career/preferences">Next: future job preferences</Link><Link href="/career">My profile home</Link></div>
   </div></CareerWorkspaceFrame>;
}