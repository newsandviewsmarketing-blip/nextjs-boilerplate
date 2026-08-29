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

  const careerRole = identity.roles.find((role) =>
    ["candidate", "professional", "veterinarian"].includes(role),
  );
  if (!careerRole) {
    redirect(`${path}?error=${encodeURIComponent("A professional, candidate or veterinarian profile is required before applying.")}`);
  }
  if (!jobId) redirect(`${path}?error=${encodeURIComponent("This job is not available.")}`);

  const supabase = await createClient();
  const verificationQuery = careerRole === "veterinarian"
    ? supabase.from("veterinarian_profiles").select("verification_status").eq("user_id", identity.userId).maybeSingle()
    : supabase.from("professional_profiles").select("verification_status").eq("user_id", identity.userId).maybeSingle();
  const { data: careerProfile, error: verificationError } = await verificationQuery;

  if (verificationError || careerProfile?.verification_status !== "approved") {
    redirect(`${path}?error=${encodeURIComponent("Your professional profile must be approved before you can apply for jobs.")}`);
  }

  const { error } = await supabase.from("job_applications").insert({
    job_id: jobId,
    candidate_user_id: identity.userId,
    cover_note: coverNote || null,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  revalidatePath("/dashboard/career");
  redirect(`${path}?message=${encodeURIComponent("Application submitted through VetConnect.")}`);
}

export async function toggleSavedJobAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const jobId = String(formData.get("job_id") ?? "").trim();
  const path = `/jobs/${encodeURIComponent(slug)}`;
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!jobId) redirect(`${path}?error=${encodeURIComponent("This job is not available.")}`);

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", identity.userId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (readError) redirect(`${path}?error=${encodeURIComponent(readError.message)}`);

  if (existing) {
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", identity.userId)
      .eq("job_id", jobId);
    if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase.from("saved_jobs").insert({
      user_id: identity.userId,
      job_id: jobId,
    });
    if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(path);
  revalidatePath("/dashboard/career");
  redirect(`${path}?message=${encodeURIComponent(existing ? "Job removed from saved jobs." : "Job saved to your career workspace.")}`);
}
