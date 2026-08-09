"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
  const slug = `${slugify(productName) || "product"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: product, error } = await supabase.from("products").insert({
    company_user_id: identity.userId,
    slug,
    product_name: productName,
    brand_name: field(formData, "brand_name") || null,
    generic_name: field(formData, "generic_name") || null,
    category,
    sector: field(formData, "sector") || null,
    composition: field(formData, "composition") || null,
    strength: field(formData, "strength") || null,
    dosage_form: field(formData, "dosage_form") || null,
    pack_sizes: packSizes,
    indications: field(formData, "indications") || null,
    description: field(formData, "description") || null,
    storage_instructions: field(formData, "storage_instructions") || null,
    image_url: field(formData, "image_url") || null,
    availability: field(formData, "availability") || null,
  }).select("id").single();
  if (error) redirect(result("error", error.message));

  const regulatoryNumber = field(formData, "regulatory_number");
  if (regulatoryNumber && product) {
    const { error: complianceError } = await supabase
      .from("product_compliance")
      .insert({
        product_id: product.id,
        company_user_id: identity.userId,
        regulatory_number: regulatoryNumber,
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
