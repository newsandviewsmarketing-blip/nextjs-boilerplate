import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ClinicUpcomingVisits({ clinicId }: { clinicId: string }) {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
  const supabase = await createClient();
  const { data, error } = await supabase.from("clinic_appointment_requests")
    .select("id, scheduled_date, scheduled_time, animal_species")
    .eq("clinic_id", clinicId).eq("status", "scheduled")
    .or(`scheduled_date.gt.${today},and(scheduled_date.eq.${today},scheduled_time.gte.${time}),and(scheduled_date.eq.${today},scheduled_time.is.null)`)
    .order("scheduled_date").order("scheduled_time", { nullsFirst: false }).order("id").limit(20);
  return (
    <section className="backend-form-card workspace-section-card">
      <h2>Upcoming visits</h2>
      <p className="form-help">The next 20 scheduled visits, in Pakistan time.</p>
      {error ? <p role="status">Upcoming visits are temporarily unavailable.</p>
        : data?.length ? <ol className="workspace-record-list">{data.map(visit =>
          <li key={visit.id}>
            <strong>{visit.scheduled_date} · {visit.scheduled_time?.slice(0, 5) || "Time pending"}</strong>
            {visit.animal_species && <span> · {visit.animal_species}</span>}
          </li>)}</ol> : <p>No upcoming visits scheduled.</p>}
      <Link href={`/dashboard/clinics/${clinicId}?section=appointments`}>Open appointment inbox</Link>
    </section>
  );
}
