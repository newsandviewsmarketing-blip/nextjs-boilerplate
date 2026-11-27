"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {isAvailability} from "@/lib/consultation/status";

async function eligible() {
  const identity = await getCurrentIdentity();
  if (!identity || identity.profile?.account_status !== "active") return null;
  const db = await createClient();
  const {data,error} = await db.from("public_veterinarians").select("user_id").eq("user_id",identity.userId).maybeSingle();
  return !error && data ? {identity,db} : null;
}
export async function saveConsultation(form:FormData) {
  const ctx = await eligible();
  if (!ctx) redirect("/dashboard");
  const availability = form.get("availability");
  if (!isAvailability(availability)) redirect("/dashboard/consultation?error=Invalid%20availability");
  const fee = String(form.get("fee_pkr") ?? "").trim();
  if (fee && !/^\d{1,8}(?:\.\d{1,2})?$/.test(fee)) redirect("/dashboard/consultation?error=fee");
  const values={fee_pkr:fee || null,enabled:form.get("enabled")==="on",availability,audio:form.get("audio")==="on",video:form.get("video")==="on",appointment:form.get("appointment")==="on"};
  const {data,error}=await ctx.db.from("consultation_preferences").upsert({user_id:ctx.identity.userId,...values},{onConflict:"user_id"}).select("user_id").maybeSingle();
  if (error||!data) redirect("/dashboard/consultation?error=Settings%20could%20not%20be%20saved");
  revalidatePath("/vets"); revalidatePath(`/vets/${ctx.identity.userId}`);
  redirect("/dashboard/consultation?saved=1");
}
export async function consultationHeartbeat():Promise<boolean> {
  const ctx = await eligible();
  if (!ctx) return false;
  const {data,error} = await ctx.db.from("consultation_preferences").update({heartbeat_at:new Date().toISOString()}).eq("user_id",ctx.identity.userId).eq("enabled",true).in("availability",["available","busy"]).select("user_id").maybeSingle();
  return !error && Boolean(data);
}
