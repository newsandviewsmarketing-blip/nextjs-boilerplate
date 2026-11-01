import WorkspaceNavigation from '@/app/components/WorkspaceNavigation';
import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import {requireCareerAccount} from '@/lib/career-access';
import {WORK_MODES,JOB_MARKETS,PAY_PERIODS} from '@/lib/career-preferences';
import {saveCareerPreferences} from './actions';
export default async function Preferences({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [{data:p,error},params,profile]=await Promise.all([supabase.from('candidate_preferences').select('*').eq('professional_user_id',identity.userId).maybeSingle(),searchParams,supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle()]);
 return <main><SiteHeader/><WorkspaceNavigation approved={profile.data?.verification_status==='approved'}/><section className="section"><div className="shell backend-form-card">
 <span className="section-kicker">STEP 3 · JOB INTERESTS</span><h1>Which opportunities suit you?</h1>
 <p>Choose more than one sector or leave lists blank to stay open to all. Separate entries with commas. Your preferences stay private.</p>
 {(error||params.error)&&<p role="alert" className="form-message form-message-error">{params.error||'Your preferences could not be loaded. Please retry before saving.'}</p>}
 <details className="form-span-2"><summary>Not sure where to start?</summary><p>Start with jobs and internships, leave sectors and locations open if you are flexible, and add skills you actually have. Choose a country or city only when you want to limit results. Salary expectations are optional. You can return and refine these choices later.</p></details>
 <form action={saveCareerPreferences} className="profile-form">
 <div className="form-span-2"><label htmlFor="opportunity-focus">What are you looking for?</label><select id="opportunity-focus" name="opportunity_focus" defaultValue={p?.opportunity_focus??'Any'}><option value="Any">Jobs and internships</option><option value="Jobs">Jobs</option><option value="Internships">Internships, trainee roles and placements</option></select></div>
 {[
 ['desired_roles','Desired roles','Veterinary officer, Nutritionist, Farm manager'],
 ['preferred_sectors','Sectors','Poultry, Dairy / Cattle, Feed / Nutrition'],
 ['preferred_job_types','Employment types','Full-time, Part-time, Internship, Contract'],
 ['preferred_cities','Preferred cities','Faisalabad, Lahore'],
 ['preferred_countries','Preferred countries','Pakistan, United Arab Emirates'],
 ].map(([name,label,placeholder])=><div key={name}><label htmlFor={name}>{label}</label><input id={name} name={name} maxLength={2000} placeholder={placeholder} defaultValue={(p?.[name]??[]).join(', ')}/></div>)}
 {([['job_market','Job market',JOB_MARKETS,'Any'],['work_mode','Work arrangement',WORK_MODES,'Any'],['salary_period','Pay period',PAY_PERIODS,'month']] as const).map(([name,label,options,fallback])=><div key={name}><label htmlFor={name}>{label}</label><select id={name} name={name} defaultValue={p?.[name]??fallback}>{options.map(v=><option key={v}>{v}</option>)}</select></div>)}
 <div><label htmlFor="salary_currency">Salary currency (three-letter code)</label><input id="salary_currency" name="salary_currency" required pattern="[A-Za-z]{3}" maxLength={3} defaultValue={p?.salary_currency??'PKR'}/></div>
 {['min','max'].map(bound=><div key={bound}><label htmlFor={'salary_'+bound}>Expected salary {bound==='min'?'minimum':'maximum'} (optional)</label><input id={'salary_'+bound} name={'salary_'+bound} type="number" min={0} max={9999999999} step="0.01" defaultValue={p?.['salary_'+bound]??''}/></div>)}
 <p className="form-span-2">These are your expectations, not a salary guarantee or an official pay scale. Fixed salary matching compares the same currency and pay period; exchange rates are not guessed. Confirm eligibility, pay and visa terms with the employer.</p>
 <label className="checkbox-line"><input type="checkbox" name="salary_negotiable" defaultChecked={p?.salary_negotiable??true}/>I am flexible about salary</label>
 <label className="checkbox-line"><input type="checkbox" name="include_undisclosed_salary" defaultChecked={p?.include_undisclosed_salary??true}/>Include jobs without a disclosed salary</label>
 <label className="checkbox-line form-span-2"><input type="checkbox" name="guidance_requested" defaultChecked={p?.guidance_requested??false}/>I am unsure which career path suits me. Record my interest in career guidance (optional; this does not book an appointment).</label>
 <label className="checkbox-line form-span-2"><input type="checkbox" name="email_alerts" defaultChecked={p?.email_alerts??false}/>Email me when a newly published job matches my preferences. I can switch this off here at any time.</label>
 <button type="submit" disabled={Boolean(error)} className="button button-primary">Save preferences</button>
 </form><Link href="/career">Back to My Career</Link>
 </div></section><SiteFooter/></main>;
}
