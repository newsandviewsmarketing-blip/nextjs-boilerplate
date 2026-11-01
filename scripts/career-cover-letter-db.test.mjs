import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('cover letter drafts enforce ownership, active accounts and database text bounds',async()=>{
 const db=new PGlite();
 const one='00000000-0000-4000-8000-000000000001',two='00000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table profiles(id uuid primary key,account_status text);grant select on profiles to authenticated;
 create table candidate_preferences(user_id uuid primary key);
 insert into profiles values('${one}','active'),('${two}','active');`);
 await db.exec(readFileSync('supabase/migrations/20261101083011_private_career_cover_letter.sql','utf8'));
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${one}';`);
 await db.exec(`insert into career_cover_letters(user_id,body_text) values('${one}','A private and reviewed letter for an application.');`);
 await assert.rejects(db.exec(`insert into career_cover_letters(user_id,body_text) values('${two}','A private and reviewed letter for an application.')`));
 await assert.rejects(db.exec(`update career_cover_letters set body_text='short'`));
 await db.exec(`set request.jwt.claim.sub='${two}'`);
 assert.equal((await db.query('select count(*)::int n from career_cover_letters')).rows[0].n,0);
 await db.exec(`reset role;update profiles set account_status='suspended' where id='${one}';set role authenticated;set request.jwt.claim.sub='${one}'`);
 assert.equal((await db.query('select count(*)::int n from career_cover_letters')).rows[0].n,0);
 }finally{await db.close();}
});
