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

  // Date-specific closures or adjusted hours override the regular weekly schedule.
  const {data:exception,error:exceptionError}=await supabase
    .from("clinic_schedule_exceptions")
    .select("is_closed,opens_at,closes_at,appointment_enabled")
    .eq("clinic_id",clinicId).eq("exception_date",preferredDate).maybeSingle();
  // A prior release introduced the optional date-exceptions feature before its
  // additive migration was applied. Only a confirmed missing-table error may
  // fall back to the existing weekly schedule. Any authorization, network,
  // query or other unexpected error still blocks requests (fail closed).
  const exceptionTableUnavailable = Boolean(
    exceptionError &&
      (exceptionError.code === "PGRST205" || exceptionError.code === "42P01") &&
      exceptionError.message?.includes("clinic_schedule_exceptions"),
  );
  if (exceptionError && !exceptionTableUnavailable) {
    redirect(`${path}?error=${encodeURIComponent("Clinic availability could not be checked for the selected date.")}`);
  }
  // Recurring monthly exceptions apply on the same calendar day from their
  // start date; a one-time exception for the selected date takes priority.
  const {data:monthlyRows,error:monthlyError}=exception || exceptionTableUnavailable
    ?{data:[],error:null}
    :await supabase.from("clinic_schedule_exceptions")
      .select("is_closed,opens_at,closes_at,appointment_enabled,exception_date,repeat_until")
      .eq("clinic_id",clinicId).eq("repeat_monthly",true)
      .lte("exception_date",preferredDate)
      .order("exception_date",{ascending:false}).limit(100);
  if(monthlyError){
    redirect(`${path}?error=${encodeURIComponent("Recurring clinic availability could not be checked.")}`);
  }
  const monthlyException=(monthlyRows??[]).find(row=>
    row.exception_date.slice(8,10)===preferredDate.slice(8,10)
    &&(!row.repeat_until||preferredDate<=row.repeat_until));
  const effectiveException=exception??monthlyException??null;
  if(effectiveException?.is_closed){
    redirect(`${path}?error=${encodeURIComponent("The clinic is closed on this date. Please choose another day.")}`);
  }
  const schedule=effectiveException
   ?{is_open:true,is_24_hours:false,opens_at:effectiveException.opens_at,closes_at:effectiveException.closes_at,
      break_start:null as string|null,break_end:null as string|null,
      appointment_enabled:effectiveException.appointment_enabled}
   :availability;
  if (
    !schedule ||
    !schedule.is_open ||
    !schedule.appointment_enabled
  ) {
    redirect(
      `${path}?error=${encodeURIComponent(
        "The clinic is not accepting appointment requests on the selected day.",
      )}`,
    );
  }

  if (!schedule.is_24_hours) {
    const openMinutes = schedule.opens_at
      ? timeToMinutes(schedule.opens_at)
      : null;
    const closeMinutes = schedule.closes_at
      ? timeToMinutes(schedule.closes_at)
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

    if (schedule.break_start && schedule.break_end) {
      const breakStart = timeToMinutes(
        schedule.break_start,
      );
      const breakEnd = timeToMinutes(
        schedule.break_end,
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
