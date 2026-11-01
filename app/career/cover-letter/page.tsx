import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import WorkspaceNavigation from '@/app/components/WorkspaceNavigation';
import {requireCareerAccount} from '@/lib/career-access';
import LetterEditor from './LetterEditor';
export default async function CoverLetter({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [letter,profile,params]=await Promise.all([supabase.from('career_cover_letters').select('job_title,company_name,body_text').eq('user_id',identity.userId).maybeSingle(),supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle(),searchParams]);
 return <main><SiteHeader/><WorkspaceNavigation approved={profile.data?.verification_status==='approved'}/><section className="section"><div className="shell cv-focused-shell backend-form-card"><span className="section-kicker">OPTIONAL APPLICATION LETTER</span><h1>Your cover letter</h1><p>Prepare a reusable letter, then review it for each employer. It is shared only when you explicitly select it while applying for a job.</p>{(params.error||letter.error)&&<p role="alert" className="form-message form-message-error">{params.error||'Your saved letter could not be loaded. Please retry.'}</p>}{params.message&&<p role="status" className="form-message form-message-success">{params.message}</p>}<LetterEditor name={identity.profile?.full_name||''} initial={letter.data} disabled={Boolean(letter.error)}/><div className="cv-next-actions"><Link href="/career/cv">My CV</Link><Link href="/career/preferences">Job & internship interests</Link><Link href="/career">My profile home</Link></div></div></section><SiteFooter/></main>;
}
