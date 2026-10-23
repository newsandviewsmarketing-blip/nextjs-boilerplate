"use server";

import {randomUUID} from "node:crypto";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";

function fail(message:string):never{
 redirect("/dashboard/career?error="+encodeURIComponent(message));
}
const ACCEPTED=new Set([
 "application/pdf","application/msword",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
export async function uploadCareerCvAction(formData:FormData){
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/dashboard/career");
 if(!identity.roles.some(r=>["candidate","professional","veterinarian"].includes(r)))fail("Career profile required.");
 const file=formData.get("cv_file");
 if(!(file instanceof File)||file.size===0)fail("Select a PDF, DOC or DOCX CV.");
 if(file.size>10*1024*1024||!ACCEPTED.has(file.type))
  fail("CV must be a PDF, DOC or DOCX up to 10 MB.");
 const supabase=await createClient();
 const ext=file.type==="application/pdf"?"pdf":file.type==="application/msword"?"doc":"docx";
 const path=identity.userId+"/cv/"+randomUUID()+"."+ext;
 const {error:uploadError}=await supabase.storage.from("career-documents").upload(path,file,{
  contentType:file.type,upsert:false
 });
 if(uploadError)fail("CV upload failed: "+uploadError.message);
 const {data:record,error}=await supabase.from("career_documents").insert({
  professional_user_id:identity.userId,document_type:"cv",file_path:path,
  template_type:"uploaded",is_current:true,visibility:"owner_only"
 }).select("id").single();
 if(error||!record){
   await supabase.storage.from("career-documents").remove([path]);
   fail("CV could not be saved: "+(error?.message||"Unknown error"));
 }
 await supabase.from("career_documents").update({is_current:false})
    .eq("professional_user_id",identity.userId).eq("document_type","cv").neq("id",record.id);
 revalidatePath("/dashboard/career");
 redirect("/dashboard/career?message="+encodeURIComponent("CV saved privately to My Career."));
}

function value(data:FormData,key:string,max:number){
 return String(data.get(key)??"").trim().slice(0,max);
}
export async function saveCareerCvBuilderAction(formData:FormData){
 const identity=await getCurrentIdentity();
 if(!identity)redirect("/login?next=/dashboard/career/cv");
 if(!identity.roles.some(r=>["candidate","professional","veterinarian"].includes(r)))
   redirect("/dashboard?error=Career%20account%20required.");
 const name=value(formData,"full_name",120);
 if(name.length<2)redirect("/dashboard/career/cv?error=Enter%20your%20full%20name.");
 const supabase=await createClient();
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
 if(error)redirect("/dashboard/career/cv?error="+encodeURIComponent(error.message));
 revalidatePath("/dashboard/career");
 revalidatePath("/dashboard/career/cv");
 redirect("/dashboard/career/cv?message="+encodeURIComponent("CV builder saved. It is ready for job applications."));
}
