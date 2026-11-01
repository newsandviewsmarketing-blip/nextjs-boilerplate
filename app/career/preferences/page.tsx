import WorkspaceNavigation from '@/app/components/WorkspaceNavigation';
import CareerChoiceChips from '@/app/components/CareerChoiceChips';
import Link from 'next/link';
import SiteHeader from '@/app/components/SiteHeader';
import SiteFooter from '@/app/components/SiteFooter';
import {requireCareerAccount} from '@/lib/career-access';
import {CAREER_ROLE_SUGGESTIONS} from '@/lib/career-options';
import {locationSearchOptions} from '@/lib/job-location';
import {WORK_MODES,JOB_MARKETS,PAY_PERIODS} from '@/lib/career-preferences';
import {saveCareerPreferences} from './actions';

const jobTypes=['Full-time','Part-time','Contract','Internship','Trainee','Consultancy','Temporary'] as const;
const countries=['Pakistan','United Arab Emirates','Saudi Arabia','Qatar','Oman','United Kingdom','Canada','Australia'] as const;

export default async function Preferences({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {identity,supabase}=await requireCareerAccount();
 const [{data:p,error},params,profile,approvedSectors]=await Promise.all([
  supabase.from('candidate_preferences').select('*').eq('professional_user_id',identity.userId).maybeSingle(),
  searchParams,
  supabase.from('professional_profiles').select('verification_status').eq('user_id',identity.userId).maybeSingle(),
  supabase.from('master_data_items').select('label').eq('category','job_sector').eq('is_active',true).order('label'),
 ]);
 const sectors=(approvedSectors.data??[]).map(item=>item.label);
 const cities=locationSearchOptions();
 const currentCity=[identity.profile?.city,identity.profile?.province].filter(Boolean).join(', ');
 const cannotSave=Boolean(error||approvedSectors.error);
 return <main className="career-interests-page">
  <SiteHeader/><WorkspaceNavigation approved={profile.data?.verification_status==='approved'}/>
  <section className="page-hero"><div className="shell career-interests-shell">
   <span className="section-kicker">YOUR FUTURE OPPORTUNITIES</span>
   <h1>Tell us what you are interested in.</h1>
   <p>Select the roles, sectors and places that matter to you. This is separate from your current profession and CV. Every choice is optional and editable.</p>
  </div></section>
  <section className="section compact-section"><div className="shell career-interests-shell">
   {(error||params.error||approvedSectors.error)&&<p role="alert" className="form-message form-message-error">{params.error||'Some preferences or approved sectors could not be loaded. Please retry before saving.'}</p>}
   <form action={saveCareerPreferences} className="career-interests-form">
    <section className="backend-form-card career-interests-section" aria-labelledby="career-direction-title">
     <span className="section-kicker">01 · CAREER DIRECTION</span>
     <h2 id="career-direction-title">What work would you like?</h2>
     <p>Current experience and future interests can be different. You may choose several options or keep your search open.</p>
     <div><label htmlFor="opportunity-focus">Opportunity focus</label>
      <select id="opportunity-focus" name="opportunity_focus" defaultValue={p?.opportunity_focus??'Any'}>
       <option value="Any">Jobs and internships</option><option value="Jobs">Jobs only</option><option value="Internships">Internships, trainee roles and placements</option>
      </select></div>
     <CareerChoiceChips name="desired_roles" label="Desired professions / roles" initial={p?.desired_roles??[]} options={CAREER_ROLE_SUGGESTIONS} allowCustom showSuggestionsInitially placeholder="Search role or enter another job title" help="Examples: Poultry Veterinarian, Farm Manager, Research Assistant."/>
     <CareerChoiceChips name="preferred_sectors" label="Preferred sectors" initial={p?.preferred_sectors??[]} options={sectors} showSuggestionsInitially placeholder="Search approved sectors" help={sectors.length?'These are the same approved sector labels used for employer job listings.':'Approved sector suggestions are unavailable. Leave this blank to search all sectors.'}/>
     <CareerChoiceChips name="preferred_job_types" label="Employment types (optional)" initial={p?.preferred_job_types??[]} options={jobTypes} allowCustom showSuggestionsInitially placeholder="Search job type" help="Leave blank to include all types. Internship focus above is a separate filter."/>
    </section>

    <section className="backend-form-card career-interests-section" aria-labelledby="career-location-title">
     <span className="section-kicker">02 · WHERE TO WORK</span>
     <h2 id="career-location-title">Which locations suit you?</h2>
     <p>Your current profile location is {currentCity||'not specified'}. <Link href="/dashboard#account-settings">Edit your current city</Link>. The locations below are only for opportunity matching.</p>
     <CareerChoiceChips name="preferred_cities" label="Preferred cities / towns" initial={p?.preferred_cities??[]} options={cities} allowCustom placeholder="Type city to see suggestions" help="Select one or more locations, or leave blank for any city. The Pakistan list includes districts and tehsils; international cities can be entered manually. Places with the same name may need an additional province check."/>
     <CareerChoiceChips name="preferred_countries" label="Preferred countries" initial={p?.preferred_countries??[]} options={countries} allowCustom showSuggestionsInitially placeholder="Search country" help="Leave blank for any country; use Job market below if you only want Pakistan or international work."/>
     <div className="career-interests-two-column">
      <div><label htmlFor="job_market">Job market</label><select id="job_market" name="job_market" defaultValue={p?.job_market??'Any'}>{JOB_MARKETS.map(v=><option key={v}>{v}</option>)}</select></div>
      <div><label htmlFor="work_mode">Work arrangement</label><select id="work_mode" name="work_mode" defaultValue={p?.work_mode??'Any'}>{WORK_MODES.map(v=><option key={v}>{v}</option>)}</select></div>
     </div>
    </section>

    <section className="backend-form-card career-interests-section" aria-labelledby="career-optional-title">
     <span className="section-kicker">03 · OPTIONAL PREFERENCES</span>
     <h2 id="career-optional-title">Salary, guidance and alerts</h2>
     <p>You can finish without specifying salary or turning on emails.</p>
     <details className="career-optional-disclosure" open={Boolean(p?.salary_min||p?.salary_max)}>
      <summary>Salary expectations</summary>
      <div className="career-interests-two-column">
       <div><label htmlFor="salary_currency">Currency code</label><input id="salary_currency" name="salary_currency" required pattern="[A-Za-z]{3}" maxLength={3} defaultValue={p?.salary_currency??'PKR'}/></div>
       <div><label htmlFor="salary_period">Pay period</label><select id="salary_period" name="salary_period" defaultValue={p?.salary_period??'month'}>{PAY_PERIODS.map(v=><option key={v}>{v}</option>)}</select></div>
       {['min','max'].map(bound=><div key={bound}><label htmlFor={'salary_'+bound}>Expected salary {bound==='min'?'minimum':'maximum'} (optional)</label><input id={'salary_'+bound} name={'salary_'+bound} type="number" min={0} max={9999999999} step="0.01" defaultValue={p?.['salary_'+bound]??''}/></div>)}
      </div>
      <label className="checkbox-line"><input type="checkbox" name="salary_negotiable" defaultChecked={p?.salary_negotiable??true}/>I am flexible about salary</label>
      <label className="checkbox-line"><input type="checkbox" name="include_undisclosed_salary" defaultChecked={p?.include_undisclosed_salary??true}/>Include jobs without a disclosed salary</label>
      <p className="form-help">Salary matching uses the same currency and pay period. No exchange rates or salary guarantees are assumed.</p>
     </details>
     <label className="checkbox-line"><input type="checkbox" name="guidance_requested" defaultChecked={p?.guidance_requested??false}/>I would like optional career guidance (this does not book an appointment).</label>
     <label className="checkbox-line"><input type="checkbox" name="email_alerts" defaultChecked={p?.email_alerts??false}/>Email me about newly published matching jobs and internships (opt-in; switch off any time).</label>
     <p className="form-help">Preferences are private. Job alerts require an approved professional profile, a sufficiently completed CV and configured email delivery.</p>
    </section>

    <div className="career-interests-actions"><Link href="/career/cv" className="button button-secondary">Back to CV</Link><button type="submit" disabled={cannotSave} className="button button-primary">Save my interests</button></div>
   </form>
   <p className="form-help"><Link href="/career">Return to my profile home</Link></p>
  </div></section>
  <SiteFooter/>
 </main>;
}
