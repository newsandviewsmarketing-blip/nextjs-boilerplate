import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload";
}

export function uploadedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

export async function uploadPublicImage(
  supabase: SupabaseClient,
  file: File | null,
  ownerUserId: string,
  entityType: string,
) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG or WebP image.");

  const path = `${ownerUserId}/admin/${entityType}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from("profile-media").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
}

export async function uploadPrivateDocument(
  supabase: SupabaseClient,
  file: File | null,
  ownerUserId: string,
  entityType: string,
  documentKind: string,
) {
  if (!file) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error("Document must be 10 MB or smaller.");
  if (!DOCUMENT_TYPES.has(file.type)) throw new Error("Use PDF, DOC, DOCX, JPG, PNG or WebP files.");

  const path = `${ownerUserId}/${entityType}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from("record-documents").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return {
    storagePath: path,
    originalName: file.name,
    mimeType: file.type || null,
    documentKind,
  };
}

export async function recordUploadedDocument(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  createdBy: string,
  uploaded: Awaited<ReturnType<typeof uploadPrivateDocument>>,
) {
  if (!uploaded) return;
  const { error } = await supabase.from("admin_record_documents").insert({
    entity_type: entityType,
    entity_id: entityId,
    document_kind: uploaded.documentKind,
    original_name: uploaded.originalName,
    mime_type: uploaded.mimeType,
    storage_path: uploaded.storagePath,
    created_by: createdBy,
  });
  if (error) throw error;
}
