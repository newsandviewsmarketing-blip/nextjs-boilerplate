"use server";
import {redirect} from "next/navigation";
import {createClient as privilegedClient} from "@supabase/supabase-js";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {requireSupabaseConfig} from "@/lib/supabase/config";
import {getConsultationProvider} from "@/lib/consultation/provider";
import {consultationTestingEnabled} from "@/lib/consultation/testing";

const history = "/dashboard/consultation/history";
async function participant() {
  const user = await getCurrentIdentity();
  if (!user) redirect("/login?next=/dashboard/consultation/history");
  if (!consultationTestingEnabled() || user.profile?.account_status !== "active") redirect("/dashboard");
  return {user,db:await createClient()};
}
export async function requestSession(form: FormData) {
  const {db} = await participant();
  const {error} = await db.rpc("consultation_request",{vet:form.get("vet"), requested_mode:form.get("mode"),booking:form.get("booking")||null});
  redirect(error ? history+"?error=1" : history);
}
export async function respondToSession(form: FormData) {
  const {db} = await participant();
  const id = String(form.get("session"));
  const decision = String(form.get("decision"));
  const provider = getConsultationProvider("daily");
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (decision === "accept" && (!provider || !secret)) redirect(history+"?error=1");
  const {error} = await db.rpc("consultation_respond",{session_id:id,decision});
  if (error) redirect(history+"?error=1");
  if (decision === "accept" && provider && secret) {
    const admin = privilegedClient(requireSupabaseConfig().url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data} = await db.from("consultation_sessions").select("expires_at,mode").eq("id",id).eq("state","provisioning").maybeSingle();
    if (!data) redirect(history+"?error=1");
    try {
      await provider.createRoom(id,Math.floor(Date.parse(data.expires_at)/1000),data.mode==="audio");
      const ready = await admin.from("consultation_sessions").update({state:"ready"}).eq("id",id).eq("state","provisioning").select("id").single();
      if (ready.error) throw Error("Session unavailable");
    } catch {
      await admin.from("consultation_sessions").update({state:"failed",ended_at:new Date().toISOString()}).eq("id",id).eq("state","provisioning");
      await provider.removeRoom(id).catch(()=>undefined);
      redirect(history+"?error=1");
    }
  }
  redirect(history);
}
export async function joinSession(id:string) {
  const {user,db}=await participant();
  const {data,error}=await db.rpc("consultation_joinable",{session_id:id}).maybeSingle<{id:string,mode:string,expires_at:string}>();
  const provider=getConsultationProvider("daily");
  if (error || !data || !provider) return null;
  try {
    const token=await provider.issueToken(data.id,user.userId,Math.floor(Date.parse(data.expires_at)/1000),data.mode==="audio");
    return {url:`https://${process.env.DAILY_DOMAIN?.trim().toLowerCase()}/vc-${data.id}`,token};
  } catch {return null;}
}
