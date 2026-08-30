"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";

function v(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }

export async function requestClinicAppointmentAction(formData: FormData) {
  const clinicId=v(formData,"clinic_id"), slug=v(formData,"slug"), contactName=v(formData,"contact_name"), reason=v(formData,"reason");
  if(!clinicId||!slug||!contactName||!reason) redirect(`/clinics/${encodeURIComponent(slug)}?error=Name%20and%20reason%20are%20required.`);
  const identity=await getCurrentIdentity();
  const supabase=await createClient();
  const {error}=await supabase.from("clinic_appointment_requests").insert({clinic_id:clinicId,requester_id:identity?.userId??null,contact_name:contactName,contact_email:v(formData,"contact_email")||identity?.email||null,contact_phone:v(formData,"contact_phone")||null,animal_species:v(formData,"animal_species")||null,preferred_date:v(formData,"preferred_date")||null,preferred_time:v(formData,"preferred_time")||null,reason});
  if(error) redirect(`/clinics/${encodeURIComponent(slug)}?error=${encodeURIComponent(error.message)}`);
  redirect(`/clinics/${encodeURIComponent(slug)}?message=Appointment%20request%20sent%20to%20the%20clinic.`);
}
