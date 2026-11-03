"use server";

import {requireCareerAccount} from "@/lib/career-access";
import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {matchingVerifiedAccountEmail} from "@/lib/career-email-verification";
import {inspectCvFile} from "@/lib/guest-job-applications";

export async function uploadCareerCvAction(formData:FormData){
 const destination=formData.get("return_to")==="/career/cv"?"/career/cv?mode=upload":"/dashboard/career";
 const uploadFail=(message:string):never=>redirect(destination+(destination.includes("?")?"&":"?")+"error="+encodeURIComponent(message));
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/dashboard/career");
 if(!identity.roles.some(r=>["candidate","professional","veterinarian"].includes(r)))uploadFail("Career profile required.");
 const file=formData.get("cv_file");
 if(!(file instanceof File)||file.size===0)return uploadFail("Select a PDF, Word, JPG or PNG CV.");
 let validated:Awaited<ReturnType<typeof inspectCvFile>>;
 try{validated=await inspectCvFile(file);}
 catch(e){return uploadFail(e instanceof Error?e.message:"Invalid CV file.");}
 const supabase=await createClient();
 if(!await matchingVerifiedAccountEmail(supabase,identity.userId,String(formData.get("confirm_email")??"")))uploadFail("Enter your own verified login email to upload your CV.");
 const path=identity.userId+"/cv/"+randomUUID()+"."+validated.ext;
 const {error:uploadError}=await supabase.storage.from("career-documents").upload(path,file,{
  contentType:validated.mime,upsert:false
 });
 if(uploadError)uploadFail("CV upload failed: "+uploadError.message);
 const {data:record,error}=await supabase.from("career_documents").insert({
  professional_user_id:identity.userId,document_type:"cv",file_path:path,
  template_type:"uploaded",is_current:true,visibility:"owner_only"
 }).select("id").single();
 if(error||!record){
   await supabase.storage.from("career-documents").remove([path]);
   return uploadFail("CV could not be saved: "+(error?.message||"Unknown error"));
 }
 await supabase.from("career_documents").update({is_current:false})
    .eq("professional_user_id",identity.userId).eq("document_type","cv").neq("id",record.id);
 revalidatePath("/dashboard/career");
 redirect(destination+(destination.includes("?")?"&":"?")+"message="+encodeURIComponent("Original CV saved privately to your account."));
}

function value(data:FormData,key:string,max:number){
 return String(data.get(key)??"").trim().slice(0,max);
}
export async function saveCareerCvBuilderAction(formData:FormData){
 const {identity,supabase}=await requireCareerAccount();
 const name=value(formData,"full_name",120);
 if(name.length<2)redirect("/career/cv?error=Enter%20your%20full%20name.");
 const {error}=await supabase.from("career_cv_profiles").upsert({
  user_id:identity.userId,full_name:name,
  contact_email:value(formData,"contact_email",200)||null,
  phone:value(formData,"phone",40)||null,
  headline:value(formData,"headline",200)||null,
  education:value(formData,"education",3000)||null,
  experience:value(formData,"experience",4000)||null,
  skills:value(formData,"skills",3000)||null,
  updated_at:new Date().toISOString()
 },{onConflict:"user_id"});
 if(error)redirect("/career/cv?error="+encodeURIComponent(error.message));
 revalidatePath("/dashboard/career");
 revalidatePath("/career/cv");
 redirect("/career/cv?review=1&message="+encodeURIComponent("CV saved. Open the saved CV to print or save a PDF, then choose future job interests."));
}

export async function uploadCareerPhotoAction(formData:FormData){
 const {identity,supabase}=await requireCareerAccount();
 const failPhoto=(message:string):never=>redirect('/career/cv?error='+encodeURIComponent(message));
 const file=formData.get('photo');
 if(!(file instanceof File)||file.size===0||file.size>5*1024*1024)return failPhoto('Choose a photograph up to 5 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const ext=file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':
  file.type==='image/png'&&bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'?'png':
  file.type==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'webp':null;
 if(!ext)failPhoto('Choose a valid JPG, PNG or WebP photograph.');
 const {data:cv,error:readError}=await supabase.from('career_cv_profiles').select('user_id').eq('user_id',identity.userId).maybeSingle();
 if(readError)return failPhoto('Your CV could not be loaded. Please retry.');
 if(!cv){
  const name=identity.profile?.full_name?.trim();
  if(!name)return failPhoto('Save your name in the CV form before uploading a photograph.');
  const {error:draftError}=await supabase.from('career_cv_profiles').upsert({user_id:identity.userId,full_name:name},{onConflict:'user_id',ignoreDuplicates:true});
  if(draftError)return failPhoto('Your private CV draft could not be started. Please retry.');
 }
 const path=identity.userId+'/'+randomUUID()+'.'+ext;
 const {error:uploadError}=await supabase.storage.from('career-cv-photos').upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError)failPhoto('Photograph could not be uploaded. Please retry.');
 const {data:saved,error}=await supabase.from('career_cv_profiles').update({photo_path:path}).eq('user_id',identity.userId).select('user_id').maybeSingle();
 if(error||!saved){await supabase.storage.from('career-cv-photos').remove([path]);failPhoto('Photograph could not be saved. Please retry.');}
 revalidatePath('/career/cv');revalidatePath('/career/cv/print');
 redirect('/career/cv?message=Your%20private%20CV%20photograph%20is%20saved.');
}


/** Candidate-supplied follow-up log. External phone/WhatsApp messages are not automatically tracked. */
export async function recordJobApplicationActivityAction(formData:FormData){
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/dashboard/career");
 if(!identity.roles.some(role=>["candidate","professional","veterinarian"].includes(role)))
  redirect("/dashboard/career?error="+encodeURIComponent("Career access required."));
 const applicationId=String(formData.get("application_id")??"").trim();
 const kind=String(formData.get("activity_type")??"").trim();
 const direction=String(formData.get("direction")??"").trim();
 const details=String(formData.get("details")??"").trim();
 const allowed=["phone_call","message","interview","follow_up","note"];
 if(!/^[a-f0-9-]{36}$/i.test(applicationId)||!allowed.includes(kind)||
    !["received","sent","not_applicable"].includes(direction)||details.length<1||details.length>2000)
  redirect("/dashboard/career?error="+encodeURIComponent("Choose an activity and enter a note (up to 2,000 characters)."));
 const supabase=await createClient();
 const {data:application,error:ownerError}=await supabase.from("job_applications")
  .select("id").eq("id",applicationId).eq("candidate_user_id",identity.userId).maybeSingle();
 if(ownerError||!application)
  redirect("/dashboard/career?error="+encodeURIComponent("Application not found in your account."));
 const {error}=await supabase.from("job_application_activity").insert({
  application_id:applicationId,candidate_user_id:identity.userId,
  activity_type:kind,direction,details
 });
 if(error)redirect("/dashboard/career?error="+encodeURIComponent("Could not save the activity. The timeline may not yet be enabled."));
 revalidatePath("/dashboard/career");
 redirect("/dashboard/career?message="+encodeURIComponent("Follow-up recorded privately in your application history."));
}
