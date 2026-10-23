import "server-only";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";

const MAX_CV_BYTES=5*1024*1024;
export const GUEST_MAX_CV_BYTES=MAX_CV_BYTES;
export const GUEST_CV_ACCEPT=".pdf,.doc,.docx,.jpg,.jpeg,.png";

export function guestApplicationReady(){
 return Boolean(
   process.env.SUPABASE_SERVICE_ROLE_KEY &&
   process.env.NEXT_PUBLIC_SUPABASE_URL &&
   process.env.RESEND_API_KEY &&
   process.env.VETCONNECT_NOTIFICATION_FROM &&
   process.env.TURNSTILE_SECRET_KEY &&
   process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
   process.env.VETCONNECT_APP_URL?.startsWith("https://") &&
   process.env.VETCONNECT_GUEST_APPLICATIONS_ENABLED==="true"
 );
}

export function guestAdminClient(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error("Guest storage is not configured");
 return createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {auth:{persistSession:false,autoRefreshToken:false}}
 );
}

const knownTypes:Record<string,{mime:string;magic:(data:Uint8Array)=>boolean}>={
 pdf:{mime:"application/pdf",magic:b=>b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45},
 jpg:{mime:"image/jpeg",magic:b=>b[0]===255&&b[1]===216&&b[2]===255},
 jpeg:{mime:"image/jpeg",magic:b=>b[0]===255&&b[1]===216&&b[2]===255},
 png:{mime:"image/png",magic:b=>[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)},
 doc:{mime:"application/msword",magic:b=>[208,207,17,224,161,177,26,225].every((x,i)=>b[i]===x)},
 docx:{mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",magic:b=>b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4},
};
export async function inspectGuestCv(file:File){
 if(file.size<100||file.size>MAX_CV_BYTES)throw Error("Upload a CV between 100 bytes and 5 MB.");
 const ext=file.name.toLowerCase().split(".").pop()??"";
 const type=knownTypes[ext];
 if(!type)throw Error("Only PDF, Word DOC/DOCX, JPG or PNG CV files are allowed.");
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!type.magic(bytes))throw Error("The file contents do not match its extension.");
 if(file.type && file.type!=="application/octet-stream" && file.type!==type.mime)
  throw Error("The CV file format is not valid.");
 return {bytes,mime:type.mime,ext};
}
export async function sendApplicationEmail(to:string,subject:string,message:string){
 if(!process.env.RESEND_API_KEY||!process.env.VETCONNECT_NOTIFICATION_FROM)return false;
 try{
   const r=await fetch("https://api.resend.com/emails",{
     method:"POST",headers:{
       Authorization:"Bearer "+process.env.RESEND_API_KEY,
       "Content-Type":"application/json"
     },body:JSON.stringify({
       from:process.env.VETCONNECT_NOTIFICATION_FROM,
       to:[to],subject,text:message
     }),signal:AbortSignal.timeout(10000),cache:"no-store"
   });
   return r.ok;
 }catch{return false;}
}
/** A CV is never an email attachment or an unauthenticated public URL. */
export async function notifyEmployerApplication(jobId:string,referenceId:string){
 if(!process.env.RESEND_API_KEY||!process.env.VETCONNECT_NOTIFICATION_FROM)return false;
 const s=guestAdminClient();
 const {data:job}=await s.from("jobs").select("id,title,company_id").eq("id",jobId).maybeSingle();
 if(!job)return false;
 const {data:company}=await s.from("companies")
  .select("public_email,verification_status,is_published")
  .eq("id",job.company_id).maybeSingle();
 if(!company?.public_email||company.verification_status!=="approved"||!company.is_published)return false;
 const url="https://vetconnect.com.pk/dashboard/company";
 return sendApplicationEmail(
  company.public_email,
  "VetConnect: new application for "+job.title,
  "A candidate submitted an application through VetConnect.\nJob: "+job.title+
  "\nReference: "+referenceId+"\nSign in to view the CV securely: "+url+
  "\nThe CV is not attached to this email. Access is restricted to authorized recruiters."
 );
}
