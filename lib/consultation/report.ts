import "server-only";
import {createClient} from "@/lib/supabase/server";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermission} from "@/lib/admin";
export async function consultationReport(from?:string,to?:string) {
  const identity=await getCurrentIdentity();
  if(identity?.profile?.account_status!=="active" || !identity.roles.includes("super_admin") || !await getEffectiveAdminPermission(identity,"users.manage")) return {status:403 as const};
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Karachi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const first=from || today.slice(0,7)+"-01",last=to || today;
  const isDate=(v:string)=>/^\d{4}-\d\d-\d\d$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v);
  if(!isDate(first)||!isDate(last)||first>last||Date.parse(last)-Date.parse(first)>92*86400000) return {status:400 as const};
  const db=await createClient();
  const {data,error}=await db.rpc("consultation_report",{first_day:first,last_day:last});
  if(error) return {status:503 as const};
  return {status:200 as const,first,last,rows:(data??[]) as {day:string,mode:string,outcome:string,sessions:number}[]};
}
