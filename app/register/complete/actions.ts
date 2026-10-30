"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { persistRegisteredCategoryDetails } from "@/lib/registration-persistence";
import {
  REGISTRATION_EVIDENCE_BUCKET,
  isAcceptedEvidenceFile,
  isValidPakistaniCnic,
  registrationEvidenceRequirements,
} from "@/lib/registration-evidence";
import { notifyRegistrationSubmitted } from "@/lib/registration-notifications";

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "evidence";
function signatureMatches(type: string, b: Uint8Array): boolean {
  if (type === "application/pdf") return b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  if (type === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b.length >= 8 && b.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  return false;
}
async function currentRegistration() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?next=/register/complete");
  const [{ data: profile }, { data: gate }] = await Promise.all([
    supabase.from("profiles").select("primary_role").eq("id", data.user.id).maybeSingle(),
    supabase.from("registration_completion_gate").select("registration_intent,student_track,review_status,cnic_number,completed_at").eq("user_id", data.user.id).maybeSingle(),
  ]);
  if (!profile?.primary_role || !gate) redirect("/register/complete?error=Registration%20record%20not%20found.");
  if (gate.review_status === "approved") redirect("/dashboard");
  if (gate.completed_at && gate.review_status === "pending") redirect("/register/status");
  return { supabase, user: data.user, role: profile.primary_role, gate };
}

export async function saveRegistrationCnicAction(formData: FormData) {
  const { supabase, user, gate } = await currentRegistration();
  const cnic = String(formData.get("cnic_number") ?? "").replace(/-/g, "").trim();
  if (!isValidPakistaniCnic(cnic)) return;
  if (gate.completed_at && gate.review_status !== "rejected") throw new Error("Your CNIC cannot be edited while a submission is under review.");
  const { data, error } = await supabase.from("registration_completion_gate").update({ cnic_number: cnic }).eq("user_id", user.id).select("user_id").maybeSingle();
  if (error || !data) throw new Error("CNIC could not be saved securely. Please retry.");
  revalidatePath("/register/complete");
}

export async function saveRegistrationEvidenceDraftAction(formData: FormData) {
  const { supabase, user, role, gate } = await currentRegistration();
  const type = String(formData.get("type") ?? ""), path = String(formData.get("path") ?? "");
  const filename = safeName(String(formData.get("filename") ?? ""));
  const requirements = registrationEvidenceRequirements(role, gate.registration_intent, gate.student_track);
  const allowed = new Set(["cnic_front", "cnic_back", ...requirements.map((item) => item.type)]);
  if (!allowed.has(type) || !path.startsWith(user.id + "/") || !filename) throw new Error("This file does not match your registration.");
  const requirement = requirements.find((item) => item.type === type);
  const { data: blob, error: downloadError } = await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).download(path);
  if (downloadError || !blob) throw new Error("The private upload could not be verified.");
  const contentType = blob.type.toLowerCase();
  const imageOnly = Boolean(requirement?.imageOnly);
  if (!isAcceptedEvidenceFile(contentType, blob.size, imageOnly)) {
    throw new Error(imageOnly ? "Profile photos and company logos must be JPG, PNG or WebP and no larger than 5 MB." : "Documents must be PDF, JPG, PNG or WebP and no larger than 8 MB.");
  }
  if (!signatureMatches(contentType, new Uint8Array(await blob.arrayBuffer()))) throw new Error("The file contents do not match its file type.");
  const { error } = await supabase.from("registration_evidence").insert({
    user_id: user.id, document_type: type, cnic_number: gate.cnic_number, storage_path: path,
    original_filename: filename, content_type: contentType, file_size: blob.size, verification_status: "draft",
  });
  if (error) throw new Error("Your draft document could not be saved. Please retry.");
  revalidatePath("/register/complete");
}

export async function completeRegistrationAction() {
  const { supabase, user, gate } = await currentRegistration();
  if (!isValidPakistaniCnic(gate.cnic_number ?? "")) redirect("/register/complete?error=Please%20enter%20a%20valid%20CNIC%20number.");
  const { data: profile } = await supabase.from("profiles").select("primary_role").eq("id", user.id).maybeSingle();
  const issue = await persistRegisteredCategoryDetails(supabase, user.id, user.user_metadata);
  if (issue) redirect("/register/complete?error=" + encodeURIComponent(issue));
  const { error } = await supabase.rpc("complete_registration_submission");
  if (error) redirect("/register/complete?error=" + encodeURIComponent(error.message));
  await supabase.auth.updateUser({ data: { registration_details_pending: false } });
  await notifyRegistrationSubmitted({ email: user.email ?? "", name: String(user.user_metadata?.full_name ?? user.user_metadata?.organization_name ?? user.email ?? "New registrant"), category: String(profile?.primary_role ?? "member"), userId: user.id });
  redirect("/register/status");
}

export async function saveRegistrationProfileDraftAction(formData: FormData) {
  const { supabase, user, role } = await currentRegistration();
  if (!["veterinarian", "candidate", "professional"].includes(role)) throw new Error("This category does not use a professional experience draft.");
  const draft: Record<string, string> = {};
  for (const key of ["current_designation", "current_workplace", "professional_summary", "experience_years"]) {
    const value = String(formData.get(key) ?? "").trim();
    const limit = key === "professional_summary" ? 250 : 180;
    if (value.length > limit || /[<>\u0000-\u001f]/.test(value)) throw new Error("Please check your professional details.");
    draft[key] = value;
  }
  if (draft.experience_years && (!/^\d{1,2}$/.test(draft.experience_years) || Number(draft.experience_years) > 80)) throw new Error("Experience must be a whole number from 0 to 80.");
  const metadata = { ...user.user_metadata, ...draft };
  const issue = await persistRegisteredCategoryDetails(supabase, user.id, metadata);
  if (issue) throw new Error(issue);
  const { error } = await supabase.auth.updateUser({ data: draft });
  if (error) throw new Error("Your private profile was saved but account synchronization failed. Please retry before submitting.");
  revalidatePath("/register/complete");
  redirect("/register/complete?message=Professional%20draft%20saved.");
}
