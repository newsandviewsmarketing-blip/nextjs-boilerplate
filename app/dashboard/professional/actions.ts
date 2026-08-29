"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const eligibleRoles = new Set(["veterinarian", "professional", "candidate"]);

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function workspaceMessage(kind: "error" | "message", message: string) {
  return `/dashboard/professional?${kind}=${encodeURIComponent(message)}`;
}

async function requireProfessionalUser() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/professional");
  if (!identity.roles.some((role) => eligibleRoles.has(role))) {
    redirect("/dashboard?error=Professional%20workspace%20is%20not%20available%20for%20this%20account.");
  }
  return identity;
}

async function ensureProfessionalProfile(userId: string) {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("professional_profiles")
    .select("user_id, slug")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing) return existing;

  const slug = `professional-${userId.replaceAll("-", "")}`;
  const { data, error } = await supabase
    .from("professional_profiles")
    .insert({ user_id: userId, slug, professional_type: "Animal Health Professional" })
    .select("user_id, slug")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

function publicVisibility(value: string) {
  return ["owner_only", "registered_users", "authorized_company", "public"].includes(value)
    ? value
    : "owner_only";
}

export async function updateProfessionalProfileAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const supabase = await createClient();

  try {
    await ensureProfessionalProfile(identity.userId);
  } catch (error) {
    redirect(workspaceMessage("error", error instanceof Error ? error.message : "Professional profile could not be created."));
  }

  const skills = text(formData, "skills")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const years = Number(text(formData, "years_experience") || 0);
  if (!Number.isFinite(years) || years < 0 || years > 80) {
    redirect(workspaceMessage("error", "Years of experience must be between 0 and 80."));
  }

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      professional_type: text(formData, "professional_type") || "Animal Health Professional",
      headline: nullableText(formData, "headline"),
      public_summary: nullableText(formData, "public_summary"),
      current_position: nullableText(formData, "current_position"),
      organization_name: nullableText(formData, "organization_name"),
      years_experience: years,
      skills,
      profile_visibility: publicVisibility(text(formData, "profile_visibility")),
    })
    .eq("user_id", identity.userId);

  if (error) redirect(workspaceMessage("error", error.message));

  revalidatePath("/dashboard/professional");
  revalidatePath("/professionals");
  redirect(workspaceMessage("message", "Professional profile updated."));
}

export async function uploadProfessionalPhotoAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    redirect(workspaceMessage("error", "Choose a profile photograph first."));
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(workspaceMessage("error", "Profile photograph must be 5 MB or smaller."));
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[file.type];
  if (!extension) {
    redirect(workspaceMessage("error", "Use a JPG, PNG or WebP photograph."));
  }

  const supabase = await createClient();
  try {
    await ensureProfessionalProfile(identity.userId);
  } catch (error) {
    redirect(workspaceMessage("error", error instanceof Error ? error.message : "Professional profile could not be created."));
  }

  const objectPath = `${identity.userId}/profile-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(objectPath, file, { contentType: file.type, upsert: false });

  if (uploadError) redirect(workspaceMessage("error", uploadError.message));

  const { data: publicUrlData } = supabase.storage.from("profile-media").getPublicUrl(objectPath);
  const imageUrl = publicUrlData.publicUrl;

  const { error: profileError } = await supabase
    .from("professional_profiles")
    .update({ image_url: imageUrl })
    .eq("user_id", identity.userId);

  if (profileError) redirect(workspaceMessage("error", profileError.message));

  if (identity.roles.includes("veterinarian")) {
    await supabase
      .from("veterinarian_profiles")
      .update({ image_url: imageUrl })
      .eq("user_id", identity.userId);
  }

  revalidatePath("/dashboard/professional");
  revalidatePath("/professionals");
  revalidatePath("/vets");
  redirect(workspaceMessage("message", "Profile photograph uploaded."));
}

export async function addEducationAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const degree = text(formData, "degree");
  if (!degree) redirect(workspaceMessage("error", "Degree or qualification is required."));

  const supabase = await createClient();
  const { error } = await supabase.from("professional_education").insert({
    professional_user_id: identity.userId,
    degree,
    institution: nullableText(formData, "institution"),
    field_of_study: nullableText(formData, "field_of_study"),
    start_date: nullableText(formData, "start_date"),
    end_date: formData.get("is_current") === "on" ? null : nullableText(formData, "end_date"),
    is_current: formData.get("is_current") === "on",
    visibility: publicVisibility(text(formData, "visibility")),
  });

  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Education record added."));
}

export async function deleteEducationAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("professional_education")
    .delete()
    .eq("id", id)
    .eq("professional_user_id", identity.userId);
  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Education record removed."));
}

export async function addExperienceAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const organizationName = text(formData, "organization_name");
  const designation = text(formData, "designation");
  if (!organizationName || !designation) {
    redirect(workspaceMessage("error", "Organization and designation are required."));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("professional_experience").insert({
    professional_user_id: identity.userId,
    organization_name: organizationName,
    designation,
    responsibilities: nullableText(formData, "responsibilities"),
    start_date: nullableText(formData, "start_date"),
    end_date: formData.get("is_current") === "on" ? null : nullableText(formData, "end_date"),
    is_current: formData.get("is_current") === "on",
    visibility: publicVisibility(text(formData, "visibility")),
  });

  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Experience record added."));
}

export async function deleteExperienceAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("professional_experience")
    .delete()
    .eq("id", id)
    .eq("professional_user_id", identity.userId);
  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Experience record removed."));
}

export async function addCredentialAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const credentialType = text(formData, "credential_type");
  if (!credentialType) redirect(workspaceMessage("error", "Credential type is required."));

  const supabase = await createClient();
  const { error } = await supabase.from("professional_credentials").insert({
    professional_user_id: identity.userId,
    credential_type: credentialType,
    issuing_authority: nullableText(formData, "issuing_authority"),
    credential_number: nullableText(formData, "credential_number"),
    visibility: publicVisibility(text(formData, "visibility")),
  });

  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Credential submitted for review."));
}

export async function deleteCredentialAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("professional_credentials")
    .delete()
    .eq("id", id)
    .eq("professional_user_id", identity.userId);
  if (error) redirect(workspaceMessage("error", error.message));
  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Credential removed."));
}

export async function uploadCareerDocumentAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    redirect(workspaceMessage("error", "Choose a CV or career document first."));
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(workspaceMessage("error", "Career document must be 10 MB or smaller."));
  }

  const extensionByType: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  const extension = extensionByType[file.type];
  if (!extension) redirect(workspaceMessage("error", "Use PDF, DOC or DOCX format."));

  const supabase = await createClient();
  const objectPath = `${identity.userId}/${text(formData, "document_type") || "cv"}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("career-documents")
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect(workspaceMessage("error", uploadError.message));

  const { error } = await supabase.from("career_documents").insert({
    professional_user_id: identity.userId,
    document_type: text(formData, "document_type") || "cv",
    file_path: objectPath,
    visibility: publicVisibility(text(formData, "visibility")),
    is_current: true,
  });
  if (error) redirect(workspaceMessage("error", error.message));

  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Career document uploaded."));
}

export async function deleteCareerDocumentAction(formData: FormData) {
  const identity = await requireProfessionalUser();
  const id = text(formData, "id");
  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("career_documents")
    .select("file_path")
    .eq("id", id)
    .eq("professional_user_id", identity.userId)
    .maybeSingle();
  if (readError) redirect(workspaceMessage("error", readError.message));

  if (row?.file_path) {
    await supabase.storage.from("career-documents").remove([row.file_path]);
  }

  const { error } = await supabase
    .from("career_documents")
    .delete()
    .eq("id", id)
    .eq("professional_user_id", identity.userId);
  if (error) redirect(workspaceMessage("error", error.message));

  revalidatePath("/dashboard/professional");
  redirect(workspaceMessage("message", "Career document removed."));
}
