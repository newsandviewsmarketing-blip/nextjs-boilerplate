"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formField, isUuid } from "@/lib/product-input";
import { profileNameProblem } from "@/lib/profile-name";

function feedback(id:string,kind:"message"|"error",value:string):never {
  redirect(`/admin/users/${id}?${kind}=${encodeURIComponent(value)}`);
}

function limited(formData:FormData,name:string,maxLength:number){
  const data=formField(formData,name);
  if(data.length>maxLength)return null;
  return data;
}

// Does not allow role, email, approval, PVMC number, identity ID or upload paths to be modified.
export async function correctUserDossierAction(formData:FormData) {
  const admin=await requireAdminPermission("users.manage","/admin/users");
  const id=formField(formData,"user_id");
  if(!isUuid(id))redirect("/admin/users?error=Invalid%20record");
  if(!admin.roles.includes("super_admin"))feedback(id,"error","Only Super Administrators can correct account identity fields.");
  const fullName=limited(formData,"full_name",120);
  if(fullName===null)feedback(id,"error","Full name is too long.");
  const nameIssue=profileNameProblem(fullName);
  if(nameIssue)feedback(id,"error",nameIssue);
  const editable=["phone","city","province","district","tehsil"] as const;
  const fields:Record<string,string|null>={full_name:fullName};
  for(const key of editable){
    const val=limited(formData,key,key==="phone"?35:100);
    if(val===null)feedback(id,"error","A location/contact field exceeds its allowed length.");
    fields[key]=val||null;
  }
  const supabase=await createClient();
  const {data:previous,error:readError}=await supabase.from("profiles").select("full_name,phone,city,province,district,tehsil").eq("id",id).maybeSingle();
  if(readError||!previous)feedback(id,"error","Account could not be loaded for editing.");
  const {data:updated,error}=await supabase.from("profiles").update(fields).eq("id",id).select("id").maybeSingle();
  if(error||!updated)feedback(id,"error",error?.message||"The database did not confirm your change.");
  const {error:auditError}=await supabase.from("audit_logs").insert({
    actor_id:admin.userId,action:"user.profile_corrected",entity_type:"user",entity_id:id,
    metadata:{source:"admin_dossier",changed_fields:Object.keys(fields).filter(k=>fields[k]!==previous[k as keyof typeof previous]),previous_full_name:previous.full_name}
  });
  revalidatePath("/admin");revalidatePath("/admin/users");revalidatePath(`/admin/users/${id}`);
  feedback(id,"message",auditError?"Saved, but audit logging failed. Notify the platform administrator.":"Account details corrected. The change was recorded in the audit log.");
}

export async function correctSpecialistDossierAction(formData:FormData) {
  const admin=await requireAdminPermission("profiles.review","/admin/reviews");
  const id=formField(formData,"user_id");
  if(!isUuid(id))redirect("/admin/users?error=Invalid%20record");
  if(!admin.roles.includes("super_admin"))feedback(id,"error","Only Super Administrators can change submitted specialist details.");
  const kind=formField(formData,"profile_kind");
  if(kind!=="veterinarian"&&kind!=="professional")feedback(id,"error","Invalid specialist record type.");
  const supabase=await createClient();
  const table=kind==="veterinarian"?"veterinarian_profiles":"professional_profiles";
  const permitted=kind==="veterinarian" ? ["qualifications","veterinary_sector","specialization"] as const : ["professional_type","headline","organization_name"] as const;
  const update:Record<string,string|null>={};
  for(const key of permitted){
    const value=limited(formData,key,500);
    if(value===null)feedback(id,"error","A specialist field exceeds 500 characters.");
    update[key]=value||null;
  }
  const {data:old,error:readError}=await supabase.from(table).select("*").eq("user_id",id).maybeSingle();
  if(readError||!old)feedback(id,"error","Specialist profile could not be loaded.");
  const {data:changed,error}=await supabase.from(table).update(update).eq("user_id",id).select("user_id").maybeSingle();
  if(error||!changed)feedback(id,"error",error?.message||"The database did not confirm this edit.");
  const {error:auditError}=await supabase.from("audit_logs").insert({
    actor_id:admin.userId,action:"user.specialist_fields_corrected",entity_type:kind,entity_id:id,
    metadata:{source:"admin_dossier",changed_fields:Object.keys(update).filter(k=>update[k]!==old[k])}
  });
  revalidatePath("/admin");revalidatePath("/admin/reviews");revalidatePath(`/admin/users/${id}`);revalidatePath("/vets");revalidatePath("/professionals");
  feedback(id,"message",auditError?"Specialist fields saved but audit logging failed; notify the platform administrator.":"Specialist details corrected; verification decisions were not changed.");
}
