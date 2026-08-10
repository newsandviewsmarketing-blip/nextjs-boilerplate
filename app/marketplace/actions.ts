"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function productPath(slug: string, kind: "error" | "message", text: string) {
  return `/marketplace/${encodeURIComponent(slug)}?${kind}=${encodeURIComponent(text)}`;
}

export async function createProductInquiryAction(formData: FormData) {
  const slug = field(formData, "slug");
  const productId = field(formData, "product_id");
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect(`/login?next=${encodeURIComponent(`/marketplace/${slug}`)}`);
  }
  const inquiryType = field(formData, "inquiry_type");
  const contactName = field(formData, "contact_name");
  const contactEmail = field(formData, "contact_email");
  const message = field(formData, "message");
  if (
    !productId ||
    !contactName ||
    !contactEmail ||
    !message ||
    !["information", "quotation", "contact"].includes(inquiryType)
  ) {
    redirect(productPath(slug, "error", "Complete all required request fields."));
  }

  const supabase = await createClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, company_user_id, slug")
    .eq("id", productId)
    .eq("verification_status", "approved")
    .eq("is_published", true)
    .maybeSingle();
  if (productError || !product) {
    redirect(productPath(slug, "error", "This product is not available."));
  }

  const { error } = await supabase.from("product_inquiries").insert({
    product_id: product.id,
    company_user_id: product.company_user_id,
    requester_id: identity.userId,
    inquiry_type: inquiryType,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: field(formData, "contact_phone") || null,
    organization: field(formData, "organization") || null,
    message,
  });
  if (error) redirect(productPath(slug, "error", error.message));
  revalidatePath("/dashboard/company");
  redirect(productPath(slug, "message", "Your request was sent to the company."));
}

export async function toggleSavedProductAction(formData: FormData) {
  const slug = field(formData, "slug");
  const productId = field(formData, "product_id");
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect(`/login?next=${encodeURIComponent(`/marketplace/${slug}`)}`);
  }
  if (!productId) redirect(productPath(slug, "error", "Product ID is missing."));

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_products")
    .select("product_id")
    .eq("user_id", identity.userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("saved_products")
      .delete()
      .eq("user_id", identity.userId)
      .eq("product_id", productId);
    if (error) redirect(productPath(slug, "error", error.message));
    revalidatePath(`/marketplace/${slug}`);
    redirect(productPath(slug, "message", "Product removed from saved items."));
  }

  const { error } = await supabase.from("saved_products").insert({
    user_id: identity.userId,
    product_id: productId,
  });
  if (error) redirect(productPath(slug, "error", error.message));
  revalidatePath(`/marketplace/${slug}`);
  redirect(productPath(slug, "message", "Product saved to your account."));
}
