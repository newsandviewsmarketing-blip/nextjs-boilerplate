"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {matchingVerifiedAccountEmail} from "@/lib/career-email-verification";
import {inspectCvFile,notifyEmployerApplication} from "@/lib/guest-job-applications";

export async function applyToJobAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const jobId = String(formData.get("job_id") ?? "");
  let coverNote = String(formData.get("cover_note") ?? "").trim();
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
  if(formData.get('use_saved_letter')==='on'){
    const {data:letter,error:letterError}=await supabase.from('career_cover_letters').select('body_text').eq('user_id',identity.userId).maybeSingle();
    if(letterError||!letter?.body_text)redirect(path+'?error='+encodeURIComponent('Create and save your cover letter before selecting it.'));
    coverNote=letter.body_text;
  }
  const selectedCv = String(formData.get("cv_choice") ?? "").trim();
  const source = selectedCv === "upload_cv" ? "saved_cv" : selectedCv === "profile_cv" ? "profile_cv" : selectedCv.startsWith("saved:") ? "saved_cv" : "";
  const cvId = source === "saved_cv" ? selectedCv.slice(6) : "";
  if (!["saved_cv","profile_cv"].includes(source)) {
    redirect(path+"?error="+encodeURIComponent("Select a saved CV or your VetConnect CV profile before applying."));
  }
  let documentId: string | null = null;
  let snapshot: Record<string,string | null> | null = null;
  let uploadedPath: string | null = null;
  if (selectedCv === "upload_cv") {
    const file = formData.get("cv_file");
    if (!(file instanceof File) || !file.size)
      redirect(path+"?error="+encodeURIComponent("Choose a CV file to upload with your application."));
    let validated: Awaited<ReturnType<typeof inspectCvFile>>;
    try { validated = await inspectCvFile(file); }
    catch (error) {
      redirect(path+"?error="+encodeURIComponent(error instanceof Error ? error.message : "Invalid CV file."));
    }
    const filePath = identity.userId+"/cv/"+randomUUID()+"."+validated.ext;
    const {error:storageError} = await supabase.storage.from("career-documents").upload(filePath,file,{contentType:validated.mime,upsert:false});
    if(storageError)redirect(path+"?error="+encodeURIComponent("Could not upload your CV. Please retry."));
    uploadedPath=filePath;
    const {data:doc,error:documentError} = await supabase.from("career_documents").insert({
      professional_user_id:identity.userId,document_type:"cv",file_path:filePath,
      template_type:"uploaded",is_current:true,visibility:"owner_only"
    }).select("id").single();
    if(documentError || !doc){
      await supabase.storage.from("career-documents").remove([filePath]);
      redirect(path+"?error="+encodeURIComponent("CV could not be saved privately. Please retry."));
    }
    documentId=doc.id;
  } else if (source === "saved_cv") {
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
  if (error) {
    // A failed application must not leave a newly uploaded CV orphaned.
    if (uploadedPath && documentId) {
      await supabase.from("career_documents").delete().eq("id",documentId).eq("professional_user_id",identity.userId);
      await supabase.storage.from("career-documents").remove([uploadedPath]);
    }
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }
  if(uploadedPath && documentId){
    await supabase.from("career_documents").update({is_current:false})
      .eq("professional_user_id",identity.userId).eq("document_type","cv").neq("id",documentId);
  }
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
