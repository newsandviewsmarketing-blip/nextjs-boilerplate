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

  const evidence = formData.getAll("evidence").map((entry) => {
    try {
      return JSON.parse(String(entry)) as { type: string; path: string; filename: string };
    } catch {
      return null;
    }
  });
  const paths = evidence.filter((item): item is { type: string; path: string; filename: string } =>
    Boolean(item && typeof item.path === "string" && item.path.startsWith(user.id + "/"))
  ).map((item) => item.path);
  const cleanup = async () => {
    if (paths.length) await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).remove(paths);
  };
  const fail = async (message: string): Promise<never> => {
    await cleanup();
    redirect("/register/complete?error=" + encodeURIComponent(message));
  };

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("primary_role").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.primary_role) return fail("We could not load your registration category. Please sign in again or contact support.");

  const intent = user.user_metadata?.registration_intent === "clinic" ? "clinic" : "";
  const track = typeof user.user_metadata?.student_track === "string" ? user.user_metadata.student_track : "";
  const requirements = registrationEvidenceRequirements(profile.primary_role, intent, track);
  const requiredTypes = [...requirements.map((item) => item.type), "cnic_front", "cnic_back"];
  const cnic = String(formData.get("cnic_number") ?? "").trim();
  if (!isValidPakistaniCnic(cnic)) return fail("Enter a valid 13-digit CNIC in 12345-1234567-1 format.");
  if (evidence.some((item) => !item) || evidence.length !== requiredTypes.length) return fail("Submit every required document.");
  const byType = new Map<string, { type: string; path: string; filename: string }>(evidence.map((item) => [item!.type, item!] as const));
  if (new Set(evidence.map((item) => item?.type)).size !== requiredTypes.length ||
      requiredTypes.some((type) => !byType.has(type))) return fail("The uploaded documents do not match your registration category.");

  const rows = [];
  for (const type of requiredTypes) {
    const item = byType.get(type)!;
    if (typeof item.path !== "string" || !item.path.startsWith(user.id + "/") ||
        typeof item.filename !== "string" ||
        !ACCEPTED_REGISTRATION_EVIDENCE_TYPES.some((accepted) => item.filename.toLowerCase().endsWith(accepted === "application/pdf" ? ".pdf" : accepted === "image/jpeg" ? ".jpg" : accepted === "image/png" ? ".png" : ".webp"))) {
      return fail("A private document could not be verified. Please re-upload the required files.");
    }
    const { data: blob, error: downloadError } = await supabase.storage.from(REGISTRATION_EVIDENCE_BUCKET).download(item.path);
    if (downloadError || !blob) return fail("A private document is missing. Please re-upload the required files.");
    const contentType = blob.type.toLowerCase();
    if (!ACCEPTED_REGISTRATION_EVIDENCE_TYPES.includes(contentType as (typeof ACCEPTED_REGISTRATION_EVIDENCE_TYPES)[number]) ||
        blob.size <= 0 || blob.size > MAX_REGISTRATION_EVIDENCE_BYTES) return fail("Each document must be a PDF, JPG, PNG or WebP file no larger than 8 MB.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!signatureMatches(contentType, bytes)) return fail("A document's content does not match its file type.");
    rows.push({
      user_id: user.id,
      document_type: type,
      cnic_number: cnic.replace(/-/g, ""),
      storage_path: item.path,
      original_filename: safeName(item.filename),
      content_type: contentType,
      file_size: blob.size,
      verification_status: "pending",
    });
  }

  const { error: insertError } = await supabase.from("registration_evidence").insert(rows);
  if (insertError) return fail("Your private documents could not be recorded. Please retry. " + insertError.message);

  const { error: gateError } = await supabase.rpc("complete_registration_submission");
  if (gateError) {
    await supabase.from("registration_evidence").delete().eq("user_id", user.id).in("storage_path", paths);
    await cleanup();
    redirect("/register/complete?error=" + encodeURIComponent("Your required documents could not complete registration. " + gateError.message));
  }

  const issue = await persistRegisteredCategoryDetails(supabase, user.id, user.user_metadata);
  if (issue) {
    await supabase.from("registration_evidence").delete().eq("user_id", user.id).in("storage_path", paths);
    await cleanup();
    redirect("/register/complete?error=" + encodeURIComponent(issue));
  }

  await supabase.auth.updateUser({ data: { registration_details_pending: false } });
  redirect("/dashboard?message=" + encodeURIComponent("Registration submitted with private documents. Your account and credentials remain subject to review."));
}
