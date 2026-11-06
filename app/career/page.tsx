import Link from 'next/link';
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {requireCareerAccount} from '@/lib/career-access';
import {cvReady} from '@/lib/career-preferences';
import {matchesJobLocation} from '@/lib/job-location';
import type {PublicJob} from '@/lib/jobs';

export default async function CareerHome({searchParams}:{searchParams:Promise<{message?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [cv,prefs,profile,education,params,publicJobs]=await Promise.all([
  supabase.from('career_cv_profiles').select('full_name,headline,education,skills').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('candidate_preferences').select('email_alerts,updated_at,preferred_sectors,desired_roles,preferred_cities,preferred_job_types').eq('professional_user_id',identity.userId).maybeSingle(),
  supabase.from('professional_profiles').select('verification_status,image_url,headline,professional_type').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('professional_education').select('id').eq('professional_user_id',identity.userId).limit(1),
  searchParams,
  supabase.from('public_jobs').select('id,slug,title,description,sector,city,province,district,tehsil,employment_type,deadline,company_name').limit(100)
 ]);
 const ready=cvReady(cv.data),approved=profile.data?.verification_status==='approved';
 // The approved public directory is queried at render time. Dashboard matches do not
 // depend on email delivery, and no candidate data is published or modified.
 const interests=prefs.data;
 const sectors=(interests?.preferred_sectors??[] as string[]).map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
 const roles=(interests?.desired_roles??[] as string[]).map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
 const cities=(interests?.preferred_cities??[] as string[]).filter(Boolean);
 const jobTypes=(interests?.preferred_job_types??[] as string[]).map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const hasInterests=sectors.length>0||roles.length>0||cities.length>0||jobTypes.length>0;
 const matchingJobs=hasInterests?(publicJobs.data??[]).filter(job=>{
   if(job.deadline&&job.deadline<today)return false;
   if(sectors.length&&!sectors.includes((job.sector??'').trim().toLowerCase()))return false;
   if(roles.length&&!roles.some((role:string)=>(job.title+' '+(job.description??'')).toLowerCase().includes(role)))return false;
   if(jobTypes.length&&!jobTypes.includes((job.employment_type??'').trim().toLowerCase()))return false;
   if(cities.length&&!cities.some((city:string)=>matchesJobLocation(job as PublicJob,city)))return false;
   return true;
 }).slice(0,8):[];

 const name=identity.profile?.full_name||identity.email;
 const checks=[
  {label:'Basic identity',done:Boolean(identity.profile?.full_name)},
  {label:'Professional headline',done:Boolean(profile.data?.headline)},
  {label:'Education record',done:Boolean(education.data?.length||cv.data?.education?.trim())},
  {label:'Professional photograph',done:Boolean(profile.data?.image_url),optional:true},
  {label:'Career preferences',done:Boolean(prefs.data?.updated_at),optional:true}
 ];
 return <CareerWorkspaceFrame
  active="overview" name={name} headline={profile.data?.headline||profile.data?.professional_type}
  location={[identity.profile?.city,identity.profile?.province].filter(Boolean).join(', ')}
  photoUrl={profile.data?.image_url} verificationStatus={profile.data?.verification_status}
  approved={approved} cvStatus={ready?'saved':cv.data?'draft':'missing'}
  emailAlerts={Boolean(prefs.data?.email_alerts)}
  checklist={checks} title="Your career, in one place."
  description="A simple way to manage your professional profile, CV, work interests and opportunities.">
   {params.message&&<p role="status" className="form-message form-message-success">{params.message}</p>}
   {(cv.error||prefs.error||profile.error||education.error)&&<p role="alert" className="form-message form-message-error">Some saved details could not be loaded. Please retry; your records have not been removed.</p>}
   <section className="vcx-panel">
    <span className="vcx-eyebrow">QUICK START</span><h2>What would you like to do?</h2>
    <p>Choose one task. Only the information relevant to that task will open.</p>
    <div className="vcx-task-grid">
     <Link className="vcx-task" href="/career/cv"><span className="vcx-task-number">01</span><strong>Create or upload a CV</strong><small>Build your VetConnect CV from existing details or upload a previous document.</small></Link>
     <Link className="vcx-task" href="/career/preferences"><span className="vcx-task-number">02</span><strong>Find a job or internship</strong><small>Choose interests, sectors, cities and optional job alerts.</small></Link>
     <Link className="vcx-task" href="/career/connections"><span className="vcx-task-number">03</span><strong>Clinics & company links</strong><small>See your recorded workplace relationships without mixing identities.</small></Link>
    </div>
    <div className="vcx-callout"><div><strong>Need to update your education, qualifications or experience?</strong><p>Your professional information stays in one focused profile builder.</p></div>
     <Link className="vcx-button vcx-button-outline" href="/dashboard/professional">Open my profile</Link>
    </div>
   </section>
   <section className="vcx-panel" aria-labelledby="career-interest-matches-title">
    <span className="vcx-eyebrow">NEW OPPORTUNITIES</span>
    <h2 id="career-interest-matches-title">Jobs matching your interests</h2>
    <p>Approved public vacancies are checked when you open this page. Email alerts are optional and separate from these dashboard suggestions.</p>
    {publicJobs.error&&<p role="alert" className="form-message form-message-error">Matching jobs could not be loaded right now. Please visit the jobs directory.</p>}
    {!hasInterests?<p>Select your sectors, preferred roles or locations to see relevant jobs here. <Link href="/career/preferences">Choose job interests</Link>.</p>:
      matchingJobs.length===0?<p>No current vacancies match your saved filters. <Link href="/jobs">Browse all jobs</Link> or <Link href="/career/preferences">adjust your interests</Link>.</p>:
      <div className="company-grid">{matchingJobs.map(job=><article key={job.id}>
        <span className="module-tag">{job.sector||'Veterinary career'}</span>
        <h3>{job.title}</h3>
        <p>{[job.company_name,job.city,job.province].filter(Boolean).join(' · ')}</p>
        <p>{job.employment_type}{job.deadline?' · Deadline: '+job.deadline:''}</p>
        <Link className="button button-secondary" href={'/jobs/'+job.slug}>View job</Link>
      </article>)}</div>}
    <p><Link href="/career/preferences">Manage interests and email alert consent</Link></p>
   </section>
   <section className="vcx-panel">
    <span className="vcx-eyebrow">MY CAREER DOCUMENTS</span><h2>Continue your next task</h2>
    <p>CV details and cover letters remain private until you select them for a job application.</p>
    <div className="vcx-callout"><div><strong>{ready?'Your core CV details are saved':'Your CV can be completed at your own pace'}</strong><p>Experience is optional for students and new graduates.</p></div>
     <Link href="/career/cover-letter" className="vcx-button vcx-button-outline">Cover letter</Link></div>
    {approved?<p><Link href="/dashboard/career">View saved jobs and applications</Link></p>:<p><Link href="/register/complete">Check professional verification status</Link>. Email confirmation and professional approval are separate.</p>}
   </section>
  </CareerWorkspaceFrame>;
}
