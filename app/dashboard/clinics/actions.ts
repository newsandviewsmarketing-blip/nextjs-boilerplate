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

const appointmentStatuses = new Set([
  "new",
  "contacted",
  "scheduled",
  "completed",
  "declined",
  "closed",
]);

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    redirect(
      "/dashboard?error=Clinic%20workspace%20is%20not%20available%20for%20this%20account.",
    );
  }
  return identity;
}

function routeMessage(
  path: string,
  kind: "error" | "message",
  message: string,
) {
  return `${path}?${kind}=${encodeURIComponent(message)}`;
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export async function createClinicAction(formData: FormData) {
  const identity = await requireClinicUser();
  const clinicName = text(formData, "clinic_name");
  if (!clinicName) {
    redirect(
      routeMessage(
        "/dashboard/clinics",
        "error",
        "Clinic name is required.",
      ),
    );
  }

  const supabase = await createClient();
  const slug = `${slugify(clinicName)}-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase
    .from("clinics")
    .insert({
      owner_id: identity.userId,
      slug,
      clinic_name: clinicName,
      facility_type:
        text(formData, "facility_type") || "Veterinary Clinic",
      description: nullableText(formData, "description"),
      province: nullableText(formData, "province"),
      district: nullableText(formData, "district"),
      tehsil: nullableText(formData, "tehsil"),
      city: nullableText(formData, "city"),
      address: nullableText(formData, "address"),
      public_phone: nullableText(formData, "public_phone"),
      public_email: nullableText(formData, "public_email"),
      website: nullableText(formData, "website"),
      working_hours: null,
      emergency_service:
        formData.get("emergency_service") === "on",
      services: list(formData, "services"),
      species: list(formData, "species"),
      verification_status: "pending",
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(
      routeMessage(
        "/dashboard/clinics",
        "error",
        error?.message || "Clinic could not be created.",
      ),
    );
  }

  revalidatePath("/dashboard/clinics");
  redirect(
    routeMessage(
      `/dashboard/clinics/${data.id}`,
      "message",
      "Clinic created. Complete the profile, weekly availability and team hierarchy before verification.",
    ),
  );
}

export async function updateClinicAction(formData: FormData) {
  const id = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${id}`;
  const identity = await requireClinicUser(path);
  if (!id) {
    redirect(
      routeMessage(
        "/dashboard/clinics",
        "error",
        "Clinic record is missing.",
      ),
    );
  }

  const clinicName = text(formData, "clinic_name");
  if (!clinicName) {
    redirect(
      routeMessage(path, "error", "Clinic name is required."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinics")
    .update({
      clinic_name: clinicName,
      facility_type:
        text(formData, "facility_type") || "Veterinary Clinic",
      description: nullableText(formData, "description"),
      province: nullableText(formData, "province"),
      district: nullableText(formData, "district"),
      tehsil: nullableText(formData, "tehsil"),
      city: nullableText(formData, "city"),
      address: nullableText(formData, "address"),
      public_phone: nullableText(formData, "public_phone"),
      public_email: nullableText(formData, "public_email"),
      website: nullableText(formData, "website"),
      emergency_service:
        formData.get("emergency_service") === "on",
      services: list(formData, "services"),
      species: list(formData, "species"),
    })
    .eq("id", id)
    .eq("owner_id", identity.userId);

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(
    routeMessage(
      path,
      "message",
      "Clinic profile saved and returned to verification review if substantive details changed.",
    ),
  );
}

export async function saveClinicAvailabilityAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  const identity = await requireClinicUser(path);

  if (!clinicId) {
    redirect(
      routeMessage(
        "/dashboard/clinics",
        "error",
        "Clinic record is missing.",
      ),
    );
  }

  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const isOpen =
      formData.get(`day_${dayOfWeek}_open`) === "on";
    const is24Hours =
      isOpen &&
      formData.get(`day_${dayOfWeek}_24h`) === "on";
    const opensAt = is24Hours
      ? null
      : nullableText(formData, `day_${dayOfWeek}_opens`);
    const closesAt = is24Hours
      ? null
      : nullableText(formData, `day_${dayOfWeek}_closes`);
    const breakStart = nullableText(
      formData,
      `day_${dayOfWeek}_break_start`,
    );
    const breakEnd = nullableText(
      formData,
      `day_${dayOfWeek}_break_end`,
    );
    const appointmentEnabled =
      isOpen &&
      formData.get(`day_${dayOfWeek}_appointments`) === "on";
    const slotRaw =
      Number(text(formData, `day_${dayOfWeek}_slot`) || 30);
    const slotMinutes =
      Number.isFinite(slotRaw) && slotRaw >= 5 && slotRaw <= 240
        ? Math.round(slotRaw)
        : 30;

    if (isOpen && !is24Hours) {
      const openMinutes = opensAt
        ? timeToMinutes(opensAt)
        : null;
      const closeMinutes = closesAt
        ? timeToMinutes(closesAt)
        : null;

      if (
        openMinutes === null ||
        closeMinutes === null ||
        openMinutes >= closeMinutes
      ) {
        redirect(
          routeMessage(
            path,
            "error",
            `${dayNames[dayOfWeek]} needs a valid opening and closing time.`,
          ),
        );
      }

      if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
        redirect(
          routeMessage(
            path,
            "error",
            `${dayNames[dayOfWeek]} break requires both start and end times.`,
          ),
        );
      }

      if (breakStart && breakEnd) {
        const breakStartMinutes = timeToMinutes(breakStart);
        const breakEndMinutes = timeToMinutes(breakEnd);
        if (
          breakStartMinutes === null ||
          breakEndMinutes === null ||
          breakStartMinutes >= breakEndMinutes ||
          breakStartMinutes < openMinutes ||
          breakEndMinutes > closeMinutes
        ) {
          redirect(
            routeMessage(
              path,
              "error",
              `${dayNames[dayOfWeek]} break must fall inside clinic hours.`,
            ),
          );
        }
      }
    }

    return {
      clinic_id: clinicId,
      day_of_week: dayOfWeek,
      is_open: isOpen,
      is_24_hours: is24Hours,
      opens_at: isOpen ? opensAt : null,
      closes_at: isOpen ? closesAt : null,
      break_start:
        isOpen && !is24Hours ? breakStart : null,
      break_end:
        isOpen && !is24Hours ? breakEnd : null,
      appointment_enabled: appointmentEnabled,
      slot_minutes: slotMinutes,
    };
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_availability")
    .upsert(rows, {
      onConflict: "clinic_id,day_of_week",
    });

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  const summary = rows
    .filter((row) => row.is_open)
    .map((row) => {
      if (row.is_24_hours) {
        return `${dayNames[row.day_of_week]} 24h`;
      }
      return `${dayNames[row.day_of_week]} ${row.opens_at?.slice(0, 5)}-${row.closes_at?.slice(0, 5)}`;
    })
    .join("; ");

  const { error: clinicError } = await supabase
    .from("clinics")
    .update({
      working_hours: summary || "By appointment / hours not published",
    })
    .eq("id", clinicId)
    .eq("owner_id", identity.userId);

  if (clinicError) {
    redirect(
      routeMessage(path, "error", clinicError.message),
    );
  }

  revalidatePath(path);
  revalidatePath("/clinics");
  revalidatePath("/dashboard/clinics");
  redirect(
    routeMessage(
      path,
      "message",
      "Weekly clinic availability and appointment hours saved.",
    ),
  );
}

export async function uploadClinicMediaAction(
  formData: FormData,
) {
  const id = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${id}`;
  const identity = await requireClinicUser(path);
  const file = formData.get("media");
  const mediaType =
    text(formData, "media_type") === "cover" ? "cover" : "logo";

  if (!(file instanceof File) || file.size === 0) {
    redirect(
      routeMessage(path, "error", "Choose an image first."),
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(
      routeMessage(
        path,
        "error",
        "Clinic image must be 5 MB or smaller.",
      ),
    );
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[file.type];
  if (!extension) {
    redirect(
      routeMessage(
        path,
        "error",
        "Use JPG, PNG or WebP format.",
      ),
    );
  }

  const supabase = await createClient();
  const objectPath = `${identity.userId}/clinic-${id}-${mediaType}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    redirect(routeMessage(path, "error", uploadError.message));
  }

  const { data } = supabase.storage
    .from("profile-media")
    .getPublicUrl(objectPath);
  const field =
    mediaType === "cover" ? "cover_image_url" : "logo_url";
  const { error } = await supabase
    .from("clinics")
    .update({ [field]: data.publicUrl })
    .eq("id", id)
    .eq("owner_id", identity.userId);
  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(
    routeMessage(
      path,
      "message",
      `${mediaType === "cover" ? "Cover image" : "Clinic logo"} uploaded.`,
    ),
  );
}

export async function addClinicServiceAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const serviceId = text(formData, "service_id");
  if (!serviceId) {
    redirect(
      routeMessage(path, "error", "Choose a service."),
    );
  }

  const feeMin = text(formData, "fee_min");
  const feeMax = text(formData, "fee_max");
  const duration = text(formData, "duration_minutes");
  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_services")
    .upsert(
      {
        clinic_id: clinicId,
        service_id: serviceId,
        description: nullableText(formData, "description"),
        fee_min: feeMin ? Number(feeMin) : null,
        fee_max: feeMax ? Number(feeMax) : null,
        currency: "PKR",
        duration_minutes: duration
          ? Number(duration)
          : null,
        is_public:
          formData.get("is_public") === "on",
        is_active: true,
        booking_enabled:
          formData.get("booking_enabled") === "on",
      },
      { onConflict: "clinic_id,service_id" },
    );

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }
  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(
    routeMessage(path, "message", "Clinic service saved."),
  );
}

export async function removeClinicServiceAction(
  formData: FormData,
) {
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
  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }
  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(
    routeMessage(path, "message", "Clinic service removed."),
  );
}

export async function inviteClinicMemberAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const professionalUserId = text(
    formData,
    "professional_user_id",
  );

  if (!professionalUserId) {
    redirect(
      routeMessage(
        path,
        "error",
        "Choose a professional to invite.",
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "invite_clinic_member",
    {
      p_clinic_id: clinicId,
      p_professional_user_id: professionalUserId,
      p_designation: nullableText(formData, "designation"),
      p_is_public:
        formData.get("is_public") === "on",
    },
  );

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/dashboard/professional");
  redirect(
    routeMessage(
      path,
      "message",
      "Professional invitation sent.",
    ),
  );
}

export async function reviewClinicMembershipAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const professionalUserId = text(
    formData,
    "professional_user_id",
  );
  const decision = text(formData, "decision");

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "review_clinic_membership_claim",
    {
      p_clinic_id: clinicId,
      p_professional_user_id: professionalUserId,
      p_approve: decision === "approve",
    },
  );

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/dashboard/professional");
  redirect(
    routeMessage(
      path,
      "message",
      decision === "approve"
        ? "Professional affiliation approved."
        : "Professional affiliation rejected.",
    ),
  );
}

export async function setClinicPrimaryMemberAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const professionalUserId = text(
    formData,
    "professional_user_id",
  );

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "set_clinic_primary_member",
    {
      p_clinic_id: clinicId,
      p_professional_user_id: professionalUserId,
    },
  );

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/clinics");
  redirect(
    routeMessage(
      path,
      "message",
      "Primary clinic professional updated.",
    ),
  );
}

export async function endClinicMemberAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);
  const professionalUserId = text(
    formData,
    "professional_user_id",
  );

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "end_clinic_membership",
    {
      p_clinic_id: clinicId,
      p_professional_user_id: professionalUserId,
    },
  );

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  revalidatePath("/clinics");
  revalidatePath("/dashboard/professional");
  redirect(
    routeMessage(
      path,
      "message",
      "Clinic affiliation ended.",
    ),
  );
}

export async function updateClinicAppointmentAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const appointmentId = text(formData, "appointment_id");
  const path = `/dashboard/clinics/${clinicId}`;
  await requireClinicUser(path);

  const status = text(formData, "status");
  if (!appointmentStatuses.has(status)) {
    redirect(
      routeMessage(
        path,
        "error",
        "Choose a valid appointment status.",
      ),
    );
  }

  const scheduledDate = nullableText(
    formData,
    "scheduled_date",
  );
  const scheduledTime = nullableText(
    formData,
    "scheduled_time",
  );

  if (
    status === "scheduled" &&
    (!scheduledDate || !scheduledTime)
  ) {
    redirect(
      routeMessage(
        path,
        "error",
        "Scheduled appointments require a confirmed date and time.",
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_appointment_requests")
    .update({
      status,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      owner_note: nullableText(formData, "owner_note"),
    })
    .eq("id", appointmentId)
    .eq("clinic_id", clinicId);

  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }

  revalidatePath(path);
  redirect(
    routeMessage(
      path,
      "message",
      "Appointment request updated.",
    ),
  );
}

export async function requestClinicMembershipAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const slug = text(formData, "slug");
  const path = `/clinics/${encodeURIComponent(slug)}`;
  await requireClinicUser(path);
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "request_clinic_membership",
    {
      p_clinic_id: clinicId,
      p_designation: nullableText(formData, "designation"),
      p_is_public:
        formData.get("is_public") === "on",
    },
  );
  if (error) {
    redirect(routeMessage(path, "error", error.message));
  }
  revalidatePath(path);
  revalidatePath("/dashboard/clinics");
  redirect(
    routeMessage(
      path,
      "message",
      "Clinic affiliation request submitted.",
    ),
  );
}

export async function respondClinicInvitationAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const returnPath = "/dashboard/clinics";
  await requireClinicUser(returnPath);
  const decision = text(formData, "decision");

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "respond_clinic_invitation",
    {
      p_clinic_id: clinicId,
      p_accept: decision === "accept",
    },
  );

  if (error) {
    redirect(
      routeMessage(returnPath, "error", error.message),
    );
  }

  revalidatePath(returnPath);
  revalidatePath(`/dashboard/clinics/${clinicId}`);
  revalidatePath("/clinics");
  redirect(
    routeMessage(
      returnPath,
      "message",
      decision === "accept"
        ? "Clinic invitation accepted."
        : "Clinic invitation declined.",
    ),
  );
}

export async function setClinicAffiliationVisibilityAction(
  formData: FormData,
) {
  const clinicId = text(formData, "clinic_id");
  const returnPath = "/dashboard/clinics";
  await requireClinicUser(returnPath);
  const isPublic = text(formData, "is_public") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "set_clinic_member_visibility",
    {
      p_clinic_id: clinicId,
      p_is_public: isPublic,
    },
  );

  if (error) {
    redirect(
      routeMessage(returnPath, "error", error.message),
    );
  }

  revalidatePath(returnPath);
  revalidatePath(`/dashboard/clinics/${clinicId}`);
  revalidatePath("/clinics");
  redirect(
    routeMessage(
      returnPath,
      "message",
      isPublic
        ? "Clinic affiliation is now public."
        : "Clinic affiliation is now private.",
    ),
  );
}
