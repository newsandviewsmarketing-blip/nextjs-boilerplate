import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20261125000400_managed_clinic_records.sql", import.meta.url), "utf8");
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const clinic = "00000000-0000-4000-8000-000000000003";
const secondClinic = "00000000-0000-4000-8000-000000000004";
const customer = "00000000-0000-4000-8000-000000000005";
const secondCustomer = "00000000-0000-4000-8000-000000000006";
const service = "00000000-0000-4000-8000-000000000007";

test("managed clinic migration enforces ownership, same-clinic references and mode rules", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.profiles (id uuid primary key);
      create table public.clinics (id uuid primary key, owner_id uuid references public.profiles);
      create table public.clinic_services (
        clinic_id uuid references public.clinics,
        service_id uuid not null,
        primary key (clinic_id, service_id)
      );
      grant select on public.clinics to authenticated;
      insert into public.profiles values ('${owner}'), ('${other}');
      insert into public.clinics values ('${clinic}', '${owner}'), ('${secondClinic}', '${other}');
      insert into public.clinic_services values ('${clinic}', '${service}');
    `);
    await db.exec(migration);
    await db.query("insert into clinic_customers (id, clinic_id, display_name) values ($1, $2, 'First'), ($3, $4, 'Second')",
      [customer, clinic, secondCustomer, secondClinic]);

    await db.exec(`set request.jwt.claim.sub = '${owner}'; set role authenticated;`);
    await assert.rejects(db.query("select * from clinic_encounters"), { code: "42501" });
    await assert.rejects(db.query("select * from clinic_invoices"), { code: "42501" });
    const rows = await db.query("select display_name from clinic_customers");
    assert.deepEqual(rows.rows, [{ display_name: "First" }]);
    assert.equal((await db.query("update clinic_customers set display_name = 'Hidden' where id = $1", [secondCustomer])).affectedRows, 0);
    await assert.rejects(db.query("update clinic_customers set clinic_id = $1 where id = $2", [secondClinic, customer]), { code: "42501" });
    await assert.rejects(db.query("delete from clinic_customers where id = $1", [customer]), { code: "42501" });
    const addPatient = "insert into clinic_patients (clinic_id, customer_id, display_name, kind, species) values ($1, $2, 'Sample', 'herd', 'Cattle')";
    await assert.rejects(db.query(addPatient, [clinic, secondCustomer]), { code: "23503" });
    await db.query(addPatient, [clinic, customer]);
    const addMode = "insert into clinic_service_visit_modes (clinic_id, service_id, mode, duration_minutes, travel_fee) values ($1, $2, $3, 30, $4) returning id";
    const visit = await db.query(addMode, [clinic, service, "online", null]);
    await db.query(addMode, [clinic, service, "farm_visit", 500]);
    await assert.rejects(db.query(addMode, [clinic, service, "online", null]), { code: "23505" });
    await assert.rejects(db.query(addMode, [clinic, service, "in_clinic", 500]), { code: "23514" });
    await assert.rejects(db.query(
      "insert into clinic_service_visit_hours values ($1, $2, 1, '09:00', '17:00', '13:00', null)", [clinic, visit.rows[0].id]), { code: "23514" });
    await db.query("insert into clinic_service_visit_hours values ($1, $2, 1, '09:00', '17:00', '13:00', '14:00')",
      [clinic, visit.rows[0].id]);
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from clinic_customers"), { code: "42501" });
    await assert.rejects(db.query("select * from clinic_service_visit_modes"), { code: "42501" });
  } finally {
    await db.close();
  }
});
