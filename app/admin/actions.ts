"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  canModerateProducts,
  canManageJobs,
  canReviewProfiles,
  getCurrentIdentity,
} from "@/lib/auth";

export async function reviewProfileAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(canReviewProfiles)) redirect("/dashboard?error=Admin%20access%20is%20required.");

  const profileType = String(formData.get("profile_type") ?? "");
  const recordSource = String(formData.get("record_source") ?? "account");
  const userId = String(formData.get("user_id") ?? "");
  const entityId = String(formData.get("entity_id") ?? userId);
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!entityId || !["veterinarian", "company", "professional", "laboratory", "clinic"].includes(profileType) || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20review%20request.");
  }

  const supabase = await createClient();
  const reviewedAt = decision === "approved" ? new Date().toISOString() : null;
  let error: { message: string } | null = null;

  if (recordSource === "managed_people") {
    const { data: managed } = await supabase
      .from("managed_people")
      .select("profile_kind,pvmc_verification_status")
      .eq("id", entityId)
      .maybeSingle();
    const publishNow = decision === "approved" && managed?.profile_kind === "professional";
    const result = await supabase.from("managed_people").update({
      verification_status: decision,
      is_published: publishNow,
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
      updated_by: identity.userId,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "companies") {
    const result = await supabase.from("companies").update({
      verification_status: decision,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "clinics") {
    const result = await supabase.from("clinics").update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted clinic information." : null,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "laboratories" || profileType === "laboratory") {
    const result = await supabase.from("laboratories").update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted laboratory information." : null,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else {
    if (!userId) redirect("/admin/reviews?error=User%20profile%20ID%20is%20missing.");
    const table = {
      veterinarian: "veterinarian_profiles",
      company: "company_profiles",
      professional: "professional_profiles",
    }[profileType] as "veterinarian_profiles" | "company_profiles" | "professional_profiles" | undefined;
    if (!table) redirect("/admin/reviews?error=Invalid%20account%20profile%20type.");
    const result = await supabase.from(table).update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted information." : null,
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
      ...(profileType === "professional" ? { profile_visibility: decision === "approved" ? "public" : "owner_only" } : {}),
    }).eq("user_id", entityId);
    error = result.error;

    if (!error && profileType === "company") {
      const { data: companyProfile } = await supabase
        .from("company_profiles")
        .select("company_name,legal_name,trade_name,business_type,description,city,address,website,contact_email,logo_url")
        .eq("user_id", entityId)
        .maybeSingle();
      if (companyProfile) {
        const canonicalResult = await supabase.from("companies").update({
          canonical_name: companyProfile.legal_name || companyProfile.trade_name || companyProfile.company_name || "Unnamed Company",
          legal_name: companyProfile.legal_name,
          trade_name: companyProfile.trade_name,
          business_type: companyProfile.business_type,
          description: companyProfile.description,
          city: companyProfile.city,
          address: companyProfile.address,
          website: companyProfile.website,
          public_email: companyProfile.contact_email,
          logo_url: companyProfile.logo_url,
          verification_status: decision,
          is_published: decision === "approved",
          verified_at: reviewedAt,
          verified_by: decision === "approved" ? identity.userId : null,
        }).eq("legacy_company_user_id", entityId);
        error = canonicalResult.error;
      }
    }
  }

  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `${recordSource}.${profileType}.${decision}`,
    entity_type: profileType,
    entity_id: entityId,
    metadata: { reason: reason || null, record_source: recordSource },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directory");
  revalidatePath("/vets");
  revalidatePath("/professionals");
  revalidatePath("/companies");
  revalidatePath("/clinics");
  revalidatePath("/labs");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Profile ${decision}.`)}`);
}

export async function reviewVeterinarianCredentialAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(canReviewProfiles)) redirect("/dashboard?error=Verification%20access%20is%20required.");

  const userId = String(formData.get("user_id") ?? "");
  const recordSource = String(formData.get("record_source") ?? "account");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !["approved", "rejected"].includes(decision)) redirect("/admin/reviews?error=Invalid%20credential%20review%20request.");

  const supabase = await createClient();
  const reviewedAt = decision === "approved" ? new Date().toISOString() : null;
  if (recordSource === "managed_people") {
    const { data: managed } = await supabase.from("managed_people").select("verification_status").eq("id", userId).maybeSingle();
    const result = await supabase.from("managed_people").update({
      pvmc_verification_status: decision,
      is_published: decision === "approved" && managed?.verification_status === "approved",
      updated_by: identity.userId,
    }).eq("id", userId);
    if (result.error) redirect(`/admin/reviews?error=${encodeURIComponent(result.error.message)}`);
  } else {
    const result = await supabase.from("veterinarian_profiles").update({
      pvmc_verification_status: decision,
      pvmc_verified_at: reviewedAt,
      pvmc_verified_by: decision === "approved" ? identity.userId : null,
      rejection_reason: decision === "rejected" ? reason || "PVMC credential verification could not be completed." : null,
    }).eq("user_id", userId);
    if (result.error) redirect(`/admin/reviews?error=${encodeURIComponent(result.error.message)}`);
  }

  await supabase.from("verification_records").insert({
    entity_type: "veterinarian",
    entity_id: userId,
    verification_type: "pvmc_credential",
    status: decision,
    notes: reason || null,
    reviewed_by: identity.userId,
    reviewed_at: new Date().toISOString(),
  });
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `${recordSource}.veterinarian.pvmc.${decision}`,
    entity_type: "veterinarian",
    entity_id: userId,
    metadata: { reason: reason || null, record_source: recordSource },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directory");
  revalidatePath("/vets");
  redirect(`/admin/reviews?message=${encodeURIComponent(`PVMC credential ${decision}.`)}`);
}

export async function reviewProductAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(canModerateProducts)) {
    redirect("/dashboard?error=Admin%20access%20is%20required.");
  }

  const productId = String(formData.get("product_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!productId || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20product%20review%20request.");
  }

  const supabase = await createClient();
  const reviewedAt = new Date().toISOString();
  const { error } = await supabase
    .from("products")
    .update({
      verification_status: decision,
      rejection_reason:
        decision === "rejected"
          ? reason || "Please update the submitted product information."
          : null,
      is_published: decision === "approved",
      verified_at: decision === "approved" ? reviewedAt : null,
      verified_by: decision === "approved" ? identity.userId : null,
      published_at: decision === "approved" ? reviewedAt : null,
      published_by: decision === "approved" ? identity.userId : null,
      archived_at: null,
      archived_by: null,
    })
    .eq("id", productId);
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `product.${decision}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { reason: reason || null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard/company");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Product ${decision}.`)}`);
}

export async function reviewJobAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(canManageJobs)) {
    redirect("/dashboard?error=Content%20moderation%20access%20is%20required.");
  }
  const jobId = String(formData.get("job_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!jobId || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20job%20review%20request.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      verification_status: decision,
      is_published: decision === "approved",
    })
    .eq("id", jobId);
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `job.${decision}`,
    entity_type: "job",
    entity_id: jobId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/jobs");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Job ${decision}.`)}`);
}

export async function reviewProductRegulatoryAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(canReviewProfiles)) {
    redirect("/dashboard?error=Verification%20access%20is%20required.");
  }
  const productId = String(formData.get("product_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!productId || !["verified", "not_applicable", "returned"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20regulatory%20review%20request.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_regulatory")
    .update({
      verification_status: decision,
      reviewer_notes: notes || null,
      verified_at: ["verified", "not_applicable"].includes(decision) ? new Date().toISOString() : null,
      verified_by: ["verified", "not_applicable"].includes(decision) ? identity.userId : null,
    })
    .eq("product_id", productId);
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);
  const { error: productError } = await supabase
    .from("products")
    .update({ regulatory_review_status: decision })
    .eq("id", productId);
  if (productError) redirect(`/admin/reviews?error=${encodeURIComponent(productError.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `product.regulatory.${decision}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { notes: notes || null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Regulatory review marked ${decision.replaceAll("_", " ")}.`)}`);
}
