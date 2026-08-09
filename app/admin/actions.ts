"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity, isAdminRole } from "@/lib/auth";

export async function reviewProfileAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(isAdminRole))
    redirect("/dashboard?error=Admin%20access%20is%20required.");

  const profileType = String(formData.get("profile_type") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (
    !userId ||
    !["veterinarian", "company"].includes(profileType) ||
    !["approved", "rejected"].includes(decision)
  ) {
    redirect("/admin?error=Invalid%20review%20request.");
  }

  const supabase = await createClient();
  const table =
    profileType === "veterinarian"
      ? "veterinarian_profiles"
      : "company_profiles";
  const { error } = await supabase
    .from(table)
    .update({
      verification_status: decision,
      rejection_reason:
        decision === "rejected"
          ? reason || "Please update the submitted information."
          : null,
      verified_at: decision === "approved" ? new Date().toISOString() : null,
      verified_by: decision === "approved" ? identity.userId : null,
    })
    .eq("user_id", userId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `${profileType}.${decision}`,
    entity_type: profileType,
    entity_id: userId,
    metadata: { reason: reason || null },
  });
  revalidatePath("/admin");
  redirect(`/admin?message=${encodeURIComponent(`Profile ${decision}.`)}`);
}

export async function reviewProductAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(isAdminRole)) {
    redirect("/dashboard?error=Admin%20access%20is%20required.");
  }

  const productId = String(formData.get("product_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!productId || !["approved", "rejected"].includes(decision)) {
    redirect("/admin?error=Invalid%20product%20review%20request.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      verification_status: decision,
      rejection_reason:
        decision === "rejected"
          ? reason || "Please update the submitted product information."
          : null,
      is_published: decision === "approved",
      verified_at: decision === "approved" ? new Date().toISOString() : null,
      verified_by: decision === "approved" ? identity.userId : null,
    })
    .eq("id", productId);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `product.${decision}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { reason: reason || null },
  });
  revalidatePath("/admin");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard/company");
  redirect(`/admin?message=${encodeURIComponent(`Product ${decision}.`)}`);
}
