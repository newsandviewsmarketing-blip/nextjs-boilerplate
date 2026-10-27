"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { persistRegisteredCategoryDetails } from "@/lib/registration-persistence";
import {
  ACCEPTED_REGISTRATION_EVIDENCE_TYPES,
  MAX_REGISTRATION_EVIDENCE_BYTES,
  REGISTRATION_EVIDENCE_BUCKET,
  isValidPakistaniCnic,
  registrationEvidenceRequirements,
} from "@/lib/registration-evidence";

const fail = (message: string): never => redirect("/register/complete?error=" + encodeURIComponent(message));
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "evidence";

function signatureMatches(type: string, bytes: Uint8Array): boolean {
  if (type === "application/pdf") return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function completeRegistrationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) redirect("/login?next=/register/complete");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("primary_role").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.primary_role) fail("We could not load your registration category. Please sign in again or contact support.");

  const intent = user.user_metadata?.registration_intent === "clinic" ? "clinic" : "";
  const track = typeof user.user_metadata?.student_track === "string" ? user.user_metadata.student_track : "";
  const requirements = registrationEvidenceRequirements(profile.primary_role, intent, track);
  const cnic = String(formData.get("cnic_number") ?? "").trim();
  if (!isValidPakistaniCnic(cnic)) fail("Enter a valid 13-digit CNIC in 12345-1234567-1 format.");

  const selected: Array<{ type: string; file: File }> = [];
  for (const requirement of requirements) {
    const value = formData.get(requirement.type);
    if (!(value instanceof File) || value.size === 0) fail("Upload the required file: " + requirement.label + ".");
    if (!ACCEPTED_REGISTRATION_EVIDENCE_TYPES.includes(value.type as (typeof ACCEPTED_REGISTRATION_EVIDENCE_TYPES)[number])) fail("Use a PDF, JPG, PNG or WebP file for " + requirement.label + ".");
    if (value.size > MAX_REGISTRATION_EVIDENCE_BYTES) fail("Each registration document must be 8 MB or smaller.");
    const bytes = new Uint8Array(await value.arrayBuffer());
    if (!signatureMatches(value.type, bytes)) fail("The file content does not match its selected format for " + requirement.label + ".");
    selected.push({ type: requirement.type, file: value });
  }

  const cnicFront = formData.get("cnic_front");
  const cnicBack = formData.get("cnic_back");
  for (const [label, file] of [["CNIC front", cnicFront], ["CNIC back", cnicBack]] as const) {
    if (!(file instanceof File) || file.size === 0) fail("Upload the " + label + " image.");
    if (!ACCEPTED_REGISTRATION_EVIDENCE_TYPES.includes(file.type as (typeof ACCEPTED_REGISTRATION_EVIDENCE_TYPES)[number])) fail("Use a PDF, JPG, PNG or WebP file for " + label + ".");
    if (file.size > MAX_REGISTRATION_EVIDENCE_BYTES) fail("Each registration document must be 8 MB or smaller.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!signatureMatches(file.type, bytes)) fail("The file content does not match its selected format for " + label + ".");
    selected.push({ type: label === "CNIC front" ? "cnic_front" : "cnic_back", file });
  }

  const uploaded: string[] = [];
  const rows = [];
  for (const item of selected) {
    const path = user.id + "/" + crypto.randomUUID() + "-" + safeName(item.file.name);
    const { error } = await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET)
      .upload(path, item.file, { contentType: item.file.type, upsert: false });
    if (error) {
      if (uploaded.length) await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).remove(uploaded);
      fail("A private document upload failed. Please retry. " + error.message);
    }
    uploaded.push(path);
    rows.push({
      user_id: user.id,
      document_type: item.type,
      cnic_number: cnic.replace(/-/g, ""),
      storage_path: path,
      original_filename: safeName(item.file.name),
      content_type: item.file.type,
      file_size: item.file.size,
      verification_status: "pending",
    });
  }

  const { error: insertError } = await supabase.from("registration_evidence").insert(rows);
  if (insertError) {
    await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).remove(uploaded);
    fail("Your private documents could not be recorded. Please retry. " + insertError.message);
  }

  const issue = await persistRegisteredCategoryDetails(supabase, user.id, user.user_metadata);
  if (issue) {
    await supabase.from("registration_evidence").delete().eq("user_id", user.id).in("storage_path", uploaded);
    await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).remove(uploaded);
    fail(issue);
  }

  const { error: metadataError } = await supabase.auth.updateUser({ data: { registration_details_pending: false } });
  if (metadataError) fail("Your documents were saved privately, but registration could not be finalized. Please retry or contact support.");
  redirect("/dashboard?message=" + encodeURIComponent("Registration submitted with private documents. Your account and credentials remain subject to review."));
}
