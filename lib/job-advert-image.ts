import {randomUUID} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";

const mimeExtensions:Record<string,string>={
 "image/jpeg":"jpg","image/png":"png","image/webp":"webp"
};
export function jobAdvertFile(formData:FormData): File|null {
 const value=formData.get("job_ad_image");
 if(!(value instanceof File)||value.size===0)return null;
 if(value.size>5*1024*1024 || !mimeExtensions[value.type]){
  throw new Error("Job advertisement must be JPG, PNG or WebP and no larger than 5 MB.");
 }
 return value;
}
/** Store privately: no image is public until the approved job references it. */
export async function saveJobAdvertImage(
 supabase:SupabaseClient,jobId:string,ownerUserId:string,file:File|null
){
 if(!file)return;
 const path=ownerUserId+"/job-ad/"+jobId+"/"+randomUUID()+"."+mimeExtensions[file.type];
 const {error:uploaded}=await supabase.storage.from("record-documents").upload(path,file,{
  upsert:false,contentType:file.type
 });
 if(uploaded)throw uploaded;
 const {error:saved}=await supabase.from("jobs").update({
  advert_image_path:path,advert_image_mime:file.type
 }).eq("id",jobId);
 if(saved){
  await supabase.storage.from("record-documents").remove([path]);
  throw saved;
 }
}
