import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {processCareerAlerts} from '@/lib/career-alert-worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const actual=request.headers.get('authorization')??'';
 const expected='Bearer '+secret;
 if(!secret||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
 if(process.env.VERCEL_ENV&&process.env.VERCEL_ENV!=='production')return Response.json({error:'Email delivery is disabled outside production'},{status:409});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const apiKey=process.env.RESEND_API_KEY,from=process.env.VETCONNECT_NOTIFICATION_FROM,admin=process.env.VETCONNECT_ADMIN_EMAIL;
 const base=process.env.VETCONNECT_APP_URL||process.env.NEXT_PUBLIC_SITE_URL;
 if(!url||!key||!apiKey||!from||!admin||!base)return Response.json({error:'Career email service is not configured'},{status:503});
 let baseUrl:string;
 try{const parsed=new URL(base);if(parsed.protocol!=='https:')throw new Error();baseUrl=parsed.origin;}catch{return Response.json({error:'Configure the HTTPS application URL'},{status:503});}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const counts=await processCareerAlerts(db,async(mail)=>{
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':mail.idempotencyKey},
    body:JSON.stringify({from,to:[mail.to],subject:mail.subject,text:mail.text}),signal:AbortSignal.timeout(10000),
   });
   if(!response.ok)return {accepted:false};
   const data=await response.json();return {accepted:true,providerId:data.id};
  },{baseUrl,adminEmail:admin});
  return Response.json(counts,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Career queue processing failed'},{status:503});}
}
