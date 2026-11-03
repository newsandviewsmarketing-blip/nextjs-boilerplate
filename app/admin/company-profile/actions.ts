"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { companyContactsFromForm,companyPresentationFromForm,companyCoreFromForm,saveCompleteCompanyProfile } from "@/lib/company-profile-editor";
import { uploadPublicImage, uploadedFile, uploadPrivateDocument, recordUploadedDocument } from "@/lib/admin-uploads";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveAdminCompanyProfileAction(form:FormData) {
  const identity=await requireAdminPermission("directories.manage","/admin/directory");
  if (!identity.roles.includes("super_admin")) redirect("/admin/directory?error=Super%20administrator%20access%20required.");
  const id=String(form.get("company_id") ?? "").trim();
  if (!uuid.test(id)) redirect("/admin/directory?error=Invalid%20company%20ID.");
  const base="/admin/company-profile/"+encodeURIComponent(id);
  let message="";
  const supabase=await createClient();
  const {data:company,error:companyError}=await supabase.from("companies")
    .select("id,is_published,verification_status").eq("id",id).maybeSingle();
  if (companyError || !company) redirect(base+"?error=Company%20record%20not%20found.");
  if (company.is_published && company.verification_status==="approved" &&
      String(form.get("acknowledge_live_edit") ?? "").trim()!=="ACKNOWLEDGE") {
    redirect(base+"?error=Confirm%20the%20published%20record%20edit.");
  }
  try {
    companyCoreFromForm(form,"canonical_name");
    companyPresentationFromForm(form);
    companyContactsFromForm(form);
  } catch(error) {
    redirect(base+"?error="+encodeURIComponent(error instanceof Error ? error.message : "Invalid company profile."));
  }
  try {
    const logo=await uploadPublicImage(supabase,uploadedFile(form,"logo_file"),identity.userId,"company");
    await saveCompleteCompanyProfile(supabase,id,form,"canonical_name",logo);
    message="Company public profile and private management hierarchy saved.";
  } catch(error) {
    redirect(base+"?error="+encodeURIComponent(error instanceof Error ? error.message : "Could not save company."));
  }
  // Evidence is private, audit-linked, and never copied into the public profile.
  try {
    const document=await uploadPrivateDocument(supabase,uploadedFile(form,"supporting_document"),identity.userId,"company","company_registration_evidence");
    await recordUploadedDocument(supabase,"company",id,identity.userId,document);
  } catch(error) {
    redirect(base+"?error="+encodeURIComponent("The profile was saved, but private evidence upload failed: "+(error instanceof Error ? error.message : "Unknown error")));
  }
  revalidatePath("/admin/directory");
  revalidatePath("/companies");
  revalidatePath("/companies/"+id);
  redirect(base+"?message="+encodeURIComponent(message));
}
