"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {jobAdvertFile,saveJobAdvertImage} from "@/lib/job-advert-image";
const back=(message:string,kind:"error"|"message"="message")=>"/admin/jobs-media?"+kind+"="+encodeURIComponent(message);
export async function uploadExistingJobImageAction(formData:FormData){
 const identity=await requireAdminPermission("jobs.manage","/admin/jobs-media");
 const id=String(formData.get("job_id")??"");
 const supabase=await createClient();
 const {data:job}=await supabase.from("jobs").select("id").eq("id",id).maybeSingle();
 if(!job)redirect(back("Job record not found.","error"));
 let image:File|null=null;
 try{image=jobAdvertFile(formData);}
 catch(e){redirect(back(e instanceof Error?e.message:"Invalid image","error"));}
 if(!image)redirect(back("Select an original job advertisement image.","error"));
 try{await saveJobAdvertImage(supabase,id,identity.userId,image);}
 catch(e){redirect(back(e instanceof Error?e.message:"Image upload failed","error"));}
 revalidatePath("/admin/jobs-media");
 revalidatePath("/jobs");
 redirect(back("Original job advertisement image saved to this job."));
}
export async function linkExistingJobDocumentAction(formData:FormData){
 await requireAdminPermission("jobs.manage","/admin/jobs-media");
 const jobId=String(formData.get("job_id")??"");
 const documentId=String(formData.get("document_id")??"");
 const supabase=await createClient();
 const [{data:job},{data:doc}]=await Promise.all([
  supabase.from("jobs").select("id").eq("id",jobId).maybeSingle(),
  supabase.from("admin_record_documents")
   .select("id,entity_id,document_kind,mime_type,storage_path")
   .eq("id",documentId).eq("entity_type","job").eq("entity_id",jobId).maybeSingle()
 ]);
 if(!job||!doc||!["image/jpeg","image/png","image/webp"].includes(doc.mime_type??""))
  redirect(back("Only an image uploaded for this exact job can be approved.","error"));
 const {error}=await supabase.from("jobs").update({
   advert_image_path:doc.storage_path,advert_image_mime:doc.mime_type
 }).eq("id",jobId);
 if(error)redirect(back(error.message,"error"));
 revalidatePath("/admin/jobs-media");
 revalidatePath("/jobs");
 redirect(back("Existing image linked to this job. It becomes public only while the job is approved and open."));
}
