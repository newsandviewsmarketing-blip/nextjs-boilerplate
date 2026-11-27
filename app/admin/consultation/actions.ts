"use server";
import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {getConsultationProvider} from "@/lib/consultation/provider";
async function adminDb(){const identity=await getCurrentIdentity(); if(identity?.profile?.account_status!=="active"||!identity.roles.includes("super_admin")||!await getEffectiveAdminPermission(identity,"users.manage"))redirect("/dashboard");return createClient();}
export async function saveSettings(form:FormData){const db=await adminDb();const provider=form.get("provider");if(provider!=="daily"&&provider!=="none")redirect("/admin/consultation?error=1");const {data,error}=await db.from("consultation_settings").update({enabled:form.get("enabled")==="on",provider}).eq("id",true).select("id").maybeSingle();redirect(`/admin/consultation?${error||!data?"error":"saved"}=1`);}
export async function testProvider(){const db=await adminDb();const {data,error}=await db.from("consultation_settings").select("provider").eq("id",true).maybeSingle();const provider=!error&&data?getConsultationProvider(data.provider):null;const result=provider?await provider.testConnection():{ok:false,message:"Provider unavailable"};return result;}

export async function reconcileUsage(){
 await adminDb();
 const {consultationTestingEnabled}=await import("@/lib/consultation/testing");
 if(!consultationTestingEnabled())redirect("/admin/consultation?error=1");
 const provider=getConsultationProvider("daily");
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!provider||!secret)redirect("/admin/consultation?error=1");
 const {createClient:serviceClient}=await import("@supabase/supabase-js");
 const {requireSupabaseConfig}=await import("@/lib/supabase/config");
 const db=serviceClient(requireSupabaseConfig().url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from("consultation_sessions").select("id").is("measured_minutes",null).not("reservation_month","is",null).lt("expires_at",new Date(Date.now()-300000).toISOString()).order("expires_at",{ascending:false}).limit(20);
 if(error)redirect("/admin/consultation?error=1");
 let settled=0;
 for(const row of data??[]){
   const usage=await provider.readUsage(row.id).catch(()=>null);
   if(!usage)continue;
   const result=await db.rpc("consultation_settle",{session_id:row.id,minutes:usage.minutes,seconds:usage.seconds,ended:usage.endedAt});
   if(!result.error)settled++;
 }
 redirect("/admin/consultation?reconciled="+settled);
}
