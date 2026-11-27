import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {saveConsultation} from "./actions";
import Presence from "./Presence";
export const dynamic="force-dynamic";
export default async function ConsultationPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
  const identity=await getCurrentIdentity(); if(!identity)redirect("/login?next=/dashboard/consultation");
  if(identity.profile?.account_status!=="active")redirect("/dashboard");
  const db=await createClient(); const {data:vet,error:vetError}=await db.from("public_veterinarians").select("user_id").eq("user_id",identity.userId).maybeSingle();
  const params=await searchParams;
  const {data:p,error}=vet&&!vetError?await db.from("consultation_preferences").select("enabled,availability,audio,video,appointment,fee_pkr").eq("user_id",identity.userId).maybeSingle():{data:null,error:null};
  return <main className="section"><div className="shell"><Link href="/dashboard">Back to workspace</Link><h1>Online consultation</h1>
  {(!vet||vetError)?<p>Consultation settings require an active, approved and PVMC-verified public veterinarian profile.</p>:error?<p>Consultation settings are unavailable. Contact administration.</p>:<section className="backend-form-card">
  {params.saved==="1"&&<p role="status">Settings saved.</p>}{params.error&&<p role="alert">Settings could not be saved. Please retry.</p>}
  <form action={saveConsultation} className="backend-form"><label><input type="checkbox" name="enabled" defaultChecked={p?.enabled??false}/> Enable consultation profile</label>
  <label>Availability<select name="availability" defaultValue={p?.availability??"offline"}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option><option value="appointment">By appointment only</option></select></label>
  <label><input type="checkbox" name="audio" defaultChecked={p?.audio??false}/> Audio preference</label><label><input type="checkbox" name="video" defaultChecked={p?.video??false}/> Video preference</label><label><input type="checkbox" name="appointment" defaultChecked={p?.appointment??false}/> Appointment preference</label><label>Consultation fee (PKR)<input name="fee_pkr" type="number" min="0" max="99999999.99" step="0.01" defaultValue={p?.fee_pkr??""}/></label><button className="button button-primary" type="submit">Save preferences</button></form>
  <Presence active={Boolean(p?.enabled&&["available","busy"].includes(p.availability))}/><p>Audio and video calls are not enabled. Platform publication requires administrator activation.</p><Link href="/dashboard/clinics">Existing clinic schedules and appointments</Link></section>}</div></main>;
}
