"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";

function v(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

function pakistanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export async function requestClinicAppointmentAction(
  formData: FormData,
) {
  const clinicId = v(formData, "clinic_id");
  const slug = v(formData, "slug");
  const contactName = v(formData, "contact_name");
  const contactEmail = v(formData, "contact_email");
  const contactPhone = v(formData, "contact_phone");
  const animalSpecies = v(formData, "animal_species");
  const serviceId = v(formData, "service_id");
  const preferredDate = v(formData, "preferred_date");
  const preferredTime = v(formData, "preferred_time");
  const reason = v(formData, "reason");
  const path = `/clinics/${encodeURIComponent(slug)}`;

  if (
    !clinicId ||
    !slug ||
    !contactName ||
    !preferredDate ||
    !preferredTime ||
    !reason
  ) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "Name, preferred date, preferred time and reason are required.",
      )}`,
    );
  }

  if (!contactEmail && !contactPhone) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "Provide an email address or phone number so the clinic can contact you.",
      )}`,
    );
  }

  if (preferredDate < pakistanToday()) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "Choose today or a future appointment date.",
      )}`,
    );
  }

  const date = new Date(`${preferredDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "Choose a valid appointment date.",
      )}`,
    );
  }

  const dayOfWeek = date.getUTCDay();
  const requestedMinutes = timeToMinutes(preferredTime);
  if (requestedMinutes === null) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "Choose a valid appointment time.",
      )}`,
    );
  }

  const identity = await getCurrentIdentity();
  const supabase = await createClient();

  const { data: availability, error: availabilityError } =
    await supabase
      .from("clinic_availability")
      .select(
        "is_open, is_24_hours, opens_at, closes_at, break_start, break_end, appointment_enabled",
      )
      .eq("clinic_id", clinicId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

  if (availabilityError) {
    redirect(
      `${path}?error=${encodeURIComponent(
        availabilityError.message,
      )}`,
    );
  }

  if (
    !availability ||
    !availability.is_open ||
    !availability.appointment_enabled
  ) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "The clinic is not accepting appointment requests on the selected day.",
      )}`,
    );
  }

  if (!availability.is_24_hours) {
    const openMinutes = availability.opens_at
      ? timeToMinutes(availability.opens_at)
      : null;
    const closeMinutes = availability.closes_at
      ? timeToMinutes(availability.closes_at)
      : null;

    if (
      openMinutes === null ||
      closeMinutes === null ||
      requestedMinutes < openMinutes ||
      requestedMinutes >= closeMinutes
    ) {
      redirect(
        `${path}?error=${encodeURIComponent(
          "The selected time is outside the clinic's published appointment hours.",
        )}`,
      );
    }

    if (availability.break_start && availability.break_end) {
      const breakStart = timeToMinutes(
        availability.break_start,
      );
      const breakEnd = timeToMinutes(
        availability.break_end,
      );

      if (
        breakStart !== null &&
        breakEnd !== null &&
        requestedMinutes >= breakStart &&
        requestedMinutes < breakEnd
      ) {
        redirect(
          `${path}?error=${encodeURIComponent(
            "The selected time falls inside the clinic's published break.",
          )}`,
        );
      }
    }
  }

  if (serviceId) {
    const { data: service, error: serviceError } =
      await supabase
        .from("clinic_services")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .eq("is_public", true)
        .eq("booking_enabled", true)
        .maybeSingle();

    if (serviceError) {
      redirect(
        `${path}?error=${encodeURIComponent(
          serviceError.message,
        )}`,
      );
    }

    if (!service) {
      redirect(
        `${path}?error=${encodeURIComponent(
          "The selected service is not currently available for appointment requests.",
        )}`,
      );
    }
  }

  const { error } = await supabase
    .from("clinic_appointment_requests")
    .insert({
      clinic_id: clinicId,
      requester_id: identity?.userId ?? null,
      contact_name: contactName,
      contact_email:
        contactEmail || identity?.email || null,
      contact_phone: contactPhone || null,
      animal_species: animalSpecies || null,
      service_id: serviceId || null,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      reason,
    });

  if (error) {
    redirect(
      `${path}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `${path}?message=${encodeURIComponent(
      "Appointment request sent. The clinic will confirm or contact you.",
    )}`,
  );
}
