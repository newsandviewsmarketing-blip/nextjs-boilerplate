import {matchesJobLocation} from './job-location';
import type {PublicJob} from './jobs';
import type {SupabaseClient} from '@supabase/supabase-js';
import {cvReady,matchCareerJob,type CareerPreferences,type AlertJob} from './career-preferences';
type QueueRow={id:string;user_id:string;job_id:string|null;kind:string;event_key:string;claim_token:string;attempts:number};
export type CareerMail={to:string;subject:string;text:string;idempotencyKey:string};
export type MailResult={accepted:boolean;providerId?:string};
export async function processCareerAlerts(db:SupabaseClient,send:(mail:CareerMail)=>Promise<MailResult>,config:{baseUrl:string;adminEmail:string}){
 const {data:rows,error}=await db.rpc('claim_career_alerts',{p_limit:10});
 if(error)throw new Error('Career queue unavailable');
 const result={accepted:0,skipped:0,retried:0};
 for(const row of (rows??[]) as QueueRow[]){
  // Always reload consent, identity and job state immediately before sending.
  const finish=async(values:Record<string,unknown>)=>{
   const {error:writeError}=await db.from('career_alert_outbox').update({...values,locked_until:null,claim_token:null}).eq('id',row.id).eq('claim_token',row.claim_token);
   if(writeError)throw new Error('Career queue acknowledgement failed');
  };
  try{
   const [account,profile,cv]=await Promise.all([
    db.auth.admin.getUserById(row.user_id),
    db.from('profiles').select('account_status,full_name').eq('id',row.user_id).maybeSingle(),
    db.from('career_cv_profiles').select('full_name,headline,education,skills').eq('user_id',row.user_id).maybeSingle(),
   ]);
   if(account.error||profile.error||cv.error)throw new Error('Career account lookup unavailable');
   const user=account.data.user;
   if(!user?.email_confirmed_at||!user.email||profile.data?.account_status!=='active'||!cvReady(cv.data)){
    await finish({status:'skipped',last_error:'Account or CV is not eligible',...(row.attempts===1?{attempts:0,first_attempt_at:null}:{})});result.skipped++;continue;
   }
   let mail:CareerMail;
   if(row.kind==='job_match'){
    const [pref,job,professional,coverage,areas]=await Promise.all([
     db.from('candidate_preferences').select('*').eq('professional_user_id',row.user_id).maybeSingle(),
     db.from('jobs').select('id,slug,title,description,sector,city,province,employment_type,verification_status,is_published,deadline,country,work_mode,salary_min,salary_max,salary_currency,salary_period,minimum_experience').eq('id',row.job_id).maybeSingle(),
     db.from('professional_profiles').select('verification_status').eq('user_id',row.user_id).maybeSingle(),
     db.from('job_coverage').select('job_id,scope,province,display_text').eq('job_id',row.job_id).maybeSingle(),
     db.from('job_coverage_areas').select('job_id,label,city,district,province').eq('job_id',row.job_id),
    ]);
    if(pref.error||job.error||professional.error||coverage.error||areas.error)throw new Error('Matching information unavailable');
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const match=pref.data?.email_alerts&&professional.data?.verification_status==='approved'&&job.data?
     matchCareerJob({...job.data,location_matches:(pref.data.preferred_cities??[]).some((city:string)=>matchesJobLocation({...job.data,coverage:coverage.data,coverage_areas:areas.data} as PublicJob,city))} as AlertJob,pref.data as CareerPreferences,cv.data??{},today):null;
    if(!match||!job.data){await finish({status:'skipped',last_error:'No longer matches or alerts disabled',...(row.attempts===1?{attempts:0,first_attempt_at:null}:{})});result.skipped++;continue;}
    const j=job.data;
    const {error:matchError}=await db.from('job_matches').upsert({job_id:j.id,candidate_user_id:row.user_id,match_score:match.score,explanation:match.explanation,calculated_at:new Date().toISOString()},{onConflict:'job_id,candidate_user_id'});
    if(matchError)throw new Error('Could not save match');
    const pay=j.salary_min!=null||j.salary_max!=null?`${j.salary_currency} ${j.salary_min??'Not specified'} to ${j.salary_max??'Not specified'} per ${j.salary_period}`:'Salary not disclosed';
    mail={to:user.email,subject:'VetConnect job match: '+j.title,idempotencyKey:row.event_key,text:[
     `Hello ${cv.data?.full_name||profile.data?.full_name||'Candidate'},`,
     'This approved job matches your saved search preferences:',j.title,
     [j.sector,j.city,j.country,j.work_mode,j.employment_type].filter(Boolean).join(' | '),pay,
     'Deadline: '+(j.deadline||'Not specified'),match.explanation,
     'View requirements and apply: '+config.baseUrl+'/jobs/'+encodeURIComponent(j.slug),
     'This is a suggested opportunity, not a job offer. Review qualifications, experience, work permission and pay with the employer.',
     'Change preferences or stop job emails: '+config.baseUrl+'/career/preferences',
    ].join('\n\n')};
   }else{
    const admin=row.kind==='admin_candidate';
    mail={to:admin?config.adminEmail:user.email,idempotencyKey:row.event_key,
     subject:admin?'VetConnect: a job seeker has completed core CV details':'Your VetConnect CV details are saved',
     text:admin?`A verified-email job seeker, ${cv.data?.full_name}, has saved core CV details. Professional review is a separate step. Review securely: ${config.baseUrl}/admin/users/${row.user_id}. CV and identity files are not attached.`:
      `Hello ${cv.data?.full_name}, your core CV details are saved privately. Add your photograph and choose job interests: ${config.baseUrl}/career. Job alerts need your consent and an approved professional profile. Email confirmation does not mean professional approval.`,
    };
   }
   const sent=await send(mail);
   if(!sent.accepted)throw new Error('Email provider did not accept request');
   await finish({status:'accepted',accepted_at:new Date().toISOString(),provider_id:sent.providerId??null,last_error:null});result.accepted++;
  }catch{
   await finish({status:row.attempts>=8?'failed':'pending',available_at:new Date(Date.now()+Math.min(6*3600000,60000*2**row.attempts)).toISOString(),last_error:'Delivery or lookup failed; retry scheduled'});
   result.retried++;
  }
 }
 return result;
}
