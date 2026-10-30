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


export async function reviewMasterSuggestionAction(formData: FormData) {
  const identity = await requireAdminPermission("master_data.manage", "/admin/data");
  const id=String(formData.get("suggestion_id") ?? "");
  const decision=String(formData.get("decision") ?? "");
  if(!id || !["approved","rejected"].includes(decision)) {
    redirect("/admin/data?error=Invalid%20master%20data%20decision.");
  }
  const supabase=await createClient();
  const {data:suggestion,error:loadError}=await supabase.from("master_data_suggestions")
    .select("id,category,label,context_province,status")
    .eq("id",id).eq("status","pending").maybeSingle();
  if(loadError||!suggestion)redirect("/admin/data?error=Pending%20suggestion%20not%20found.");
  if(decision==="approved") {
    const {data:current,error:readError}=await supabase.from("master_data_items")
      .select("id,label,metadata").eq("category",suggestion.category);
    if(readError)redirect("/admin/data?error="+encodeURIComponent(readError.message));
    const exists=(current ?? []).some(item=>
      item.label.trim().toLowerCase()===suggestion.label.trim().toLowerCase()
      && (!suggestion.context_province ||
        !(item.metadata as Record<string,unknown>|null)?.province ||
        String((item.metadata as Record<string,unknown>).province).toLowerCase()===suggestion.context_province.toLowerCase()));
    if(!exists) {
      const {error:addError}=await supabase.from("master_data_items").insert({
        category:suggestion.category,label:suggestion.label,code:null,
        slug:slugify(suggestion.label),
        metadata:suggestion.context_province?{province:suggestion.context_province}:{},
        created_by:identity.userId,updated_by:identity.userId,is_active:true,
      });
      if(addError)redirect("/admin/data?error="+encodeURIComponent(addError.message));
    }
  }
  const {data:updated,error:updateError}=await supabase.from("master_data_suggestions")
    .update({status:decision,reviewed_by:identity.userId,reviewed_at:new Date().toISOString()})
    .eq("id",id).eq("status","pending").select("id").maybeSingle();
  if(updateError||!updated) redirect("/admin/data?error=Suggestion%20review%20could%20not%20be%20saved.");
  await supabase.from("audit_logs").insert({
    actor_id:identity.userId,action:"master_data.suggestion."+decision,
    entity_type:"master_data_suggestion",entity_id:id,
    metadata:{category:suggestion.category,label:suggestion.label,province:suggestion.context_province},
  });
  revalidatePath("/admin/data");revalidatePath("/admin");
  redirect("/admin/data?message="+encodeURIComponent("Suggestion "+decision+"."));
}
