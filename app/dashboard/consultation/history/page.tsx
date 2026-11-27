import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentIdentity} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {consultationTestingEnabled} from "@/lib/consultation/testing";
import Join from "./Join";
import Refresh from "./Refresh";
import {requestSession,respondToSession} from "./actions";

export default async function History({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const identity=await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/consultation/history");
  if(identity.profile?.account_status!=="active") redirect("/dashboard");
  const db=await createClient();
  const {data,error}=await db.from("consultation_history").select("id,requester,veterinarian,mode,state,requested_at,expires_at,duration_seconds")
    .or(`requester.eq.${identity.userId},veterinarian.eq.${identity.userId}`).order("requested_at",{ascending:false}).limit(100);
  const testing=consultationTestingEnabled();
  const bookings=testing ? await db.from("consultation_appointments").select("id,veterinarian,starts_at,ends_at").eq("requester_id",identity.userId).gt("ends_at",new Date().toISOString()).order("starts_at").limit(50) : null;
  const params=await searchParams;
  return <main className="section"><div className="shell"><Link href="/dashboard">My workspace</Link><h1>Consultation history</h1>
    {bookings?.data?.length ? <section><h2>Confirmed online appointments</h2>{bookings.data.map(a=><form action={requestSession} key={a.id}><p>{new Date(a.starts_at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})} PKT</p><input type="hidden" name="vet" value={a.veterinarian}/><input type="hidden" name="booking" value={a.id}/><button name="mode" value="audio">Request audio</button> <button name="mode" value="video">Request video</button></form>)}</section>:null}
    {testing&&<Refresh/>}{params.error&&<p role="alert">The request could not be completed. Check availability and your testing permissions.</p>}
    {error?<p>History is unavailable.</p>:!data?.length?<p>No consultation requests.</p>:data.map(row=>{
      const incoming=row.veterinarian===identity.userId;
      const state=row.state;
      return <article className="backend-form-card" key={row.id}><h2>{incoming?"Incoming":"Outgoing"} {row.mode} consultation</h2>
        <p>{new Date(row.requested_at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})} PKT · {state}{row.duration_seconds!=null && ` · ${Math.floor(row.duration_seconds/60)}m ${row.duration_seconds%60}s`}</p>
        {testing&&state==="requested"&&<form action={respondToSession}><input type="hidden" name="session" value={row.id}/>
          {incoming?<><button name="decision" value="accept">Accept</button> <button name="decision" value="decline">Decline</button></>:<button name="decision" value="cancel">Cancel request</button>}</form>}
        {testing&&state==="ready"&&<Join id={row.id}/>}</article>;
    })}</div></main>;
}
