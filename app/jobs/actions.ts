"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {matchingVerifiedAccountEmail} from "@/lib/career-email-verification";
import {notifyEmployerApplication} from "@/lib/guest-job-applications";

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
    redirect(`${path}?error=${encodeURIComponent("This account cannot apply. Sign in with a Candidate, Professional or Veterinarian account.")}`);
  }
  if (!jobId) redirect(`${path}?error=${encodeURIComponent("This job is not available.")}`);

  const supabase = await createClient();
  if(!await matchingVerifiedAccountEmail(supabase,identity.userId,String(formData.get("confirm_email")??"")))
   redirect(path+"?error="+encodeURIComponent("Confirm the verified email of your logged-in VetConnect account before applying."));
  const verificationQuery = careerRole === "veterinarian"
    ? supabase.from("veterinarian_profiles").select("verification_status").eq("user_id", identity.userId).maybeSingle()
    : supabase.from("professional_profiles").select("verification_status").eq("user_id", identity.userId).maybeSingle();
  const { data: careerProfile, error: verificationError } = await verificationQuery;

  if (verificationError || careerProfile?.verification_status !== "approved") {
    redirect(`${path}?error=${encodeURIComponent("Your career profile needs approval before applying. Open My VetConnect > Professional workspace.")}`);
  }

  const selectedCv = String(formData.get("cv_choice") ?? "").trim();
  const source = selectedCv === "profile_cv" ? "profile_cv" : selectedCv.startsWith("saved:") ? "saved_cv" : "";
  const cvId = source === "saved_cv" ? selectedCv.slice(6) : "";
  if (!["saved_cv","profile_cv"].includes(source)) {
    redirect(path+"?error="+encodeURIComponent("Select a saved CV or your VetConnect CV profile before applying."));
  }
  let documentId: string | null = null;
  let snapshot: Record<string,string | null> | null = null;
  if (source === "saved_cv") {
    const {data:document,error:cvError} = await supabase.from("career_documents")
      .select("id").eq("id",cvId)
      .eq("professional_user_id",identity.userId).eq("document_type","cv").maybeSingle();
    if (cvError || !document)
      redirect(path+"?error="+encodeURIComponent("Please choose your own saved CV."));
    documentId=document.id;
  } else {
    const {data:cv,error:cvError}=await supabase.from("career_cv_profiles")
      .select("full_name,contact_email,phone,headline,education,experience,skills")
      .eq("user_id",identity.userId).maybeSingle();
    if(cvError || !cv?.full_name)
      redirect(path+"?error="+encodeURIComponent("Create and save your VetConnect CV first."));
    snapshot=cv;
  }
  const {data:jobStatus,error:jobError}=await supabase.from("public_jobs")
    .select("id,deadline").eq("id",jobId).maybeSingle();
  if(jobError || !jobStatus || (jobStatus.deadline && jobStatus.deadline<new Date().toISOString().slice(0,10)))
    redirect(path+"?error="+encodeURIComponent("This job is no longer accepting applications."));

  const {data:application,error} = await supabase.from("job_applications").insert({
    job_id: jobId,
    candidate_user_id: identity.userId,
    cover_note: coverNote.slice(0,3000) || null,
    cv_source: source,
    cv_document_id: documentId,
    cv_snapshot: snapshot,
  }).select("id").single();
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  if(application)await notifyEmployerApplication(jobId,application.id);
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
