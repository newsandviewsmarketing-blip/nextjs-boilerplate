import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return new NextResponse("Not found",{status:404});
 const supabase=await createClient();
 const {data:publicJob}=await supabase.from("public_jobs")
   .select("id,deadline").eq("id",id).maybeSingle();
 if(!publicJob || (publicJob.deadline && publicJob.deadline<new Date().toISOString().slice(0,10)))
   return new NextResponse("Not available",{status:404});
 const {data:job}=await supabase.from("jobs")
   .select("advert_image_path,advert_image_mime,verification_status,is_published")
   .eq("id",id).maybeSingle();
 if(!job?.advert_image_path||!job.is_published||job.verification_status!=="approved"||
    !["image/jpeg","image/png","image/webp"].includes(job.advert_image_mime??""))
   return new NextResponse("No approved image",{status:404});
 // Storage RLS only permits signing the exact image of an approved, current job.
 const {data,error}=await supabase.storage.from("record-documents")
   .createSignedUrl(job.advert_image_path,120);
 if(error||!data?.signedUrl)return new NextResponse("Unavailable",{status:404});
 const res=NextResponse.redirect(data.signedUrl,302);
 res.headers.set("Cache-Control","public,max-age=60");
 return res;
}