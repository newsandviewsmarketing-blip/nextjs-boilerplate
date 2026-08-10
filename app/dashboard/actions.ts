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
  }

  revalidatePath("/dashboard");
  redirect(message("message", "Profile saved successfully."));
}
