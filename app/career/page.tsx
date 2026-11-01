import ProfileStart from './ProfileStart';
import ProfilePhoto from '@/app/components/ProfilePhoto';
import {initials} from '@/lib/directories';
import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import {requireCareerAccount} from '@/lib/career-access';
import {cvReady} from '@/lib/career-preferences';
export default async function CareerHome({searchParams}:{searchParams:Promise<{message?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [cv,prefs,profile,params]=await Promise.all([
 supabase.from('career_cv_profiles').select('full_name,headline,education,skills').eq('user_id',identity.userId).maybeSingle(),
 supabase.from('candidate_preferences').select('email_alerts').eq('professional_user_id',identity.userId).maybeSingle(),
 supabase.from('professional_profiles').select('verification_status,image_url,headline,professional_type').eq('user_id',identity.userId).maybeSingle(),searchParams]);
 const ready=cvReady(cv.data),approved=profile.data?.verification_status==='approved';
 return <main className="personal-profile-home"><SiteHeader/><section className="section"><div className="shell profile-home-shell">
 {params.message&&<p role="status" className="form-message form-message-success">{params.message}</p>}
 {(cv.error||prefs.error||profile.error)&&<p role="alert">Some profile details are temporarily unavailable. Please retry; your saved data has not been removed.</p>}
 <article className="personal-identity-card"><div className="personal-identity-photo"><ProfilePhoto imageUrl={profile.data?.image_url??null} name={identity.profile?.full_name||identity.email} fallback={initials(identity.profile?.full_name||identity.email)}/></div><div><span className="section-kicker">MY VETCONNECT PROFILE</span><h1>{identity.profile?.full_name||'My professional profile'}</h1><p>{profile.data?.headline||profile.data?.professional_type||'Your personal and professional identity'}</p><p>{[identity.profile?.city,identity.profile?.province].filter(Boolean).join(', ')}</p><div className="status-cluster"><span className="status-pill">{approved?'Professional profile approved':'Professional review pending'}</span><span className="status-pill">{ready?'Core CV details saved':cv.data?'CV draft in progress':'CV not yet saved'}</span><span className="status-pill">Job emails {prefs.data?.email_alerts?'enabled':'off'}</span></div></div></article>
 <ProfileStart approved={approved} clinicAccess={identity.roles.some(role=>['veterinarian','professional'].includes(role))}/>
 <p className="profile-home-note">One account belongs to you. Clinics and companies keep separate profiles linked through verified roles. Your CV stays private until you deliberately share it in an application.</p>
 {!approved&&<p className="profile-home-note"><Link href="/register/complete">Review your registration status</Link>. Email confirmation and professional verification are separate steps.</p>}
 </div></section><SiteFooter/></main>;
}
