"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function applyToJobAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  const coverNote = String(formData.get("cover_note") ?? "").trim();
  const path = `/jobs/${encodeURIComponent(slug)}`;
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!identity.roles.some((role) => role === "candidate" || role === "professional")) {
    redirect(`${path}?error=${encodeURIComponent("Create a candidate or professional career profile before applying.")}`);
  }
  if (!jobId) redirect(`${path}?error=${encodeURIComponent("This job is not available.")}`);

  const supabase = await createClient();
  const { error } = await supabase.from("job_applications").insert({
    job_id: jobId,
    candidate_user_id: identity.userId,
    cover_note: coverNote || null,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?message=${encodeURIComponent("Application submitted through VetConnect.")}`);
}
