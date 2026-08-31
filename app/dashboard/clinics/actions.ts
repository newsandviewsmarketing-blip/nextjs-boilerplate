"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const eligibleRoles = new Set([
  "veterinarian",
  "professional",
  "company",
]);
function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function list(formData: FormData, name: string) {
  return text(formData, name)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "veterinary-clinic";
}

async function requireClinicUser(next = "/dashboard/clinics") {
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!identity.roles.some((role) => eligibleRoles.has(role))) {
    redirect("/dashboard?error=Clinic%20workspace%20is%20available%20to%20veterinary%20professionals.");
  }
  return identity;
}

function routeMessage(path: string, kind: "error" | "message", message: string) {
  return `${path}?${kind}=${encodeURIComponent(message)}`;
}

export async function createClinicAction(formData: FormData) {
  const identity = await requireClinicUser();
  const clinicName = text(formData, "clinic_name");
  if (!clinicName) redirect(routeMessage("/dashboard/clinics", "error", "Clinic name is required."));

  const supabase = await createClient();
  const slug = `${slugify(clinicName)}-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase
    .from("clinics")
    .insert({
      owner_id: identity.userId,
      slug,
      clinic_name: clinicName,
      facility_type: text(formData, "facility_type") || "Veterinary Clinic",
      description: nullableText(formData, "description"),
      province: nullableText(formData, "province"),
      district: nullableText(formData, "district"),
      tehsil: nullableText(formData, "tehsil"),
      city: nullableText(formData, "city"),
      address: nullableText(formData, "address"),
      public_phone: nullableText(formData, "public_phone"),
      public_email: nullableText(formData, "public_email"),
      website: nullableText(formData, "website"),
      working_hours: nullableText(formData, "working_hours"),
      emergency_service: formData.get("emergency_service") === "on",
      services: list(formData, "services"),
      species: list(formData, "species"),
      verification_status: "pending",
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(routeMessage("/dashboard/clinics", "error", error?.message || "Clinic could not be created."));
  }

  revalidatePath("/dashboard/clinics");
  redirect(routeMessage(`/dashboard/clinics/${data.id}`, "message", "Clinic created. Complete the profile and submit it for verification."));
}

export async function updateClinicAction(formData: FormData) {
  const id = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${id}`;
  const identity = await requireClinicUser(path);
  if (!id) redirect(routeMessage("/dashboard/clinics", "error", "Clinic record is missing."));

  const clinicName = text(formData, "clinic_name");
  if (!clinicName) redirect(routeMessage(path, "error", "Clinic name is required."));

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      clinic_name: clinicName,
      facility_type: text(formData, "facility_type") || "Veterinary Clinic",
      description: nullableText(formData, "description"),
      province: nullableText(formData, "province"),
      district: nullableText(formData, "district"),
      tehsil: nullableText(formData, "tehsil"),
      city: nullableText(formData, "city"),
      address: nullableText(formData, "address"),
      public_phone: nullableText(formData, "public_phone"),
      public_email: nullableText(formData, "public_email"),
      website: nullableText(formData, "website"),
      working_hours: nullableText(formData, "working_hours"),
      emergency_service: formData.get("emergency_service") === "on",
      services: list(formData, "services"),
      species: list(formData, "species"),
    })
    .eq("id", id)
    .eq("owner_id", identity.userId);

  if (error) redirect(routeMessage(path, "error", error.message));
  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(routeMessage(path, "message", "Clinic profile saved and returned to verification review if substantive details changed."));
}

export async function uploadClinicMediaAction(formData: FormData) {
  const id = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${id}`;
  const identity = await requireClinicUser(path);
  const file = formData.get("media");
  const mediaType = text(formData, "media_type") === "cover" ? "cover" : "logo";

  if (!(file instanceof File) || file.size === 0) {
    redirect(routeMessage(path, "error", "Choose an image first."));
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(routeMessage(path, "error", "Clinic image must be 5 MB or smaller."));
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[file.type];
  if (!extension) redirect(routeMessage(path, "error", "Use JPG, PNG or WebP format."));

  const supabase = await createClient();
  const objectPath = `${identity.userId}/clinic-${id}-${mediaType}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect(routeMessage(path, "error", uploadError.message));

  const { data } = supabase.storage.from("profile-media").getPublicUrl(objectPath);
  const field = mediaType === "cover" ? "cover_image_url" : "logo_url";
  const { error } = await supabase
    .from("clinics")
    .update({ [field]: data.publicUrl })
    .eq("id", id)
    .eq("owner_id", identity.userId);
  if (error) redirect(routeMessage(path, "error", error.message));

  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(routeMessage(path, "message", `${mediaType === "cover" ? "Cover image" : "Clinic logo"} uploaded.`));
}

export async function addClinicServiceAction(formData: FormData) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const serviceId = text(formData, "service_id");
  if (!serviceId) redirect(routeMessage(path, "error", "Choose a service."));

  const feeMin = text(formData, "fee_min");
  const feeMax = text(formData, "fee_max");
  const duration = text(formData, "duration_minutes");
  const supabase = await createClient();
  const { error } = await supabase.from("clinic_services").upsert(
    {
      clinic_id: clinicId,
      service_id: serviceId,
      description: nullableText(formData, "description"),
      fee_min: feeMin ? Number(feeMin) : null,
      fee_max: feeMax ? Number(feeMax) : null,
      currency: "PKR",
      duration_minutes: duration ? Number(duration) : null,
      is_public: formData.get("is_public") === "on",
      is_active: true,
      booking_enabled: formData.get("booking_enabled") === "on",
    },
    { onConflict: "clinic_id,service_id" },
  );

  if (error) redirect(routeMessage(path, "error", error.message));
  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(routeMessage(path, "message", "Clinic service saved."));
}

export async function removeClinicServiceAction(formData: FormData) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const id = text(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_services")
    .delete()
    .eq("id", id)
    .eq("clinic_id", clinicId);
  if (error) redirect(routeMessage(path, "error", error.message));
  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(routeMessage(path, "message", "Clinic service removed."));
}

export async function requestClinicMembershipAction(formData: FormData) {
  const clinicId = text(formData, "clinic_id");
  const slug = text(formData, "slug");
  const path = `/clinics/${encodeURIComponent(slug)}`;
  await requireClinicUser(path);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_clinic_membership", {
    p_clinic_id: clinicId,
    p_designation: nullableText(formData, "designation"),
    p_is_public: formData.get("is_public") === "on",
  });
  if (error) redirect(routeMessage(path, "error", error.message));
  revalidatePath(path);
  revalidatePath("/dashboard/clinics");
  redirect(routeMessage(path, "message", "Clinic affiliation request submitted."));
}
