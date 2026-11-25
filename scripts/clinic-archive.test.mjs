import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("archiving withdraws publication and restoring requires separate republication", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create table clinics (id integer primary key, is_published boolean not null);
      insert into clinics values (1, true), (2, true);
      create view public_clinics as select id from clinics where is_published;
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20261125000500_clinic_archive_lifecycle.sql", import.meta.url), "utf8"));
    await db.exec("update clinics set archived_at = now() where id = 1");
    assert.deepEqual((await db.query("select * from public_clinics")).rows, [{ id: 2 }]);
    await assert.rejects(db.exec("update clinics set is_published = true where id = 1"), /Restore the clinic/);
    await assert.rejects(db.exec("update clinics set archived_at = null, is_published = true where id = 1"), /Restore the clinic/);
    await db.exec("update clinics set archived_at = null where id = 1");
    assert.deepEqual((await db.query("select * from public_clinics")).rows, [{ id: 2 }]);
    assert.deepEqual((await db.query("select id from clinics where archived_at is null order by id")).rows, [{ id: 1 }, { id: 2 }]);
  } finally {
    await db.close();
  }
});
