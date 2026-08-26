"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid, readProductInput } from "@/lib/product-input";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function result(kind: "error" | "message", text: string) {
  return `/dashboard/company?${kind}=${encodeURIComponent(text)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 58);
}

async function requireCompany() {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/dashboard/company");
  if (!identity.roles.includes("company")) {
    redirect(result("error", "A company account is required."));
  }
  return identity;
}

export async function createProductAction(formData: FormData) {
  const identity = await requireCompany();
  const supabase = await createClient();
  const productName = field(formData, "product_name");
  const category = field(formData, "category");
  if (!productName || !category) {
    redirect(result("error", "Product name and category are required."));
  }

  const { data: company } = await supabase
    .from("company_profiles")
    .select("verification_status")
    .eq("user_id", identity.userId)
    .maybeSingle();
  if (company?.verification_status !== "approved") {
    redirect(
      result("error", "Your company must be approved before submitting products."),
    );
  }

  const packSizes = field(formData, "pack_sizes")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const list = (name: string) =>
    field(formData, name)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const sectors = list("sectors");
  const species = list("species");
  const productionSystems = list("production_systems");
  const useAreas = list("use_areas");
  const routes = list("routes");
  const regulatoryNumber = field(formData, "regulatory_number");
  const slug = `${slugify(productName) || "product"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: product, error } = await supabase.from("products").insert({
    company_user_id: identity.userId,
    slug,
    product_name: productName,
    product_code: field(formData, "product_code") || null,
    brand_name: field(formData, "brand_name") || null,
    generic_name: field(formData, "generic_name") || null,
    category,
    subclass: field(formData, "subclass") || null,
    therapeutic_class: field(formData, "therapeutic_class") || null,
    sector: sectors[0] || null,
    sectors,
    species,
    production_systems: productionSystems,
    use_areas: useAreas,
    routes,
    composition: field(formData, "composition") || null,
    strength: field(formData, "strength") || null,
    dosage_form: field(formData, "dosage_form") || null,
    pack_sizes: packSizes,
    indications: field(formData, "indications") || null,
    precautions: field(formData, "precautions") || null,
    contraindications: field(formData, "contraindications") || null,
    warnings: field(formData, "warnings") || null,
    meat_withdrawal: field(formData, "meat_withdrawal") || null,
    milk_withdrawal: field(formData, "milk_withdrawal") || null,
    egg_withdrawal: field(formData, "egg_withdrawal") || null,
    description: field(formData, "description") || null,
    storage_instructions: field(formData, "storage_instructions") || null,
    cold_chain: formData.get("cold_chain") === "on",
    temperature_range: field(formData, "temperature_range") || null,
    shelf_life: field(formData, "shelf_life") || null,
    country_of_origin: field(formData, "country_of_origin") || null,
    image_url: field(formData, "image_url") || null,
    availability: field(formData, "availability") || null,
    regulatory_review_status: regulatoryNumber ? "pending" : "not_provided",
    last_edited_by: identity.userId,
  }).select("id").single();
  if (error) redirect(result("error", error.message));

  if (regulatoryNumber && product) {
    const { error: complianceError } = await supabase
      .from("product_regulatory")
      .insert({
        product_id: product.id,
        company_user_id: identity.userId,
        registration_number: regulatoryNumber,
        verification_status: "pending",
      });
    if (complianceError) {
      await supabase.from("products").delete().eq("id", product.id);
      redirect(result("error", complianceError.message));
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: "product.submitted",
    entity_type: "product",
    metadata: { product_name: productName, slug },
  });
  revalidatePath("/dashboard/company");
  revalidatePath("/admin");
  redirect(result("message", "Product submitted for administrator approval."));
}

export async function deletePendingProductAction(formData: FormData) {
  const identity = await requireCompany();
  const productId = field(formData, "product_id");
  if (!productId) redirect(result("error", "Product ID is missing."));
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("company_user_id", identity.userId);
  if (error) redirect(result("error", error.message));
  revalidatePath("/dashboard/company");
  redirect(result("message", "Pending product removed."));
}

export async function updateCompanyProductAction(productId: string, formData: FormData) {
  const identity = await requireCompany();
  const returnPath = `/dashboard/company/products/${productId}`;
  if (!isUuid(productId)) {
    redirect(`${returnPath}?error=${encodeURIComponent("Invalid product record.")}`);
  }
  const input = readProductInput(formData);
  if (input.error) {
    redirect(`${returnPath}?error=${encodeURIComponent(input.error)}`);
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, company_user_id, product_name, verification_status")
    .eq("id", productId)
    .eq("company_user_id", identity.userId)
    .maybeSingle();
  if (!product) {
    redirect(result("error", "Product record not found."));
  }

  const { error } = await supabase
    .from("products")
    .update({ ...input.data, last_edited_by: identity.userId })
    .eq("id", productId)
    .eq("company_user_id", identity.userId);
  if (error) redirect(`${returnPath}?error=${encodeURIComponent(error.message)}`);

  const { data: regulatory } = await supabase
    .from("product_regulatory")
    .select("registration_number")
    .eq("product_id", productId)
    .eq("company_user_id", identity.userId)
    .maybeSingle();
  if (input.regulatoryNumber !== (regulatory?.registration_number ?? "")) {
    const { error: regulatoryError } = await supabase
      .from("product_regulatory")
      .upsert(
        {
          product_id: productId,
          company_user_id: identity.userId,
          registration_number: input.regulatoryNumber || null,
          verification_status: "pending",
        },
        { onConflict: "product_id" },
      );
    if (regulatoryError) {
      redirect(`${returnPath}?error=${encodeURIComponent(regulatoryError.message)}`);
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: "product.owner_updated",
    entity_type: "product",
    entity_id: productId,
    metadata: {
      product_name: input.data.product_name,
      previous_status: product.verification_status,
    },
  });
  revalidatePath("/dashboard/company");
  revalidatePath(returnPath);
  revalidatePath("/admin/products");
  revalidatePath("/admin/reviews");
  redirect(`${returnPath}?message=${encodeURIComponent("Product saved and returned to review where required.")}`);
}

export async function updateInquiryStatusAction(formData: FormData) {
  const identity = await requireCompany();
  const inquiryId = field(formData, "inquiry_id");
  const status = field(formData, "status");
  if (!inquiryId || !["reviewing", "responded", "closed"].includes(status)) {
    redirect(result("error", "Invalid inquiry update."));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .eq("company_user_id", identity.userId);
  if (error) redirect(result("error", error.message));
  revalidatePath("/dashboard/company");
  redirect(result("message", "Inquiry status updated."));
}

export async function createJobAction(formData: FormData) {
  const identity = await requireCompany();
  const supabase = await createClient();
  const title = field(formData, "title");
  const description = field(formData, "job_description");
  if (!title || !description) {
    redirect(result("error", "Job title and description are required."));
  }
  const { data: company } = await supabase
    .from("company_profiles")
    .select("verification_status")
    .eq("user_id", identity.userId)
    .maybeSingle();
  if (company?.verification_status !== "approved") {
    redirect(result("error", "Your company must be approved before posting jobs."));
  }
  const slug = `${slugify(title) || "job"}-${crypto.randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("jobs").insert({
    company_user_id: identity.userId,
    slug,
    title,
    description,
    sector: field(formData, "job_sector") || null,
    city: field(formData, "job_city") || null,
    province: field(formData, "job_province") || null,
    employment_type: field(formData, "employment_type") || "Full-time",
    minimum_qualification: field(formData, "minimum_qualification") || null,
    minimum_experience: Number(field(formData, "minimum_experience") || 0),
    deadline: field(formData, "deadline") || null,
  });
  if (error) redirect(result("error", error.message));
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: "job.submitted",
    entity_type: "job",
    metadata: { title, slug },
  });
  revalidatePath("/dashboard/company");
  revalidatePath("/admin");
  redirect(result("message", "Job submitted for administrator approval."));
}

export async function deletePendingJobAction(formData: FormData) {
  const identity = await requireCompany();
  const jobId = field(formData, "job_id");
  if (!jobId) redirect(result("error", "Job ID is missing."));
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("company_user_id", identity.userId)
    .neq("verification_status", "approved");
  if (error) redirect(result("error", error.message));
  revalidatePath("/dashboard/company");
  redirect(result("message", "Pending job removed."));
}
