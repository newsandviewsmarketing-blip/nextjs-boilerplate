import {NextResponse} from "next/server";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {guestAdminClient} from "@/lib/guest-job-applications";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await getCurrentIdentity())return NextResponse.json({error:"Authentication required"},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Not found"},{status:404});
 const s=await createClient();
 const {data:application,error}=await s.from("guest_job_applications")
  .select("cv_storage_path").eq("id",id).eq("status","submitted").maybeSingle();
 if(error||!application)return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const admin=guestAdminClient();
  const {data,error:signError}=await admin.storage.from("guest-job-cvs")
   .createSignedUrl(application.cv_storage_path,60,{download:true});
  if(signError||!data?.signedUrl)return NextResponse.json({error:"CV unavailable"},{status:404});
  const response=NextResponse.redirect(data.signedUrl,302);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
 }catch{return NextResponse.json({error:"CV service unavailable"},{status:503});}
}