import Link from 'next/link';
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {requireCareerAccount} from '@/lib/career-access';
import {cvReady} from '@/lib/career-preferences';

export default async function CareerHome({searchParams}:{searchParams:Promise<{message?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [cv,prefs,profile,education,params]=await Promise.all([
  supabase.from('career_cv_profiles').select('full_name,headline,education,skills').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('candidate_preferences').select('email_alerts,updated_at').eq('professional_user_id',identity.userId).maybeSingle(),
  supabase.from('professional_profiles').select('verification_status,image_url,headline,professional_type').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('professional_education').select('id').eq('professional_user_id',identity.userId).limit(1),
  searchParams
 ]);
 const ready=cvReady(cv.data),approved=profile.data?.verification_status==='approved';
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
     <Link className="vcx-button vcx-button-outline" href={approved?'/dashboard/professional':'/register/complete'}>{approved?'Open profile':'Review registration'}</Link>
    </div>
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
