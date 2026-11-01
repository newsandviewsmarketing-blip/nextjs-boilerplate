export const WORK_MODES = ['Any', 'On-site', 'Remote', 'Hybrid'] as const;
export const JOB_MARKETS = ['Any', 'Pakistan', 'International'] as const;
export const PAY_PERIODS = ['hour', 'month', 'year'] as const;
export type CareerPreferences = {
 opportunity_focus?:string;guidance_requested?:boolean;
 preferred_job_types: string[]; preferred_sectors: string[]; preferred_cities: string[];
 desired_roles: string[]; preferred_countries: string[]; work_mode: string; job_market: string;
 salary_min: number|null; salary_max: number|null; salary_currency: string; salary_period: string;
 salary_negotiable: boolean; include_undisclosed_salary: boolean; email_alerts: boolean;
};
export function parseCareerPreferences(form: FormData): CareerPreferences {
 const list=(key:string)=>{
  const raw=String(form.get(key)??'');
  if(raw.length>2000)throw new Error('Keep each preference list under 2,000 characters.');
  // JSON arrays preserve approved master-data labels containing commas.
  // Keep legacy comma/newline submission support for existing forms and tests.
  let entries:string[];
  if(raw.trimStart().startsWith('[')){
   let decoded:unknown;
   try{decoded=JSON.parse(raw);}catch{throw new Error('Choose valid list items.');}
   if(!Array.isArray(decoded)||decoded.some(item=>typeof item!=='string'))throw new Error('Choose valid list items.');
   entries=decoded as string[];
  }else{
   entries=raw.split(/[,\n]/);
  }
  const items=[...new Set(entries.map(s=>s.trim()).filter(Boolean))];
  if(items.length>20||items.some(s=>s.length>100||/[<>\u0000-\u001f]/.test(s)))throw new Error('Use up to 20 entries per list, each under 100 characters.');
  return items;
 };
 const choice=(key:string,allowed:readonly string[],fallback:string)=>{
  const v=String(form.get(key)??fallback);if(!allowed.includes(v))throw new Error('Choose a valid '+key.replaceAll('_',' ')+'.');return v;
 };
 const amount=(key:string)=>{
  const raw=String(form.get(key)??'').trim();
  if(!raw)return null;
  if(!/^\d{1,10}(\.\d{1,2})?$/.test(raw))throw new Error('Enter a non-negative salary with up to two decimal places.');
  return Number(raw);
 };
 const currency=String(form.get('salary_currency')??'PKR').trim().toUpperCase();
 try {new Intl.NumberFormat('en',{style:'currency',currency});}catch {throw new Error('Enter a three-letter currency code.');}
 if(!/^[A-Z]{3}$/.test(currency))throw new Error('Enter a three-letter currency code.');
 const min=amount('salary_min'),max=amount('salary_max');
 if(min!==null&&max!==null&&min>max)throw new Error('Maximum salary must be at least the minimum.');
 return {
  opportunity_focus:choice('opportunity_focus',['Any','Jobs','Internships'],'Any'),guidance_requested:form.get('guidance_requested')==='on',
  preferred_job_types:list('preferred_job_types'),preferred_sectors:list('preferred_sectors'),preferred_cities:list('preferred_cities'),
  desired_roles:list('desired_roles'),preferred_countries:list('preferred_countries'),
  work_mode:choice('work_mode',WORK_MODES,'Any'),job_market:choice('job_market',JOB_MARKETS,'Any'),
  salary_min:min,salary_max:max,salary_currency:currency,salary_period:choice('salary_period',PAY_PERIODS,'month'),
  salary_negotiable:form.get('salary_negotiable')==='on',include_undisclosed_salary:form.get('include_undisclosed_salary')==='on',
  email_alerts:form.get('email_alerts')==='on',
 };
}
export type AlertJob={id:string;slug:string;title:string;description:string;sector:string|null;city:string|null;province:string|null;employment_type:string;verification_status:string;is_published:boolean;deadline:string|null;country?:string|null;work_mode?:string|null;salary_min?:number|null;salary_max?:number|null;salary_currency?:string|null;salary_period?:string|null;minimum_experience?:number|null;location_matches?:boolean};
const norm=(v:string|null|undefined)=>(v??'').trim().toLowerCase();
const contains=(text:string,phrase:string)=>text.includes(norm(phrase));
export function matchCareerJob(job:AlertJob,p:CareerPreferences,cv:{headline?:string|null;skills?:string|null},today=new Date().toISOString().slice(0,10)) {
 if(job.verification_status!=='approved'||!job.is_published||(job.deadline&&job.deadline<today))return null;
 const internship=/\b(intern(ship)?|trainee|apprentice(ship)?|placement)s?\b/i.test(job.employment_type+' '+job.title);
 if(p.opportunity_focus==='Internships'&&!internship)return null;
 if(p.opportunity_focus==='Jobs'&&internship)return null;
 if(p.preferred_sectors.length&&!p.preferred_sectors.some(s=>norm(s)===norm(job.sector)))return null;
 if(p.preferred_job_types.length&&!p.preferred_job_types.some(s=>norm(s)===norm(job.employment_type)))return null;
 const search=norm(job.title+' '+job.description);
 if(p.desired_roles.length&&!p.desired_roles.some(s=>contains(search,s)))return null;
 const country=norm(job.country||'Pakistan');
 if(p.job_market==='Pakistan'&&country!=='pakistan')return null;
 if(p.job_market==='International'&&country==='pakistan')return null;
 if(p.preferred_countries.length&&!p.preferred_countries.some(s=>norm(s)===country))return null;
 if(p.work_mode!=='Any'&&norm(p.work_mode)!==norm(job.work_mode||'On-site'))return null;
 if(p.preferred_cities.length&&norm(job.work_mode)!=='remote'&&!(job.location_matches??p.preferred_cities.some(s=>norm(s)===norm(job.city))))return null;
 const hasRange=job.salary_min!=null||job.salary_max!=null;
 const hasExpectation=p.salary_min!==null||p.salary_max!==null;
 if(!hasRange&&!p.include_undisclosed_salary)return null;
 if(hasRange&&hasExpectation&&!p.salary_negotiable){
  if(norm(job.salary_currency)!==norm(p.salary_currency)||job.salary_period!==p.salary_period)return null;
  if(p.salary_min!==null&&job.salary_max!=null&&job.salary_max<p.salary_min)return null;
  if(p.salary_max!==null&&job.salary_min!=null&&job.salary_min>p.salary_max)return null;
 }
 const skills=(cv.skills??'').split(/[,;\n]/).map(norm).filter(s=>s.length>1);
 const matchedSkills=skills.filter(s=>contains(search,s));
 const reasons=[p.preferred_sectors.length?'Preferred sector':'Open sector search',p.desired_roles.length?'Preferred role':'Open role search'];
 if(matchedSkills.length)reasons.push('CV skills: '+matchedSkills.slice(0,4).join(', '));
 if(!hasRange)reasons.push('Employer has not disclosed salary');
 return {score:Math.min(100,60+matchedSkills.length*10+(contains(search,cv.headline||'\u0000')?10:0)),explanation:reasons.join('. ')};
}
export function cvReady(cv:{full_name?:string|null;headline?:string|null;education?:string|null;skills?:string|null}|null){
 return Boolean(cv&&[cv.full_name,cv.headline,cv.education,cv.skills].every(s=>s&&s.trim().length>1));
}
