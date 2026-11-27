import "server-only";
import {roomPolicy} from './room-policy';
// Test rooms require both deployment gating and the database enrollment checks.
function config(){
 if(process.env.CONSULTATION_CALLS_TEST_MODE !== 'true' || process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') throw new Error('Consultation adapter disabled');
 const domain=process.env.DAILY_DOMAIN?.trim().toLowerCase();const key=process.env.DAILY_API_KEY;
 if(!key||!domain||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.daily\.co$/.test(domain))throw new Error('Provider unavailable');
 return {domain,key};
}
async function request(path:string,method:'POST'|'GET'|'DELETE',body?:unknown){
 const {key}=config();const r=await fetch(`https://api.daily.co/v1/${path}`,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error('Provider request failed');
 return method==='DELETE'?null:await r.json();
}
export async function createPrivateTestRoom(sessionId:string,expiry:number,audioOnly:boolean){
 const {domain}=config();const policy=roomPolicy(sessionId,Math.floor(Date.now()/1000),expiry,audioOnly);
 const room=await request('rooms','POST',policy);
 if(room?.name!==policy.name||room?.url!==`https://${domain}/${policy.name}`||room?.privacy!=='private') throw new Error('Provider room verification failed');
 return {name:policy.name,url:room.url as string};
}
export async function mintTestToken(sessionId:string,userId:string,expiry:number,audioOnly:boolean){
 const policy=roomPolicy(sessionId,Math.floor(Date.now()/1000),expiry,audioOnly);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))throw new Error('Invalid participant');
 const result=await request('meeting-tokens','POST',{properties:{room_name:policy.name,user_id:userId,exp:expiry,eject_at_token_exp:true,is_owner:false,enable_screenshare:false,enable_recording:null,permissions:{canSend:audioOnly?["audio"]:["audio","video"],canAdmin:false},start_with_video_off:audioOnly}});
 if(typeof result?.token!=='string'||!result.token)throw new Error('Provider token unavailable');
 return result.token as string;
}
export async function deleteTestRoom(sessionId:string){
 const now=Math.floor(Date.now()/1000);const {name}=roomPolicy(sessionId,now,now+1,false);await request(`rooms/${name}`,'DELETE');
}

// Capture complete, closed room records only. Missing or truncated data leaves the reservation intact.
export async function readDailyUsage(sessionId:string) {
 const now=Math.floor(Date.now()/1000);
 const {name}=roomPolicy(sessionId,now,now+1,false);
 const response=await request(`meetings?room=${name}&limit=100`,"GET");
 if(!Array.isArray(response?.data)||!response.data.length||response.data.length!==response.total_count) return null;
 let seconds=0,minutes=0,ended=0;
 const ids=new Set<string>();
 for(const meeting of response.data) {
   if(meeting.room!==name||meeting.ongoing!==false||typeof meeting.id!=="string"||ids.has(meeting.id)||
      !Number.isSafeInteger(meeting.duration)||meeting.duration<0||!Number.isSafeInteger(meeting.start_time)) return null;
   ids.add(meeting.id);
   const records=await request(`meetings/${encodeURIComponent(meeting.id)}/participants?limit=100`,"GET");
   if(!Array.isArray(records?.data)||!records.data.length||records.data.length>=100) return null;
   for(const participant of records.data) {
     if(!Number.isSafeInteger(participant.duration)||participant.duration<0) return null;
     minutes+=Math.ceil(participant.duration/60);
   }
   seconds+=meeting.duration;
   ended=Math.max(ended,meeting.start_time+meeting.duration);
 }
 return {seconds,minutes,endedAt:new Date(ended*1000).toISOString()};
}
