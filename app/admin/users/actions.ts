"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission, staffRoleOptions } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formField, isUuid } from "@/lib/product-input";

const staffRoles = staffRoleOptions.map((item) => item.value);

function result(kind: "error" | "message", text: string) {
  return `/admin/users?${kind}=${encodeURIComponent(text)}`;
}

export async function updateStaffRolesAction(formData: FormData) {
  const identity = await requireAdminPermission("users.manage", "/admin/users");
  const userId = formField(formData, "user_id");
  if (!isUuid(userId)) redirect(result("error", "Invalid user account."));

  const selected = [...new Set(
    formData
      .getAll("staff_roles")
      .map(String)
      .filter((role): role is (typeof staffRoles)[number] => staffRoles.includes(role as (typeof staffRoles)[number])),
  )];
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect(result("error", "User account not found."));

  const { data: existingRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const existing = (existingRows ?? []).map((row) => String(row.role));
  const removesSuperAdmin = existing.includes("super_admin") && !selected.includes("super_admin");
  if (removesSuperAdmin) {
    if (userId === identity.userId) {
      redirect(result("error", "You cannot remove your own Super Administrator role."));
    }
    const { count } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) {
      redirect(result("error", "At least one Super Administrator must remain."));
    }
  }

  for (const role of staffRoles) {
    const shouldHave = selected.includes(role);
    const alreadyHas = existing.includes(role);
    if (shouldHave && !alreadyHas) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) redirect(result("error", error.message));
    } else if (!shouldHave && alreadyHas) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) redirect(result("error", error.message));
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: "user.staff_roles_updated",
    entity_type: "user",
    entity_id: userId,
    metadata: { previous_staff_roles: existing.filter((role) => staffRoles.includes(role as (typeof staffRoles)[number])), staff_roles: selected },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect(result("message", `Staff roles updated for ${profile.full_name || profile.email}.`));
}

export async function updateUserStatusAction(formData: FormData) {
  const identity = await requireAdminPermission("users.manage", "/admin/users");
  const userId = formField(formData, "user_id");
  const status = formField(formData, "account_status");
  if (!isUuid(userId) || !["active", "suspended"].includes(status)) {
    redirect(result("error", "Invalid account status request."));
  }
  if (userId === identity.userId && status === "suspended") {
    redirect(result("error", "You cannot suspend your own administrator account."));
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ account_status: status })
    .eq("id", userId)
    .select("email, full_name")
    .single();
  if (error) redirect(result("error", error.message));
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `user.${status}`,
    entity_type: "user",
    entity_id: userId,
    metadata: { email: profile.email },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  redirect(result("message", `${profile.full_name || profile.email} is now ${status}.`));
}
