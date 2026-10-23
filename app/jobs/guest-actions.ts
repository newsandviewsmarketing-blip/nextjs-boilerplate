"use server";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {guestAdminClient,guestApplicationReady,inspectGuestCv,notifyEmployerApplication,sendApplicationEmail} from "@/lib/guest-job-applications";

function fail(slug:string,reason:string):never{
 redirect("/jobs/"+encodeURIComponent(slug)+"?error="+encodeURIComponent(reason)+"#apply-job");
}
const hex=(value:string)=>createHash("sha256").update(value).digest("hex");
export async function submitGuestJobApplicationAction(data:FormData){
 const slug=String(data.get("slug")??"").slice(0,200);
 if(!/^[a-zA-Z0-9-]+$/.test(slug))redirect("/jobs");
 if(!guestApplicationReady())fail(slug,"Guest applications are temporarily unavailable. Please sign in to apply.");
 const name=String(data.get("applicant_name")??"").trim().slice(0,120);
 const email=String(data.get("applicant_email")??"").trim().toLowerCase().slice(0,254);
 const phone=String(data.get("applicant_phone")??"").trim().slice(0,40);
 const note=String(data.get("cover_note")??"").trim().slice(0,2000);
 const jobId=String(data.get("job_id")??"");
 const consent=String(data.get("guest_cv_consent")??"")==="yes";
 const captcha=String(data.get("cf-turnstile-response")??"").slice(0,2048);
 const file=data.get("guest_cv_file");
 if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!consent)
   fail(slug,"Enter your name, valid email and consent before submitting.");
 if(!(file instanceof File)||!file.size)fail(slug,"Select a CV file to apply without login.");
 if(!captcha)fail(slug,"Complete the security verification.");
 let inspected:Awaited<ReturnType<typeof inspectGuestCv>>;
 try{inspected=await inspectGuestCv(file);}
 catch(e){fail(slug,e instanceof Error?e.message:"Invalid CV file.");}
 const verification=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
  method:"POST",body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY!,response:captcha}),
  cache:"no-store",signal:AbortSignal.timeout(10000)
 }).then(x=>x.json()).catch(()=>({success:false}));
 if(!verification.success)fail(slug,"Security verification failed. Please try again.");
 const admin=guestAdminClient();
 const {data:job}=await admin.from("jobs")
  .select("id,slug,title,verification_status,is_published,deadline")
  .eq("id",jobId).eq("slug",slug).maybeSingle();
 const today=new Date().toISOString().slice(0,10);
 if(!job||!job.is_published||job.verification_status!=="approved"||
   (job.deadline&&job.deadline<today))fail(slug,"This vacancy is not accepting applications.");
 const requestHeaders=await headers();
 const ip=requestHeaders.get("x-real-ip")||requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||"unavailable";
 const ipHash=hex(process.env.TURNSTILE_SECRET_KEY+":"+ip);
 const now=Date.now();
 const oneHour=new Date(now-3600000).toISOString();
 const oneDay=new Date(now-86400000).toISOString();
 const [ipCount,emailCount,existing]=await Promise.all([
  admin.from("guest_job_applications").select("id",{head:true,count:"exact"}).eq("ip_hash",ipHash).gte("created_at",oneHour),
  admin.from("guest_job_applications").select("id",{head:true,count:"exact"}).eq("applicant_email",email).gte("created_at",oneDay),
  admin.from("guest_job_applications").select("id").eq("job_id",jobId).eq("applicant_email",email)
   .eq("status","submitted").limit(1)
 ]);
 if((ipCount.count??0)>=4||(emailCount.count??0)>=5)
   fail(slug,"Too many submissions. Please try again later.");
 if(existing.data?.length)fail(slug,"This email has already submitted an application for this job.");
 const id=randomUUID(),token=randomBytes(32).toString("hex");
 const cvPath=id+"/"+randomUUID()+"."+inspected.ext;
 const {error:uploaded}=await admin.storage.from("guest-job-cvs").upload(cvPath,Buffer.from(inspected.bytes),{
  contentType:inspected.mime,upsert:false,cacheControl:"0"
 });
 if(uploaded)fail(slug,"The CV could not be uploaded. Please try again.");
 const {error:saved}=await admin.from("guest_job_applications").insert({
  id,job_id:jobId,applicant_name:name,applicant_email:email,applicant_phone:phone||null,
  cover_note:note||null,cv_storage_path:cvPath,cv_mime:inspected.mime,
  cv_original_filename:file.name.slice(0,120),
  email_token_hash:hex(token),token_expires_at:new Date(now+30*60000).toISOString(),
  ip_hash:ipHash,consent_at:new Date().toISOString()
 });
 if(saved){await admin.storage.from("guest-job-cvs").remove([cvPath]);fail(slug,"Could not save the application.");}
 const verifyUrl=new URL("/jobs/verify-guest",process.env.VETCONNECT_APP_URL!);
 verifyUrl.searchParams.set("id",id);
 verifyUrl.searchParams.set("token",token);
 const mailed=await sendApplicationEmail(email,
  "Verify your VetConnect job application",
  "Hello "+name+",\nVerify your application for "+job.title+" by opening this link:\n"+verifyUrl+
  "\nThis link expires in 30 minutes. If you did not apply, ignore the email.\nYour CV will be shared with the authorized recruiter only after verification."
 );
 if(!mailed){
  await admin.from("guest_job_applications").delete().eq("id",id);
  await admin.storage.from("guest-job-cvs").remove([cvPath]);
  fail(slug,"Verification email could not be sent. No application was submitted.");
 }
 redirect("/jobs/"+encodeURIComponent(slug)+"?message="+encodeURIComponent("Check your email to verify your application. Your CV is private until verification.")+"#apply-job");
}

export async function confirmGuestApplicationAction(data:FormData){
 const id=String(data.get("id")??"");
 const token=String(data.get("token")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[0-9a-f]{64}$/.test(token)||!guestApplicationReady())
  redirect("/jobs/verify-guest?status=invalid");
 const admin=guestAdminClient();
 const {data:pending}=await admin.from("guest_job_applications")
  .select("id,job_id,token_expires_at")
  .eq("id",id).eq("email_token_hash",hex(token)).eq("status","pending_email").maybeSingle();
 if(!pending||new Date(pending.token_expires_at).getTime()<Date.now())
  redirect("/jobs/verify-guest?status=expired");
 const {data:job}=await admin.from("jobs").select("slug,verification_status,is_published,deadline")
  .eq("id",pending.job_id).maybeSingle();
 if(!job||job.verification_status!=="approved"||!job.is_published||
  (job.deadline&&job.deadline<new Date().toISOString().slice(0,10)))
  redirect("/jobs/verify-guest?status=closed");
 const {data:verified,error}=await admin.from("guest_job_applications")
  .update({status:"submitted",email_verified_at:new Date().toISOString(),
    email_token_hash:null,updated_at:new Date().toISOString()})
  .eq("id",id).eq("email_token_hash",hex(token)).eq("status","pending_email")
  .select("id").maybeSingle();
 if(error||!verified)redirect("/jobs/verify-guest?status=invalid");
 await notifyEmployerApplication(pending.job_id,id);
 redirect("/jobs/"+encodeURIComponent(job.slug)+"?message="+encodeURIComponent("Your email is verified and your CV application has been submitted.")+"#apply-job");
}
