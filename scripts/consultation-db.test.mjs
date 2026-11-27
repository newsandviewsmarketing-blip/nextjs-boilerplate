import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('isolated migrations, participant RLS, duplicate prevention and atomic reservation',async()=>{
  const db=new PGlite();
  const [caller,vet,other]=[1,2,3].map(n=>'00000000-0000-4000-8000-00000000000'+n);
  async function login(id){
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${id}'`);
  }
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.profiles(id uuid primary key,account_status text);
      create table clinics(id uuid primary key,owner_id uuid);
      create table service_catalog(id uuid primary key,is_active boolean,slug text);
      create table clinic_services(clinic_id uuid,service_id uuid,is_active boolean,is_public boolean,booking_enabled boolean,duration_minutes int);
      create table clinic_appointment_requests(id uuid primary key,requester_id uuid,clinic_id uuid,service_id uuid,scheduled_date date,scheduled_time time,status text);
      create table public.public_veterinarians(user_id uuid primary key);
      create function public.is_super_admin() returns boolean language sql as $$select false$$;
      create function public.has_admin_permission(text) returns boolean language sql as $$select false$$;
      grant select on profiles, public_veterinarians to authenticated;
      insert into profiles values ('${caller}','active'),('${vet}','active'),('${other}','active');
      insert into public_veterinarians values ('${vet}');`);
    for(const file of ['20261127123000_consultation_foundation.sql','20261127183000_consultation_operations.sql'])
      await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
    await db.exec(`insert into consultation_test_accounts values ('${caller}'),('${vet}'),('${other}');update consultation_settings set enabled=true;`);
    await login(vet);
    await db.exec(`insert into consultation_preferences(user_id,enabled,availability,audio,fee_pkr) values ('${vet}',true,'available',true,500) on conflict(user_id) do update set user_id=excluded.user_id,fee_pkr=excluded.fee_pkr;
      update consultation_preferences set heartbeat_at=now();`);
    await login(caller);
    const request=()=>db.query("select consultation_request($1,'audio') as id",[vet]);
    const {rows:[{id}]}=await request();
    await assert.rejects(request(),/busy/);
    const respond=decision=>db.query('select consultation_respond($1,$2)',[id,decision]);
    await assert.rejects(respond('accept'));
    await login(other);
    assert.equal((await db.query('select * from consultation_sessions')).rows.length,0);
    await assert.rejects(respond('cancel'));
    await login(vet);
    await assert.rejects(respond('accept'),/Budget unavailable/);
    await db.exec("reset role;insert into consultation_months(month_start,limit_minutes) values(date_trunc('month',now())::date,20)");
    await login(vet);await respond('accept');await assert.rejects(respond('accept'));
    assert.equal((await db.query('select state from consultation_sessions')).rows[0].state,'provisioning');
    assert.equal((await db.query('select * from consultation_joinable($1)',[id])).rows.length,0);
    await db.exec("reset role;update consultation_sessions set state='ready'");
    await login(caller);assert.equal((await db.query('select * from consultation_joinable($1)',[id])).rows.length,1);
    await db.exec("reset role;update consultation_settings set enabled=false");
    assert.equal((await db.query('select reserved_minutes from consultation_months')).rows[0].reserved_minutes,20);
    await login(caller);assert.equal((await db.query('select * from consultation_joinable($1)',[id])).rows.length,0);
    await db.exec("reset role; update consultation_sessions set expires_at=now()-interval '10 minutes',accepted_at=now()-interval '20 minutes'");
    await db.query("select consultation_settle($1,4,100,now()-interval '15 minutes')",[id]);
    await db.query("select consultation_settle($1,4,100,now()-interval '15 minutes')",[id]);
    assert.deepEqual((await db.query("select used_minutes,reserved_minutes from consultation_months")).rows,[{used_minutes:4,reserved_minutes:16}]);
  } finally {await db.close();}
});
