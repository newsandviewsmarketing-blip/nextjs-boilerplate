import "server-only";
import {createClient} from "@/lib/supabase/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import type {PublicConsultation} from "./status";
export async function publicConsultations(ids: string[]): Promise<Map<string,PublicConsultation>> {
  const rows = new Map<string,PublicConsultation>();
  if (!ids.length || !isSupabaseConfigured()) return rows;
  const db = await createClient();
  for (let i=0;i<ids.length;i+=100) {
    const {data,error} = await db.from("public_consultation_availability").select("user_id,status,audio,video,appointment,fee_pkr").in("user_id",ids.slice(i,i+100));
    if (error) return new Map();
    for (const row of data??[]) rows.set(row.user_id,row as PublicConsultation);
  }
  return rows;
}
