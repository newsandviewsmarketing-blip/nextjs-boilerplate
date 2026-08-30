"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createMasterDataAction(formData: FormData) {
  const identity = await requireAdminPermission("master_data.manage", "/admin/data");
  const category = String(formData.get("category") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;
  if (!category || !label) redirect("/admin/data?error=Category%20and%20label%20are%20required.");
  const supabase = await createClient();
  const { error } = await supabase.from("master_data_items").insert({
    category, label, code, description, parent_id: parentId, sort_order: sortOrder,
    slug: slugify(label), created_by: identity.userId, updated_by: identity.userId,
  });
  if (error) redirect(`/admin/data?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/data");
  revalidatePath("/dashboard");
  redirect("/admin/data?message=Master%20data%20item%20added.");
}

export async function toggleMasterDataAction(formData: FormData) {
  const identity = await requireAdminPermission("master_data.manage", "/admin/data");
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("is_active") ?? "false") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("master_data_items").update({ is_active: active, updated_by: identity.userId }).eq("id", id);
  if (error) redirect(`/admin/data?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/data");
  redirect("/admin/data?message=Master%20data%20status%20updated.");
}
