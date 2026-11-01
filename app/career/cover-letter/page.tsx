import Link from 'next/link';
import CareerWorkspaceFrame from '@/app/components/CareerWorkspaceFrame';
import {requireCareerAccount} from '@/lib/career-access';
import LetterEditor from './LetterEditor';
export default async function CoverLetter({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [letter,profile,params]=await Promise.all([supabase.from('career_cover_letters').select('job_title,company_name,body_text').eq('user_id',identity.userId).maybeSingle(),supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle(),searchParams]);
 return <CareerWorkspaceFrame active="letter" name={identity.profile?.full_name||identity.email} verificationStatus={profile.data?.verification_status} approved={profile.data?.verification_status==='approved'} title="A cover letter when you need one." description="Save a private editable letter, then review it before sharing with a recruiter."><section className="backend-form-card vcx-embedded-card">
   <span className="vcx-eyebrow">OPTIONAL APPLICATION LETTER</span>
   <h2>Prepare your application letter</h2>
   <p>Your letter is only shared when you explicitly select it for a job application.</p>
   {(params.error||letter.error)&&<p role="alert" className="form-message form-message-error">{params.error||'Your saved letter could not be loaded. Please retry.'}</p>}{params.message&&<p role="status" className="form-message form-message-success">{params.message}</p>}<LetterEditor name={identity.profile?.full_name||''} initial={letter.data} disabled={Boolean(letter.error)}/><div className="cv-next-actions"><Link href="/career/cv">My CV</Link><Link href="/career/preferences">Job & internship interests</Link><Link href="/career">My profile home</Link></div></section></CareerWorkspaceFrame>;
}
