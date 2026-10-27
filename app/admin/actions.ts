"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth";
import { getEffectiveAdminPermission } from "@/lib/admin";
import {vetProfileApprovalProblem,veterinaryCredentialApprovalProblem,credentialDataFlags} from "@/lib/veterinary-verification";

export async function reviewProfileAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!(await getEffectiveAdminPermission(identity, "profiles.review"))) redirect("/dashboard?error=Admin%20access%20is%20required.");

  const profileType = String(formData.get("profile_type") ?? "");
  const recordSource = String(formData.get("record_source") ?? "account");
  const userId = String(formData.get("user_id") ?? "");
  const entityId = String(formData.get("entity_id") ?? userId);
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const requestedReturnTo = String(formData.get("return_to") ?? "");
  const directoryKind = recordSource === "managed_people" ? "managed_person" : recordSource === "companies" ? "company" : recordSource === "clinics" ? "clinic" : recordSource === "laboratories" ? "laboratory" : null;
  const allowedDirectoryReturn = directoryKind ? `/admin/directory/${directoryKind}/${entityId}` : null;
  const returnTo = recordSource === "account" && requestedReturnTo === `/admin/users/${entityId}` ? requestedReturnTo
    : allowedDirectoryReturn === requestedReturnTo ? allowedDirectoryReturn : null;
  if (!entityId || !["veterinarian", "company", "professional", "laboratory", "clinic"].includes(profileType) || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20review%20request.");
  }

  const supabase = await createClient();
  const reviewedAt = decision === "approved" ? new Date().toISOString() : null;
  let error: { message: string } | null = null;

  if (recordSource === "managed_people") {
    const { data: managed } = await supabase
      .from("managed_people")
      .select("profile_kind,pvmc_verification_status")
      .eq("id", entityId)
      .maybeSingle();
    if (decision === "approved" && managed?.profile_kind === "veterinarian") {
      const {data:vetData,error:vetError}=await supabase.from("managed_people").select("qualifications").eq("id",entityId).maybeSingle();
      const problem=vetError?"Unable to load veterinary qualification":vetProfileApprovalProblem(vetData?.qualifications);
      if(problem) redirect(`${returnTo||"/admin/reviews"}?error=${encodeURIComponent(problem)}`);
    }
    const publishNow = decision === "approved" && managed?.profile_kind === "professional";
    const result = await supabase.from("managed_people").update({
      verification_status: decision,
      is_published: publishNow,
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
      updated_by: identity.userId,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "companies") {
    const result = await supabase.from("companies").update({
      verification_status: decision,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "clinics") {
    const result = await supabase.from("clinics").update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted clinic information." : null,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else if (recordSource === "laboratories" || profileType === "laboratory") {
    const result = await supabase.from("laboratories").update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted laboratory information." : null,
      is_published: decision === "approved",
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
    }).eq("id", entityId);
    error = result.error;
  } else {
    if (!userId) redirect("/admin/reviews?error=User%20profile%20ID%20is%20missing.");
    const table = {
      veterinarian: "veterinarian_profiles",
      company: "company_profiles",
      professional: "professional_profiles",
    }[profileType] as "veterinarian_profiles" | "company_profiles" | "professional_profiles" | undefined;
    if (!table) redirect("/admin/reviews?error=Invalid%20account%20profile%20type.");
    if(decision==="approved" && profileType==="veterinarian") {
      const {data:vetData,error:vetError}=await supabase.from("veterinarian_profiles").select("qualifications").eq("user_id",entityId).maybeSingle();
      const problem=vetError?"Unable to load veterinary qualification":vetProfileApprovalProblem(vetData?.qualifications);
      if(problem) redirect(`${returnTo||"/admin/reviews"}?error=${encodeURIComponent(problem)}`);
    }
    const result = await supabase.from(table).update({
      verification_status: decision,
      rejection_reason: decision === "rejected" ? reason || "Please update the submitted information." : null,
      verified_at: reviewedAt,
      verified_by: decision === "approved" ? identity.userId : null,
      ...(profileType === "professional" ? { profile_visibility: decision === "approved" ? "public" : "owner_only" } : {}),
    }).eq("user_id", entityId);
    error = result.error;

    if (!error && profileType === "company") {
      const { data: companyProfile } = await supabase
        .from("company_profiles")
        .select("company_name,legal_name,trade_name,business_type,description,city,address,website,contact_email,logo_url")
        .eq("user_id", entityId)
        .maybeSingle();
      if (companyProfile) {
        const canonicalResult = await supabase.from("companies").update({
          canonical_name: companyProfile.legal_name || companyProfile.trade_name || companyProfile.company_name || "Unnamed Company",
          legal_name: companyProfile.legal_name,
          trade_name: companyProfile.trade_name,
          business_type: companyProfile.business_type,
          description: companyProfile.description,
          city: companyProfile.city,
          address: companyProfile.address,
          website: companyProfile.website,
          public_email: companyProfile.contact_email,
          logo_url: companyProfile.logo_url,
          verification_status: decision,
          is_published: decision === "approved",
          verified_at: reviewedAt,
          verified_by: decision === "approved" ? identity.userId : null,
        }).eq("legacy_company_user_id", entityId);
        error = canonicalResult.error;
      }
    }
  }

  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `${recordSource}.${profileType}.${decision}`,
    entity_type: profileType,
    entity_id: entityId,
    metadata: { reason: reason || null, record_source: recordSource },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directory");
  revalidatePath("/vets");
  revalidatePath("/professionals");
  revalidatePath("/companies");
  revalidatePath("/clinics");
  revalidatePath("/labs");
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?message=${encodeURIComponent(`Profile ${decision}; review recorded.`)}`);
  }
  redirect(`/admin/reviews?message=${encodeURIComponent(`Profile ${decision}.`)}`);
}

export async function reviewVeterinarianCredentialAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!(await getEffectiveAdminPermission(identity, "regulatory.review"))) redirect("/dashboard?error=Verification%20access%20is%20required.");

  const userId = String(formData.get("user_id") ?? "");
  const recordSource = String(formData.get("record_source") ?? "account");
  const requestedReturnTo = String(formData.get("return_to") ?? "");
  const returnTo = recordSource === "account" && requestedReturnTo === `/admin/users/${userId}` ? requestedReturnTo
    : recordSource === "managed_people" && requestedReturnTo === `/admin/directory/managed_person/${userId}` ? requestedReturnTo : null;
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !["approved", "rejected"].includes(decision)) redirect("/admin/reviews?error=Invalid%20credential%20review%20request.");

  const supabase = await createClient();
  const reviewedAt = decision === "approved" ? new Date().toISOString() : null;
  if (decision==="approved") {
    const table=recordSource==="managed_people"?"managed_people":"veterinarian_profiles";
    const idField=recordSource==="managed_people"?"id":"user_id";
    const {data,error}=await supabase.from(table).select("qualifications,pvmc_number,verification_status,pvmc_verification_status").eq(idField,userId).maybeSingle();
    if(error || !data) redirect(`${returnTo||"/admin/reviews"}?error=${encodeURIComponent("Could not retrieve the veterinary credential record.")}`);
    const problem=veterinaryCredentialApprovalProblem(data,reason);
    if(problem) redirect(`${returnTo||"/admin/reviews"}?error=${encodeURIComponent(problem)}`);
  }
  if (recordSource === "managed_people") {
    const { data: managed } = await supabase.from("managed_people").select("verification_status").eq("id", userId).maybeSingle();
    const result = await supabase.from("managed_people").update({
      pvmc_verification_status: decision,
      is_published: decision === "approved" && managed?.verification_status === "approved",
      updated_by: identity.userId,
    }).eq("id", userId);
    if (result.error) redirect(`/admin/reviews?error=${encodeURIComponent(result.error.message)}`);
  } else {
    const result = await supabase.from("veterinarian_profiles").update({
      pvmc_verification_status: decision,
      pvmc_verified_at: reviewedAt,
      pvmc_verified_by: decision === "approved" ? identity.userId : null,
      rejection_reason: decision === "rejected" ? reason || "PVMC credential verification could not be completed." : null,
    }).eq("user_id", userId);
    if (result.error) redirect(`/admin/reviews?error=${encodeURIComponent(result.error.message)}`);
  }

  await supabase.from("verification_records").insert({
    entity_type: "veterinarian",
    entity_id: userId,
    verification_type: "pvmc_credential",
    status: decision,
    notes: reason || null,
    reviewed_by: identity.userId,
    reviewed_at: new Date().toISOString(),
  });
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `${recordSource}.veterinarian.pvmc.${decision}`,
    entity_type: "veterinarian",
    entity_id: userId,
    metadata: { reason: reason || null, record_source: recordSource },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directory");
  revalidatePath("/vets");
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?message=${encodeURIComponent(`PVMC credential ${decision}; review recorded.`)}`);
  }
  redirect(`/admin/reviews?message=${encodeURIComponent(`PVMC credential ${decision}.`)}`);
}

// Reopens an already-APPROVED but internally inconsistent veterinary credential.
// This action does NOT accuse the owner of misconduct. It pauses a misleading verified claim
// pending a documented PVMC registry / qualification review by an authorized officer.
export async function reopenVeterinaryCredentialAction(formData:FormData) {
 const identity=await getCurrentIdentity();
 if(!identity) redirect("/login?next=/admin");
 if(!identity.roles.includes("super_admin") || !(await getEffectiveAdminPermission(identity,"regulatory.review"))) {
   redirect("/dashboard?error=Regulatory%20super-admin%20approval%20required.");
 }
 const id=String(formData.get("user_id")??"");
 const note=String(formData.get("reason")??"").trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect("/admin/credential-recheck?error=Invalid%20record");
 const returnTo=`/admin/users/${id}`;
 if(note.length<25 || note.length>1500) redirect(`${returnTo}?error=${encodeURIComponent("Please document a review reason (25 to 1500 characters).")}`);
 const supabase=await createClient();
 const {data:existing,error:loadError}=await supabase.from("veterinarian_profiles")
   .select("qualifications,pvmc_number,verification_status,pvmc_verification_status").eq("user_id",id).maybeSingle();
 if(loadError||!existing) redirect(`${returnTo}?error=Unable%20to%20load%20credential%20record`);
 if(existing.pvmc_verification_status!=="approved" || !credentialDataFlags(existing).length) {
   redirect(`${returnTo}?error=${encodeURIComponent("Credential is not currently flagged for data reconciliation.")}`);
 }
 const {data:updated,error}=await supabase.from("veterinarian_profiles").update({
   pvmc_verification_status:"pending", pvmc_verified_at:null,pvmc_verified_by:null
 }).eq("user_id",id).eq("pvmc_verification_status","approved").select("user_id").maybeSingle();
 if(error||!updated) redirect(`${returnTo}?error=${encodeURIComponent(error?.message||"Could not reopen credential review.")}`);
 const [{error:historyError},{error:auditError}]=await Promise.all([
  supabase.from("verification_records").insert({
    entity_type:"veterinarian",entity_id:id,verification_type:"pvmc_credential",
    status:"pending",notes:note,reviewed_by:identity.userId,reviewed_at:new Date().toISOString()
  }),
  supabase.from("audit_logs").insert({
    actor_id:identity.userId,action:"account.veterinarian.pvmc.recheck_requested",
    entity_type:"veterinarian",entity_id:id,
    metadata:{reason:note,previous_pvmc_status:"approved",new_pvmc_status:"pending",source:"credential_recheck"}
  })
 ]);
 revalidatePath("/admin");revalidatePath("/admin/users");revalidatePath(returnTo);
 revalidatePath("/admin/reviews");revalidatePath("/admin/credential-recheck");revalidatePath("/vets");
 const message=historyError||auditError?"Credential reopened, but one or more audit entries failed; escalate to the system administrator.":
 "PVMC credential returned to pending for documented re-verification.";
 redirect(`${returnTo}?message=${encodeURIComponent(message)}`);
}

export async function reviewProductAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!(await getEffectiveAdminPermission(identity, "products.manage"))) {
    redirect("/dashboard?error=Admin%20access%20is%20required.");
  }

  const productId = String(formData.get("product_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!productId || !["approved", "rejected"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20product%20review%20request.");
  }

  const supabase = await createClient();
  const reviewedAt = new Date().toISOString();
  const { error } = await supabase
    .from("products")
    .update({
      verification_status: decision,
      rejection_reason:
        decision === "rejected"
          ? reason || "Please update the submitted product information."
          : null,
      is_published: decision === "approved",
      verified_at: decision === "approved" ? reviewedAt : null,
      verified_by: decision === "approved" ? identity.userId : null,
      published_at: decision === "approved" ? reviewedAt : null,
      published_by: decision === "approved" ? identity.userId : null,
      archived_at: null,
      archived_by: null,
    })
    .eq("id", productId);
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `product.${decision}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { reason: reason || null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
  revalidatePath("/dashboard/company");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Product ${decision}.`)}`);
}

export async function reviewJobAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin/reviews");
  if (!(await getEffectiveAdminPermission(identity, "jobs.manage"))) redirect("/dashboard?error=Job%20review%20permission%20is%20required.");
  const jobId=String(formData.get("job_id") ?? "");
  const decision=String(formData.get("decision") ?? "");
  if(!jobId || !["approved","rejected"].includes(decision))
    redirect("/admin/reviews?error=Invalid%20review%20request.");

  const supabase=await createClient();
  const {data:current,error:loadError}=await supabase.from("jobs")
    .select("id,sector").eq("id",jobId).eq("verification_status","pending").eq("is_published",false).maybeSingle();
  if(loadError || !current)redirect("/admin/reviews?error=Pending%20job%20not%20found.");

  let updates: Record<string,unknown>={verification_status:decision,is_published:decision==="approved"};
  if(decision==="approved"){
    const sector=String(formData.get("review_sector")??"").trim();
    const qualification=String(formData.get("review_qualification")??"").trim();
    const experience=String(formData.get("review_experience")??"").trim();
    if(qualification.length>200 || sector.length>150)redirect("/admin/reviews?error=Job%20data%20too%20long.");
    if(experience && (!/^\d+$/.test(experience)||!Number.isSafeInteger(Number(experience))))
      redirect("/admin/reviews?error=Invalid%20experience.");
    if(sector){
      const {data:approvedSector,error:sectorError}=await supabase.from("master_data_items")
        .select("id").eq("category","job_sector").eq("is_active",true).ilike("label",sector).limit(1);
      if(sectorError || !approvedSector?.length)redirect("/admin/reviews?error=Approve%20the%20new%20sector%20in%20Data%20Studio%20before%20publishing.");
    }
    updates={...updates,sector:sector||null,minimum_qualification:qualification||null,minimum_experience:experience?Number(experience):null};
  }
  const {data:saved,error}=await supabase.from("jobs").update(updates)
    .eq("id",jobId).eq("verification_status","pending").eq("is_published",false).select("id").maybeSingle();
  if(error)redirect("/admin/reviews?error="+encodeURIComponent(error.message));
  if(!saved)redirect("/admin/reviews?error=Job%20already%20reviewed%20or%20unavailable.");
  await supabase.from("audit_logs").insert({
    actor_id:identity.userId,action:"job."+decision,entity_type:"job",entity_id:jobId,
    metadata:{sector_corrected:decision==="approved" && current.sector!==updates.sector},
  });
  revalidatePath("/admin");revalidatePath("/admin/reviews");revalidatePath("/jobs");
  redirect("/admin/reviews?message="+encodeURIComponent("Job "+decision+"."));
}

export async function reviewProductRegulatoryAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!(await getEffectiveAdminPermission(identity, "regulatory.review"))) {
    redirect("/dashboard?error=Verification%20access%20is%20required.");
  }
  const productId = String(formData.get("product_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!productId || !["verified", "not_applicable", "returned"].includes(decision)) {
    redirect("/admin/reviews?error=Invalid%20regulatory%20review%20request.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_regulatory")
    .update({
      verification_status: decision,
      reviewer_notes: notes || null,
      verified_at: ["verified", "not_applicable"].includes(decision) ? new Date().toISOString() : null,
      verified_by: ["verified", "not_applicable"].includes(decision) ? identity.userId : null,
    })
    .eq("product_id", productId);
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`);
  const { error: productError } = await supabase
    .from("products")
    .update({ regulatory_review_status: decision })
    .eq("id", productId);
  if (productError) redirect(`/admin/reviews?error=${encodeURIComponent(productError.message)}`);
  await supabase.from("audit_logs").insert({
    actor_id: identity.userId,
    action: `product.regulatory.${decision}`,
    entity_type: "product",
    entity_id: productId,
    metadata: { notes: notes || null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
  redirect(`/admin/reviews?message=${encodeURIComponent(`Regulatory review marked ${decision.replaceAll("_", " ")}.`)}`);
}


export async function reviewRegistrationSubmissionAction(formData: FormData) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin/reviews");
  if (!(await getEffectiveAdminPermission(identity, "profiles.review"))) redirect("/dashboard?error=Admin%20access%20is%20required.");
  const userId=String(formData.get("user_id")??"");
  const decision=String(formData.get("decision")??"");
  const reason=String(formData.get("reason")??"").trim();
  if(!userId||!["approved","rejected"].includes(decision)) redirect("/admin/reviews?error=Invalid%20registration%20review.");
  if(decision==="rejected"&&!reason) redirect("/admin/reviews?error=A%20review%20note%20is%20required.");
  const supabase=await createClient();
  const [{data:profile},{data:gate},{data:docs}] = await Promise.all([
    supabase.from("profiles").select("primary_role,full_name,email").eq("id",userId).maybeSingle(),
    supabase.from("registration_completion_gate").select("registration_intent,student_track,review_status,cnic_number").eq("user_id",userId).maybeSingle(),
    supabase.from("registration_evidence").select("document_type,storage_path,content_type,verification_status").eq("user_id",userId).eq("verification_status","pending").order("created_at",{ascending:false}),
  ]);
  if(!profile||!gate||gate.review_status!=="pending") redirect("/admin/reviews?error=This%20registration%20is%20not%20waiting%20for%20review.");
  let publicImageUrl: string|null=null;
  let publicPath: string|null=null;
  if(decision==="approved") {
    const imageType=["company","laboratory"].includes(profile.primary_role)?"company_logo":"profile_photo";
    const image=docs?.find(row=>row.document_type===imageType);
    if(!image) redirect("/admin/reviews?error=Required%20photo%20or%20logo%20is%20missing.");
    const {data:blob,error:downloadError}=await supabase.storage.from("registration-evidence").download(image.storage_path);
    if(downloadError||!blob) redirect("/admin/reviews?error=The%20submitted%20photo%20or%20logo%20could%20not%20be%20read.");
    const extension=image.content_type==="image/png"?"png":image.content_type==="image/webp"?"webp":"jpg";
    publicPath=identity.userId+"/registration-"+userId+"-"+crypto.randomUUID()+"."+extension;
    const {error:uploadError}=await supabase.storage.from("profile-media").upload(publicPath,blob,{contentType:image.content_type,upsert:false});
    if(uploadError) redirect("/admin/reviews?error="+encodeURIComponent("Approved image could not be published: "+uploadError.message));
    publicImageUrl=supabase.storage.from("profile-media").getPublicUrl(publicPath).data.publicUrl;
  }
  const {error}=await supabase.rpc("review_registration_submission",{
    p_user_id:userId,p_decision:decision,p_reason:reason||null,p_reviewer_id:identity.userId,p_public_image_url:publicImageUrl,
  });
  if(error){
    if(publicPath) await supabase.storage.from("profile-media").remove([publicPath]);
    redirect("/admin/reviews?error="+encodeURIComponent(error.message));
  }
  await supabase.from("audit_logs").insert({actor_id:identity.userId,action:"registration."+decision,entity_type:"registration",entity_id:userId,metadata:{note:reason||null,category:profile.primary_role}});
  const email=String(profile.email??"");
  const {notifyRegistrationDecision}=await import("@/lib/registration-notifications");
  await notifyRegistrationDecision({email,name:String(profile.full_name??email),category:profile.primary_role,userId,decision:decision as "approved"|"rejected",reason});
  revalidatePath("/admin/reviews"); revalidatePath("/dashboard"); revalidatePath("/register/status");
  revalidatePath("/vets"); revalidatePath("/professionals"); revalidatePath("/companies"); revalidatePath("/labs");
  redirect("/admin/reviews?message="+encodeURIComponent("Registration "+decision+"."));
}
