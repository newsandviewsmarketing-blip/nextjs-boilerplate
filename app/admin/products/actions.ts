"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  formField,
  isUuid,
  readProductInput,
  slugifyProduct,
} from "@/lib/product-input";

function result(kind: "error" | "message", text: string, path = "/admin/products") {
  return `${path}?${kind}=${encodeURIComponent(text)}`;
}

async function writeAudit(
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: "product",
    entity_id: entityId,
    metadata,
  });
}

export async function createAdminProductAction(formData: FormData) {
  const identity = await requireAdminPermission("products.manage", "/admin/products/new");
  const input = readProductInput(formData);
  if (input.error) redirect(result("error", input.error, "/admin/products/new"));
  if (!isUuid(input.companyUserId)) {
    redirect(result("error", "Select an approved company.", "/admin/products/new"));
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("public_companies")
    .select("user_id, company_name")
    .eq("user_id", input.companyUserId)
    .maybeSingle();
  if (!company) {
    redirect(result("error", "The selected company is not approved or no longer available.", "/admin/products/new"));
  }

  const slug = `${slugifyProduct(input.data.product_name) || "product"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      ...input.data,
      company_user_id: input.companyUserId,
      slug,
      last_edited_by: identity.userId,
    })
    .select("id")
    .single();
  if (error || !product) {
    redirect(result("error", error?.message || "The product could not be created.", "/admin/products/new"));
  }

  if (input.regulatoryNumber) {
    const { error: regulatoryError } = await supabase.from("product_regulatory").insert({
      product_id: product.id,
      company_user_id: input.companyUserId,
      registration_number: input.regulatoryNumber,
      verification_status: "pending",
    });
    if (regulatoryError) {
      await supabase.from("products").delete().eq("id", product.id);
      redirect(result("error", regulatoryError.message, "/admin/products/new"));
    }
  }

  await writeAudit(identity.userId, "product.admin_created", product.id, {
    product_name: input.data.product_name,
    company_user_id: input.companyUserId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  redirect(result("message", "Product created as an unpublished review record."));
}

export async function updateAdminProductAction(productId: string, formData: FormData) {
  const returnPath = `/admin/products/${productId}`;
  const identity = await requireAdminPermission("products.manage", returnPath);
  if (!isUuid(productId)) redirect(result("error", "Invalid product record.", returnPath));
  const input = readProductInput(formData);
  if (input.error) redirect(result("error", input.error, returnPath));

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("products")
    .select("id, company_user_id, product_name, slug")
    .eq("id", productId)
    .maybeSingle();
  if (!current) redirect(result("error", "Product record not found.", "/admin/products"));

  const { error } = await supabase
    .from("products")
    .update({ ...input.data, last_edited_by: identity.userId })
    .eq("id", productId);
  if (error) redirect(result("error", error.message, returnPath));

  const { data: regulatory } = await supabase
    .from("product_regulatory")
    .select("registration_number")
    .eq("product_id", productId)
    .maybeSingle();
  const oldRegulatoryNumber = regulatory?.registration_number ?? "";
  if (input.regulatoryNumber !== oldRegulatoryNumber) {
    const { error: regulatoryError } = await supabase
      .from("product_regulatory")
      .upsert(
        {
          product_id: productId,
          company_user_id: current.company_user_id,
          registration_number: input.regulatoryNumber || null,
          verification_status: "pending",
          reviewer_notes: null,
          verified_at: null,
          verified_by: null,
        },
        { onConflict: "product_id" },
      );
    if (regulatoryError) redirect(result("error", regulatoryError.message, returnPath));
  }

  await writeAudit(identity.userId, "product.admin_updated", productId, {
    before_name: current.product_name,
    product_name: input.data.product_name,
  });
  revalidatePath(returnPath);
  revalidatePath("/admin/products");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${current.slug}`);
  redirect(result("message", "Product details updated.", returnPath));
}

export async function changeAdminProductStatusAction(formData: FormData) {
  const identity = await requireAdminPermission("products.manage", "/admin/products");
  const productId = formField(formData, "product_id");
  const decision = formField(formData, "decision");
  const reason = formField(formData, "reason");
  if (!isUuid(productId)) redirect(result("error", "Invalid product record."));

  const now = new Date().toISOString();
  const allowed = ["publish", "unpublish", "pending", "reject", "archive", "restore"];
  if (!allowed.includes(decision)) redirect(result("error", "Invalid product status action."));

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, product_name, slug")
    .eq("id", productId)
    .maybeSingle();
  if (!product) redirect(result("error", "Product record not found."));

  const patch: Record<string, unknown> = {};
  if (decision === "publish") {
    Object.assign(patch, {
      verification_status: "approved",
      rejection_reason: null,
      is_published: true,
      verified_at: now,
      verified_by: identity.userId,
      published_at: now,
      published_by: identity.userId,
      archived_at: null,
      archived_by: null,
    });
  } else if (decision === "unpublish") {
    Object.assign(patch, { is_published: false, published_at: null, published_by: null });
  } else if (decision === "pending") {
    Object.assign(patch, {
      verification_status: "pending",
      rejection_reason: null,
      is_published: false,
      verified_at: null,
      verified_by: null,
      published_at: null,
      published_by: null,
    });
  } else if (decision === "reject") {
    Object.assign(patch, {
      verification_status: "rejected",
      rejection_reason: reason || "Please correct the product information and resubmit.",
      is_published: false,
      verified_at: null,
      verified_by: null,
      published_at: null,
      published_by: null,
    });
  } else if (decision === "archive") {
    Object.assign(patch, {
      is_published: false,
      published_at: null,
      published_by: null,
      archived_at: now,
      archived_by: identity.userId,
    });
  } else {
    Object.assign(patch, { archived_at: null, archived_by: null });
  }

  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) redirect(result("error", error.message));
  await writeAudit(identity.userId, `product.${decision}`, productId, {
    product_name: product.product_name,
    reason: reason || null,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${product.slug}`);
  redirect(result("message", `Product ${decision.replaceAll("_", " ")} action completed.`));
}

export async function permanentlyDeleteProductAction(formData: FormData) {
  const identity = await requireAdminPermission("products.delete", "/admin/products");
  const productId = formField(formData, "product_id");
  const confirmation = formField(formData, "confirmation");
  if (!isUuid(productId) || confirmation !== "DELETE") {
    redirect(result("error", "Type DELETE to confirm permanent removal."));
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, product_name, slug")
    .eq("id", productId)
    .maybeSingle();
  if (!product) redirect(result("error", "Product record not found."));
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) redirect(result("error", error.message));
  await writeAudit(identity.userId, "product.permanently_deleted", productId, {
    product_name: product.product_name,
    slug: product.slug,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/marketplace");
  redirect(result("message", "Product and its dependent records were permanently removed."));
}
