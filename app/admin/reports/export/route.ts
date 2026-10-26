import type {NextRequest} from "next/server";
import {getCurrentIdentity} from "@/lib/auth";
import {getEffectiveAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const valid=(s:string|null)=>s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
function csvCell(value:unknown){
  let text=String(value??"").replaceAll("\r"," ").replaceAll("\n"," ");
  // Prevent spreadsheet formula evaluation of untrusted audit action text.
  if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export async function GET(request:NextRequest){
  const identity=await getCurrentIdentity();
  if(!identity)return new Response("Authentication required",{status:401,headers:{"Cache-Control":"no-store"}});
  if(!(await getEffectiveAdminPermission(identity,"audit.view")))return new Response("Forbidden",{status:403,headers:{"Cache-Control":"no-store"}});
  const from=valid(request.nextUrl.searchParams.get("from"));
  const to=valid(request.nextUrl.searchParams.get("to"));
  const supabase=await createClient();
  let query=supabase.from("audit_logs").select("id,created_at,action,entity_type,entity_id,actor_id").order("created_at",{ascending:false}).limit(2000);
  if(from)query=query.gte("created_at",from+"T00:00:00Z");
  if(to)query=query.lt("created_at",to+"T23:59:59.999Z");
  const {data,error}=await query;
  if(error)return new Response("Audit export unavailable",{status:503,headers:{"Cache-Control":"no-store"}});
  const header=["Timestamp UTC","Action","Entity type","Entity ID","Actor ID","Audit event ID"];
  const lines=[header.map(csvCell).join(",")];
  for(const row of data??[])lines.push([row.created_at,row.action,row.entity_type,row.entity_id,row.actor_id,row.id].map(csvCell).join(","));
  const filename="vetconnect-admin-audit-"+new Date().toISOString().slice(0,10)+".csv";
  return new Response("\uFEFF"+lines.join("\r\n"),{headers:{
    "Content-Type":"text/csv; charset=utf-8",
    "Content-Disposition":'attachment; filename="'+filename+'"',
    "Cache-Control":"private, no-store, max-age=0",
    "X-Content-Type-Options":"nosniff"
  }});
}
