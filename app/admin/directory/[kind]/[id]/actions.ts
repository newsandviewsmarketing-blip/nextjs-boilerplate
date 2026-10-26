"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireAdminPermission} from "@/lib/admin";
import {createClient} from "@/lib/supabase/server";
import {formField,isUuid} from "@/lib/product-input";
import {profileNameProblem} from "@/lib/profile-name";

const fields={
 company:["canonical_name","legal_name","trade_name","business_type","description","province","district","tehsil","city","address","public_phone","public_email"],
 clinic:["clinic_name","facility_type","description","province","district","tehsil","city","address","public_phone","public_email","working_hours"],
 laboratory:["laboratory_name","laboratory_type","technical_head","description","province","district","tehsil","city","address","public_phone","public_email","working_hours"],
 managed_person:["full_name","headline","professional_type","qualifications","specialization","veterinary_sector","public_summary","current_position","organization_name","city","province","district","tehsil","address"]
} as const;
const tables={company:"companies",clinic:"clinics",laboratory:"laboratories",managed_person:"managed_people"} as const;
function done(kind:string,id:string,type:"message"|"error",message:string):never{
 redirect(`/admin/directory/${kind}/${id}?${type}=${encodeURIComponent(message)}`);
}
export async function correctDirectoryRecordAction(formData:FormData) {
 const identity=await requireAdminPermission("directories.manage","/admin/directory");
 const kind=formField(formData,"record_kind");
 const id=formField(formData,"record_id");
 if(!(kind in tables)||!isUuid(id))redirect("/admin/directory?error=Invalid%20record");
 const type=kind as keyof typeof tables;
 if(!identity.roles.includes("super_admin"))done(type,id,"error","Only Super Administrators may correct directory source data.");
 const allowed=fields[type];
 const record:Record<string,string|null>={};
 for(const field of allowed){
   const value=formField(formData,field);
   if(value.length>(field==="description"||field==="public_summary"?1800:250))done(type,id,"error",field+" is too long.");
   record[field]=value||null;
 }
 const nameField=type==="company"?"canonical_name":type==="clinic"?"clinic_name":type==="laboratory"?"laboratory_name":"full_name";
 const check=profileNameProblem(record[nameField]??"");
 if(check)done(type,id,"error",check);
 const supabase=await createClient();
 const table=tables[type];
 const {data:original,error:readError}=await supabase.from(table).select("*").eq("id",id).maybeSingle();
 if(readError||!original)done(type,id,"error","Original record is unavailable.");
 if(original.verification_status==="approved" && formField(formData,"acknowledge_live_edit")!=="ACKNOWLEDGE"){
  done(type,id,"error","Approved records are public. Type ACKNOWLEDGE before editing live content.");
 }
 const changedKeys=allowed.filter(key=>record[key]!==original[key]);
 if(!changedKeys.length)done(type,id,"message","No directory fields changed.");
 const {data:saved,error}=await supabase.from(table).update(record).eq("id",id).select("id").maybeSingle();
 if(error||!saved)done(type,id,"error",error?.message||"The database did not confirm this change.");
 const {error:auditError}=await supabase.from("audit_logs").insert({
  actor_id:identity.userId,
  action:`directory.${type}.edited`,
  entity_type:type,
  entity_id:id,
  metadata:{source:"admin_directory_dossier",changed_fields:changedKeys,record_verification_at_change:original.verification_status}
 });
 revalidatePath("/admin");
 revalidatePath("/admin/directory");
 revalidatePath(`/admin/directory/${type}/${id}`);
 revalidatePath("/companies");revalidatePath("/clinics");revalidatePath("/labs");revalidatePath("/vets");revalidatePath("/professionals");
 done(type,id,"message",auditError?"Saved, but the audit write failed. Notify the platform owner immediately.":"Directory data updated and logged. Review public visibility if the record is published.");
}
