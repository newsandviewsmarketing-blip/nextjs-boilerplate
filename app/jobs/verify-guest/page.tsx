import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import {confirmGuestApplicationAction} from "@/app/jobs/guest-actions";
export const dynamic="force-dynamic";
export default async function VerifyGuest({searchParams}:{
 searchParams:Promise<{id?:string;token?:string;status?:string}>
}){
 const p=await searchParams;
 const valid=Boolean(p.id&&p.token&&/^[0-9a-f-]{36}$/i.test(p.id)&&/^[0-9a-f]{64}$/.test(p.token));
 return <main><SiteHeader/><section className="section"><div className="shell">
  <div className="backend-form-card" style={{maxWidth:560,margin:"40px auto"}}>
   <h1>Verify your job application</h1>
   {valid?<><p>Confirm your email address to release your CV to the authorized hiring team. This link expires after 30 minutes.</p>
    <form action={confirmGuestApplicationAction}>
     <input type="hidden" name="id" value={p.id}/><input type="hidden" name="token" value={p.token}/>
     <button type="submit" className="button button-primary">Confirm my application</button>
    </form></>:<p>{p.status==="expired"?"This verification link has expired.":p.status==="closed"?"This vacancy is no longer accepting applications.":"This link is invalid or has already been used."}</p>}
   <p><Link href="/jobs">View current jobs</Link></p>
  </div>
 </div></section><SiteFooter/></main>;
}
