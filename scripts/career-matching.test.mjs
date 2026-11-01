import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const preferencesUrl=compile(readFileSync('lib/career-preferences.ts','utf8'));
const {matchCareerJob,parseCareerPreferences,cvReady}=await import(preferencesUrl);
const {processCareerAlerts}=await import(compile(readFileSync('lib/career-alert-worker.ts','utf8').replace("import {matchesJobLocation} from './job-location';","const matchesJobLocation=(job,city)=>job.city===city;").replace("'./career-preferences'",JSON.stringify(preferencesUrl))));
const base={preferred_job_types:[],preferred_sectors:[],preferred_cities:[],desired_roles:[],preferred_countries:[],work_mode:'Any',job_market:'Any',salary_min:null,salary_max:null,salary_currency:'PKR',salary_period:'month',salary_negotiable:true,include_undisclosed_salary:true,email_alerts:true};
const job={id:'job',slug:'nutritionist',title:'Poultry Nutritionist',description:'Feed formulation experience',sector:'Poultry',city:'Lahore',province:'Punjab',employment_type:'Full-time',verification_status:'approved',is_published:true,deadline:'2027-01-01',country:'Pakistan',work_mode:'On-site',salary_min:60000,salary_max:90000,salary_currency:'PKR',salary_period:'month'};
const cv={full_name:'Candidate',headline:'Nutritionist',education:'BS',skills:'Feed formulation, Diagnostics'};
test('publication and deadline checks reject drafts, revoked and expired jobs',()=>{
 for(const patch of [{is_published:false},{verification_status:'pending'},{deadline:'2020-01-01'}])assert.equal(matchCareerJob({...job,...patch},base,cv),null);
});
test('sectors and roles accept multiple choices and empty lists keep the search open',()=>{
 assert.ok(matchCareerJob(job,{...base,preferred_sectors:['Dairy','Poultry'],desired_roles:['Surgeon','Nutritionist']},cv));
 assert.equal(matchCareerJob(job,{...base,preferred_sectors:['Dairy']},cv),null);
 assert.equal(matchCareerJob(job,{...base,desired_roles:['Surgeon']},cv),null);
 assert.ok(matchCareerJob(job,base,cv).explanation.includes('Feed formulation'.toLowerCase()));
});
test('remote, country, international and city preferences do not imply visa eligibility',()=>{
 assert.equal(matchCareerJob(job,{...base,job_market:'International'},cv),null);
 assert.equal(matchCareerJob(job,{...base,work_mode:'Remote'},cv),null);
 assert.equal(matchCareerJob(job,{...base,preferred_cities:['Faisalabad']},cv),null);
 assert.ok(matchCareerJob({...job,work_mode:'Remote'},{...base,preferred_cities:['Faisalabad']},cv));
 assert.ok(matchCareerJob({...job,country:'United Arab Emirates'},{...base,job_market:'International'},cv));
});
test('salary matching compares only same currency and period; flexibility and undisclosed pay are explicit',()=>{
 const fixed={...base,salary_min:70000,salary_max:100000,salary_negotiable:false};
 assert.ok(matchCareerJob(job,fixed,cv));
 for(const patch of [{salary_max:50000},{salary_currency:'USD'},{salary_period:'year'}])assert.equal(matchCareerJob({...job,...patch},fixed,cv),null);
 assert.ok(matchCareerJob({...job,salary_currency:'USD'},{...fixed,salary_negotiable:true},cv));
 assert.equal(matchCareerJob({...job,salary_min:null,salary_max:null},{...fixed,include_undisclosed_salary:false},cv),null);
});
test('preference input validates amounts, limits and opt-in without inventing experience',()=>{
 const form=new FormData();form.set('preferred_sectors','Poultry, Dairy, Poultry');
 assert.deepEqual(parseCareerPreferences(form).preferred_sectors,['Poultry','Dairy']);
 assert.equal(parseCareerPreferences(form).email_alerts,false);
 form.set('salary_min','-1');assert.throws(()=>parseCareerPreferences(form));
 form.set('salary_min','100');form.set('salary_max','50');assert.throws(()=>parseCareerPreferences(form));
 assert.equal(cvReady({...cv,experience:''}),true);assert.equal(cvReady({...cv,skills:''}),false);
});
function workerFixture({preferences=base,listing=job,verified=true,approved=true,failLookup=false}={}){
 const writes=[],sent=[];
 const rows=[{id:'q1',user_id:'user',job_id:'job',kind:'job_match',event_key:'job:job:user',claim_token:'lease',attempts:1}];
 const records={profiles:{account_status:'active',full_name:'Candidate'},career_cv_profiles:cv,candidate_preferences:preferences,jobs:listing,professional_profiles:{verification_status:approved?'approved':'pending'}};
 const db={rpc:async()=>({data:rows,error:null}),auth:{admin:{getUserById:async()=>({data:{user:{email:'verified@example.com',email_confirmed_at:verified?'2026-01-01':null}},error:null})}},from(table){
  let mutation;
  const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:records[table],error:failLookup?'temporary':null}),update(v){mutation=v;writes.push({table,values:v});return q;},upsert(v){writes.push({table,values:v});return Promise.resolve({error:null});},then(resolve,reject){return Promise.resolve({data:mutation??(table==='job_coverage_areas'?[]:null),error:null}).then(resolve,reject);}};return q;
 }};
 const run=send=>processCareerAlerts(db,send??(async mail=>{sent.push(mail);return {accepted:true,providerId:'mail-1'};}),{baseUrl:'https://vetconnect.com.pk',adminEmail:'admin@example.com'});
 return {writes,sent,run};
}
test('worker rechecks opt-out, verified email, review status and withdrawn listings before sending',async()=>{
 for(const state of [{preferences:{...base,email_alerts:false}},{verified:false},{approved:false},{listing:{...job,is_published:false}}]){
  const f=workerFixture(state);const result=await f.run();assert.equal(f.sent.length,0);assert.equal(result.skipped,1);
 }
});
test('worker uses verified login email, idempotency key, match reason and preferences link',async()=>{
 const f=workerFixture();const r=await f.run();assert.equal(r.accepted,1);assert.equal(f.sent[0].to,'verified@example.com');assert.equal(f.sent[0].idempotencyKey,'job:job:user');
 assert.match(f.sent[0].text,/career\/preferences/);assert.match(f.sent[0].text,/Feed formulation/i);
 assert.ok(f.writes.some(w=>w.values.status==='accepted'&&w.values.provider_id==='mail-1'));
});
test('provider and database failures remain retryable rather than claiming successful email delivery',async()=>{
 const f=workerFixture();const result=await f.run(async()=>({accepted:false}));assert.equal(result.accepted,0);assert.equal(result.retried,1);assert.ok(f.writes.some(w=>w.values.status==='pending'));
 const failed=workerFixture({failLookup:true});const r=await failed.run();assert.equal(failed.sent.length,0);assert.equal(r.retried,1);
});

test('optional internship focus includes trainee roles and avoids confusing international with internship',()=>{
 assert.equal(matchCareerJob(job,{...base,opportunity_focus:'Internships'},cv),null);
 assert.ok(matchCareerJob({...job,title:'Nutrition internship'},{...base,opportunity_focus:'Internships'},cv));
 assert.ok(matchCareerJob({...job,employment_type:'Trainee'},{...base,opportunity_focus:'Internships'},cv));
 assert.equal(matchCareerJob({...job,employment_type:'Internship'},{...base,opportunity_focus:'Jobs'},cv),null);
 assert.ok(matchCareerJob({...job,title:'International Veterinary Consultant'},{...base,opportunity_focus:'Jobs'},cv));
 const form=new FormData();form.set('opportunity_focus','Internships');form.set('guidance_requested','on');
 assert.equal(parseCareerPreferences(form).guidance_requested,true);
 assert.equal(parseCareerPreferences(form).opportunity_focus,'Internships');
});
