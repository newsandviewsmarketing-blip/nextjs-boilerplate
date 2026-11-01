import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const migration=readFileSync('supabase/migrations/20261101073714_job_seeker_preferences_alerts.sql','utf8');
const user='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create table public.profiles(id uuid primary key,primary_role text,account_status text);
 create table public.professional_profiles(user_id uuid primary key,verification_status text);
 create table public.career_cv_profiles(user_id uuid primary key,full_name text,headline text,education text,skills text);
 create table public.candidate_preferences(professional_user_id uuid primary key,preferred_job_types text[] default '{}',preferred_sectors text[] default '{}',preferred_cities text[] default '{}');
 alter table public.candidate_preferences enable row level security;
 create policy own_preferences on public.candidate_preferences for all to authenticated using(professional_user_id=auth.uid()) with check(professional_user_id=auth.uid());
 grant select,insert,update on public.candidate_preferences to authenticated;
 create table public.jobs(id uuid primary key default gen_random_uuid(),title text,description text,sector text,city text,employment_type text,verification_status text,is_published boolean,deadline date);
 create table storage.objects(id uuid,name text,bucket_id text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 `);
 await db.exec(migration);
 await db.exec(`insert into auth.users values('${user}',now()),('${other}',null);
 insert into public.profiles values('${user}','candidate','active'),('${other}','candidate','active');
 insert into public.professional_profiles values('${user}','pending'),('${other}','approved');
 insert into public.career_cv_profiles(user_id,full_name,headline,education,skills) values('${user}','Candidate','Nutritionist','BS','Feed formulation');
 insert into public.candidate_preferences(professional_user_id) values('${user}'),('${other}');`);
 return db;
}
test('approved job publication, consent, profile review and completed CV gate emails; repeated updates deduplicate',async()=>{
 const db=await fixture();
 try{
 assert.equal((await db.query('select count(*)::int as n from career_alert_outbox')).rows[0].n,2,'two CV receipts, no job match');
 const job=(await db.query("insert into jobs(title,verification_status,is_published) values('Nutritionist','pending',false) returning id")).rows[0].id;
 await db.exec(`update candidate_preferences set email_alerts=true where professional_user_id='${user}'; update jobs set verification_status='approved',is_published=true where id='${job}';`);
 assert.equal((await db.query("select count(*)::int n from career_alert_outbox where kind='job_match'")).rows[0].n,0,'pending professional cannot receive matching mail');
 await db.exec(`update professional_profiles set verification_status='approved' where user_id='${user}'; update jobs set title='Nutritionist role' where id='${job}';`);
 assert.equal((await db.query("select count(*)::int n from career_alert_outbox where kind='job_match'")).rows[0].n,1);
 const first=(await db.query('select * from claim_career_alerts(2)')).rows;
 assert.equal(first.length,2);assert.ok(first.every(r=>r.claim_token&&r.attempts===1));
 const second=(await db.query('select * from claim_career_alerts(50)')).rows;
 assert.equal(second.length,1,'leased rows cannot be claimed twice');
 await db.exec("update career_alert_outbox set locked_until=now()-interval '1 minute' where status='processing'");
 assert.equal((await db.query('select * from claim_career_alerts(50)')).rows.length,3,'expired leases recover');
 await db.exec("update career_alert_outbox set status='accepted'");
 await db.exec(`update jobs set title='Nutritionist updated' where id='${job}'`);
 assert.equal((await db.query('select * from claim_career_alerts(50)')).rows.length,0,'accepted emails never requeued');
 }finally{await db.close();}
});
test('queue is inaccessible to clients; preferences enforce ownership; photo paths cannot name another user',async()=>{
 const db=await fixture();
 try{
 await assert.rejects(db.exec(`insert into career_cv_profiles(user_id,photo_path) values('${other}','${user}/photo.jpg')`));
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}'`);
 assert.equal((await db.query('select count(*)::int n from candidate_preferences')).rows[0].n,1);
 await assert.rejects(db.query('select * from career_alert_outbox'));
 await assert.rejects(db.query('select * from claim_career_alerts(10)'));
 await assert.rejects(db.exec(`update candidate_preferences set professional_user_id='${other}' where professional_user_id='${user}'`));
 }finally{await db.close();}
});
test('expired jobs and opt-out never enqueue new matching emails; retry horizon terminates uncertain sends',async()=>{
 const db=await fixture();
 try{
 await db.exec(`update professional_profiles set verification_status='approved' where user_id='${user}';
 insert into jobs(title,verification_status,is_published,deadline) values('Expired','approved',true,current_date-1);
 update candidate_preferences set email_alerts=true where professional_user_id='${user}';`);
 assert.equal((await db.query("select count(*)::int n from career_alert_outbox where kind='job_match'")).rows[0].n,0);
 await db.exec(`update candidate_preferences set email_alerts=false where professional_user_id='${user}'; insert into jobs(title,verification_status,is_published) values('New','approved',true);`);
 assert.equal((await db.query("select count(*)::int n from career_alert_outbox where kind='job_match'")).rows[0].n,0);
 await db.exec("update career_alert_outbox set first_attempt_at=now()-interval '21 hours'");
 assert.equal((await db.query('select * from claim_career_alerts(50)')).rows.length,0);
 assert.equal((await db.query("select count(*)::int n from career_alert_outbox where status='failed'")).rows[0].n,2);
 }finally{await db.close();}
});
