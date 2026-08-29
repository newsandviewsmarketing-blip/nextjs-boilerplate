"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function message(kind: "error" | "message", text: string) {
  return `/dashboard?${kind}=${encodeURIComponent(text)}`;
}

export async function updateProfileAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const fullName = value(formData, "full_name");
  const phone = value(formData, "phone");
  const city = value(formData, "city");
  if (!fullName) redirect(message("error", "Full name is required."));

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null, city: city || null })
    .eq("id", identity.userId);
  if (profileError) redirect(message("error", profileError.message));

  if (identity.profile?.primary_role === "veterinarian") {
    const services = value(formData, "services")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("veterinarian_profiles")
      .update({
        pvmc_number: value(formData, "pvmc_number") || null,
        qualifications: value(formData, "qualifications") || null,
        specialization: value(formData, "specialization") || null,
        years_experience: Number(value(formData, "years_experience") || 0),
        city: city || null,
        services,
      })
      .eq("user_id", identity.userId);
    if (error) redirect(message("error", error.message));
  }

  if (identity.profile?.primary_role === "company") {
    const { error } = await supabase
      .from("company_profiles")
      .update({
        company_name: value(formData, "company_name"),
        business_type: value(formData, "business_type") || null,
        registration_number: value(formData, "registration_number") || null,
        city: city || null,
        address: value(formData, "address") || null,
        description: value(formData, "description") || null,
        website: value(formData, "website") || null,
        contact_email: value(formData, "contact_email") || null,
        logo_url: value(formData, "logo_url") || null,
      })
      .eq("user_id", identity.userId);
    if (error) redirect(message("error", error.message));
    const selectedRoles = formData
      .getAll("company_roles")
      .map((item) => String(item))
      .filter(Boolean);

    // Reconcile company roles.
    // First deactivate the previous selection so unchecked roles
    // do not remain active in the database.
    const { error: deactivateRolesError } = await supabase
      .from("company_roles")
      .update({ is_active: false })
      .eq("company_user_id", identity.userId);

    if (deactivateRolesError) {
      redirect(message("error", deactivateRolesError.message));
    }

    // Reactivate/upsert only the roles currently selected by the user.
    for (const roleType of selectedRoles) {
      const details = value(
        formData,
        `role_details_${roleType}`,
      );

      const { error: roleError } = await supabase
        .from("company_roles")
        .upsert(
          {
            company_user_id: identity.userId,
            role_type: roleType,
            details,
            is_active: true,
          },
          {
            onConflict: "company_user_id,role_type",
          },
        );

      if (roleError) {
        redirect(message("error", roleError.message));
      }
    }

    const selectedSectors = formData
      .getAll("company_sectors")
      .map((item) => String(item))
      .filter(Boolean);

    // company_sectors has no active/inactive flag.
    // Rebuild the user's current selection so removed sectors
    // do not remain stored after editing.
    const { error: clearSectorsError } = await supabase
      .from("company_sectors")
      .delete()
      .eq("company_user_id", identity.userId);

    if (clearSectorsError) {
      redirect(message("error", clearSectorsError.message));
    }

    if (selectedSectors.length > 0) {
      const { error: sectorError } = await supabase
        .from("company_sectors")
        .insert(
          selectedSectors.map((sector) => ({
            company_user_id: identity.userId,
            sector,
          })),
        );

      if (sectorError) {
        redirect(message("error", sectorError.message));
      }
    }
    
  if (["professional", "candidate"].includes(identity.profile?.primary_role ?? "")) {
    const skills = value(formData, "skills")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("professional_profiles")
      .update({
        professional_type: value(formData, "professional_type") || "Animal Health Professional",
        headline: value(formData, "headline") || null,
        public_summary: value(formData, "public_summary") || null,
        current_position: value(formData, "current_position") || null,
        organization_name: value(formData, "organization_name") || null,
        city: city || null,
        province: value(formData, "province") || null,
        years_experience: Number(value(formData, "years_experience") || 0),
        skills,
        profile_visibility: value(formData, "profile_visibility") || "owner_only",
      })
      .eq("user_id", identity.userId);
    if (error) redirect(message("error", error.message));
  }

  if (identity.profile?.primary_role === "laboratory") {
    const testsOffered = value(formData, "tests_offered")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const speciesServed = value(formData, "species_served")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("laboratories")
      .update({
        laboratory_name: value(formData, "laboratory_name"),
        laboratory_type: value(formData, "laboratory_type") || "Diagnostic Laboratory",
        description: value(formData, "description") || null,
        technical_head: value(formData, "technical_head") || null,
        city: city || null,
        province: value(formData, "province") || null,
        address: value(formData, "address") || null,
        public_phone: value(formData, "public_phone") || null,
        public_email: value(formData, "public_email") || null,
        website: value(formData, "website") || null,
        working_hours: value(formData, "working_hours") || null,
        emergency_service: formData.get("emergency_service") === "on",
        tests_offered: testsOffered,
        species_served: speciesServed,
      })
      .eq("owner_id", identity.userId);
    if (error) redirect(message("error", error.message));
  }

  revalidatePath("/dashboard");
  redirect(message("message", "Profile saved successfully."));
}
