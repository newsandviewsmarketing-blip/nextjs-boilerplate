"use server";

import {proposeJobMasterTerms,emailJobReviewNotice} from "@/lib/job-review-helpers";
import {jobAdvertFile,saveJobAdvertImage} from "@/lib/job-advert-image";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import {registrationExtraFields,PRACTICE_AREAS,SPECIALIZATIONS} from "@/lib/registration-categories";
import { createClient } from "@/lib/supabase/server";
import {
  recordUploadedDocument,
  uploadPrivateDocument,
  uploadPublicImage,
  uploadedFile,
} from "@/lib/admin-uploads";

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function optional(form: FormData, key: string) { return text(form, key) || null; }
function list(form: FormData, key: string) { return text(form, key).split(",").map((x) => x.trim()).filter(Boolean); }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "record"; }
function uniqueSlug(value: string) { return `${slugify(value)}-${Date.now().toString(36)}`; }
function createError(type: string, message: string): never {
  return redirect(`/admin/create?type=${type}&error=${encodeURIComponent(message)}`);
}
async function saveDocument(
  formData: FormData,
  key: string,
  documentKind: string,
  entityType: string,
  entityId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const document = await uploadPrivateDocument(supabase, uploadedFile(formData, key), userId, entityType, documentKind);
  await recordUploadedDocument(supabase, entityType, entityId, userId, document);
}

export async function createManagedPersonAction(formData: FormData) {
  const identity = await requireAdminPermission("profiles.create", "/admin/create?type=person");
  const publish = formData.get("publish_now") === "on";
  const fullName = text(formData, "full_name");
  const profileKind = text(formData, "profile_kind") || "professional";
  if (!fullName) createError("person", "Full name is required.");
  if (!["veterinarian", "professional"].includes(profileKind)) createError("person", "Invalid profile type.");
  // Entering a PVMC number is not credential verification. Veterinarians stay unpublished.
  const canPublishNow = publish && profileKind === "professional";
  if (canPublishNow) await requireAdminPermission("profiles.review", "/admin/create?type=person");
  const pvmc = optional(formData, "pvmc_number");
  const mode=text(formData,"assisted_profile_mode");
  if(!["veterinarian","professional","student"].includes(mode))createError("person","Select a valid registration category.");
  if((mode==="veterinarian")!==(profileKind==="veterinarian"))createError("person","Veterinary professional category does not match the form.");
  const practiceAreas=formData.getAll("practice_areas").map(String).filter(x=>(PRACTICE_AREAS as readonly string[]).includes(x));
  const specializations=formData.getAll("specializations").map(String).filter(x=>(SPECIALIZATIONS as readonly string[]).includes(x));
  if(mode==="veterinarian"){
    const check=registrationExtraFields(formData,"veterinarian","");
    if(check.error)createError("person",check.error);
  }
  if(mode==="student"&&!text(formData,"organization_name"))createError("person","University/college is required for students.");
  if(mode==="professional"&&!text(formData,"professional_type"))createError("person","Choose an allied professional role.");
  const sector=mode==="veterinarian"?practiceAreas[0]??null:optional(formData,"veterinary_sector");
  const specialization=mode==="veterinarian"?[...specializations,optional(formData,"specialization_other")].filter(Boolean).join(", "):optional(formData,"specialization_other");
  const allServices=[...new Set([...practiceAreas.map(x=>"Practice area: "+x),...list(formData,"services")])];
  const supabase = await createClient();
  const { data, error } = await supabase.from("managed_people").insert({
    full_name: fullName, slug: uniqueSlug(fullName), profile_kind: profileKind,
    contact_email: optional(formData,"contact_email"), public_phone: optional(formData,"public_phone"),
    qualifications: optional(formData,"qualifications"), professional_type: optional(formData,"professional_type"),
    headline: optional(formData,"headline"), public_summary: optional(formData,"public_summary"),
    current_position: optional(formData,"current_position"), organization_name: optional(formData,"organization_name"),
    pvmc_number: pvmc, veterinary_sector: sector, specialization: specialization || null,
    services: allServices, skills: list(formData,"skills"), years_experience: Number(text(formData,"years_experience") || 0),
    province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"),
    address: optional(formData,"address"), google_maps_url: optional(formData,"google_maps_url"), image_url: optional(formData,"image_url"),
    verification_status: canPublishNow ? "approved" : "pending",
    pvmc_verification_status: "pending",
    is_published: canPublishNow, verified_by: canPublishNow ? identity.userId : null, verified_at: canPublishNow ? new Date().toISOString() : null,
    created_by: identity.userId, updated_by: identity.userId,
  }).select("id").single();
  if (error || !data) createError("person", error?.message ?? "Could not create profile.");

  if(mode==="student"){
    // Private administrative evidence, not public skills, bios or RVMP licence.
    const {error:studentLogError}=await supabase.from("audit_logs").insert({
      actor_id:identity.userId,entity_type:"managed_person",entity_id:data.id,
      action:"assisted.student_enrollment_submitted",
      metadata:{
        study_program:text(formData,"study_program").slice(0,120),
        institution:text(formData,"organization_name").slice(0,180),
        academic_year:text(formData,"academic_year").slice(0,60),
        student_college_registration_number:text(formData,"student_college_registration_number").slice(0,75)||null,
        pvmc_student_reference:text(formData,"pvmc_student_reference").slice(0,75)||null,
        registration_status:"self_reported_pending_verification"
      }
    });
    if(studentLogError)createError("person","Student profile was created, but private registration evidence was not filed. Contact an administrator before continuing.");
  }
  try {
    const imageUrl = await uploadPublicImage(supabase, uploadedFile(formData, "profile_image"), identity.userId, "person");
    if (imageUrl) await supabase.from("managed_people").update({ image_url: imageUrl, updated_by: identity.userId }).eq("id", data.id);
    await saveDocument(formData, "supporting_document", "professional_supporting_document", "person", String(data.id), identity.userId, supabase);
    if (profileKind === "veterinarian") await saveDocument(formData, "credential_document", "pvmc_credential_evidence", "person", String(data.id), identity.userId, supabase);
  } catch (uploadError) {
    createError("person", `Profile saved, but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown upload error"}`);
  }

  revalidatePath("/admin/directory"); revalidatePath("/vets"); revalidatePath("/professionals");
  redirect(`/admin/create?type=person&message=${encodeURIComponent(profileKind === "veterinarian" ? "Veterinarian saved for profile and PVMC credential review." : "Assisted profile created.")}`);
}

export async function createCompanyAction(formData: FormData) {
  const identity = await requireAdminPermission("companies.create", "/admin/create?type=company");
  const publish = formData.get("publish_now") === "on";
  if (publish) await requireAdminPermission("directories.manage", "/admin/create?type=company");
  const name = text(formData,"canonical_name");
  if (!name) createError("company", "Company name is required.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").insert({
    canonical_name: name, legal_name: optional(formData,"legal_name"), trade_name: optional(formData,"trade_name"), slug: uniqueSlug(name),
    business_type: optional(formData,"business_type"), description: optional(formData,"description"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), logo_url: optional(formData,"logo_url"),
    verification_status: publish ? "approved" : "pending", is_published: publish, created_by: identity.userId, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null,
  }).select("id").single();
  if (error || !data) createError("company", error?.message ?? "Could not create company.");
  try {
    const logoUrl = await uploadPublicImage(supabase, uploadedFile(formData, "logo_file"), identity.userId, "company");
    if (logoUrl) await supabase.from("companies").update({ logo_url: logoUrl }).eq("id", data.id);
    await saveDocument(formData, "supporting_document", "company_registration_evidence", "company", String(data.id), identity.userId, supabase);
  } catch (uploadError) {
    createError("company", `Company saved, but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown upload error"}`);
  }
  revalidatePath("/admin/directory"); revalidatePath("/companies");
  redirect("/admin/create?type=company&message=Company%20record%20created.");
}

export async function createClinicAction(formData: FormData) {
  const identity = await requireAdminPermission("clinics.manage", "/admin/create?type=clinic");
  const name = text(formData,"clinic_name"); if (!name) createError("clinic", "Clinic name is required.");
  const publish = formData.get("publish_now") === "on";
  const supabase = await createClient();
  const { data, error } = await supabase.from("clinics").insert({ owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), clinic_name: name, facility_type: text(formData,"facility_type") || "Veterinary Clinic", description: optional(formData,"description"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), working_hours: optional(formData,"working_hours"), emergency_service: formData.get("emergency_service") === "on", services: list(formData,"services"), species: list(formData,"species"), verification_status: publish ? "approved" : "pending", is_published: publish, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null }).select("id").single();
  if (error || !data) createError("clinic", error?.message ?? "Could not create clinic.");
  try {
    const [logoUrl, coverUrl] = await Promise.all([
      uploadPublicImage(supabase, uploadedFile(formData, "logo_file"), identity.userId, "clinic-logo"),
      uploadPublicImage(supabase, uploadedFile(formData, "cover_file"), identity.userId, "clinic-cover"),
    ]);
    if (logoUrl || coverUrl) await supabase.from("clinics").update({ ...(logoUrl ? { logo_url: logoUrl } : {}), ...(coverUrl ? { cover_image_url: coverUrl } : {}) }).eq("id", data.id);
    await saveDocument(formData, "supporting_document", "clinic_registration_evidence", "clinic", String(data.id), identity.userId, supabase);
  } catch (uploadError) {
    createError("clinic", `Clinic saved, but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown upload error"}`);
  }
  revalidatePath("/admin/directory"); revalidatePath("/clinics");
  redirect("/admin/create?type=clinic&message=Clinic%20record%20created.");
}

export async function createLaboratoryAction(formData: FormData) {
  const identity = await requireAdminPermission("laboratories.manage", "/admin/create?type=laboratory");
  const name = text(formData,"laboratory_name"); if (!name) createError("laboratory", "Laboratory name is required.");
  const publish = formData.get("publish_now") === "on";
  const supabase = await createClient();
  const { data, error } = await supabase.from("laboratories").insert({ owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), laboratory_name: name, laboratory_type: text(formData,"laboratory_type") || "Diagnostic Laboratory", description: optional(formData,"description"), technical_head: optional(formData,"technical_head"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), working_hours: optional(formData,"working_hours"), tests_offered: list(formData,"tests_offered"), species_served: list(formData,"species_served"), verification_status: publish ? "approved" : "pending", is_published: publish, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null }).select("id").single();
  if (error || !data) createError("laboratory", error?.message ?? "Could not create laboratory.");
  try {
    const [logoUrl, coverUrl] = await Promise.all([
      uploadPublicImage(supabase, uploadedFile(formData, "logo_file"), identity.userId, "laboratory-logo"),
      uploadPublicImage(supabase, uploadedFile(formData, "cover_file"), identity.userId, "laboratory-cover"),
    ]);
    if (logoUrl || coverUrl) await supabase.from("laboratories").update({ ...(logoUrl ? { logo_url: logoUrl } : {}), ...(coverUrl ? { cover_image_url: coverUrl } : {}) }).eq("id", data.id);
    await saveDocument(formData, "supporting_document", "laboratory_accreditation_evidence", "laboratory", String(data.id), identity.userId, supabase);
  } catch (uploadError) {
    createError("laboratory", `Laboratory saved, but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown upload error"}`);
  }
  revalidatePath("/admin/directory"); revalidatePath("/labs");
  redirect("/admin/create?type=laboratory&message=Laboratory%20record%20created.");
}

export async function createAdminProductAction(formData: FormData) {
  const identity = await requireAdminPermission("products.create", "/admin/create?type=product");
  const name = text(formData,"product_name"); const companyId = text(formData,"company_id");
  if (!name || !companyId) createError("product", "Company and product name are required.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").insert({ company_user_id: null, company_id: companyId, slug: uniqueSlug(name), product_name: name, brand_name: optional(formData,"brand_name"), generic_name: optional(formData,"generic_name"), category: text(formData,"category") || "Medicines", sector: optional(formData,"sector"), composition: optional(formData,"composition"), strength: optional(formData,"strength"), dosage_form: optional(formData,"dosage_form"), presentation: optional(formData,"presentation"), packaging_type: optional(formData,"packaging_type"), pack_size_value: optional(formData,"pack_size_value"), pack_size_unit: optional(formData,"pack_size_unit"), vaccine_type: optional(formData,"vaccine_type"), concentration_value: optional(formData,"concentration_value"), concentration_unit: optional(formData,"concentration_unit"), administration_route: optional(formData,"administration_route"), pack_sizes: list(formData,"pack_sizes"), indications: optional(formData,"indications"), description: optional(formData,"description"), verification_status: "pending", is_published: false, verified_by: null }).select("id").single();
  if (error || !data) createError("product", error?.message ?? "Could not create product.");
  try {
    const imageUrl = await uploadPublicImage(supabase, uploadedFile(formData, "product_image"), identity.userId, "product");
    if (imageUrl) {
      await supabase.from("products").update({ image_url: imageUrl }).eq("id", data.id);
      await supabase.from("product_media").insert({ product_id: data.id, media_type: "primary_image", url: imageUrl, alt_text: `${name} product image`, display_order: 0, is_public: true });
    }
    await saveDocument(formData, "supporting_document", "product_regulatory_evidence", "product", String(data.id), identity.userId, supabase);
  } catch (uploadError) {
    createError("product", `Product saved, but upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown upload error"}`);
  }
  revalidatePath("/admin/products"); revalidatePath("/marketplace");
  redirect("/admin/create?type=product&message=Product%20draft%20created%20for%20review.");
}

export async function createAdminJobAction(formData: FormData) {
  const identity = await requireAdminPermission("jobs.create", "/admin/create?type=job");
  let advert:File|null=null;
  try{advert=jobAdvertFile(formData);}catch(e){createError("job",e instanceof Error?e.message:"Invalid job advertisement image.");}
  const title = text(formData, "title");
  const companyId = text(formData, "company_id");
  const selectedScope = text(formData, "coverage_scope");
  const validScopes = ["nationwide", "province", "region", "territory", "area", "district", "city", "multiple", "flexible"];
  if (!title || !companyId) createError("job", "Company and job title are required.");
  if (!validScopes.includes(selectedScope)) createError("job", "Choose a valid recruitment coverage.");

  const hasProvince = !["nationwide","flexible"].includes(selectedScope);
  const province = hasProvince ? optional(formData,"province") : null;
  const regionScope = ["region","territory","area"].includes(selectedScope);
  const regionName = regionScope ? text(formData,"region_name") : "";
  const districts = hasProvince ? [...new Set(list(formData,"coverage_districts"))] : [];
  const cities = hasProvince ? [...new Set(list(formData,"coverage_cities"))] : [];
  const tehsil = hasProvince ? optional(formData,"tehsil") : null;
  if (hasProvince && !province) createError("job","Select a province / territory.");
  if (regionScope && !regionName) createError("job","Enter the company region, territory or area name.");
  if (selectedScope === "district" && districts.length === 0) createError("job","Select at least one district.");
  if (selectedScope === "city" && cities.length === 0) createError("job","Select at least one city.");
  if ((districts.length || cities.length) && !province) createError("job","Selected locations require a province.");

  // Province with selected districts/cities is *not* province-wide.
  const scope = selectedScope === "province" && (districts.length > 0 || cities.length > 0)
    ? "multiple" : selectedScope;
  const label = selectedScope === "nationwide" ? "Across Pakistan" :
    selectedScope === "flexible" ? "Location not specified" :
    text(formData,"coverage_display") || [regionName, province, ...districts, ...cities].filter(Boolean).join(", ");
  if (!label) createError("job","Specify an applicable hiring location.");

  const experience = text(formData,"minimum_experience");
  if (experience && (!/^\d+$/.test(experience) || !Number.isSafeInteger(Number(experience)))) {
    createError("job","Experience must be a nonnegative whole number.");
  }

  const supabase = await createClient();
  const {data: employer, error: companyError} = await supabase.from("companies")
    .select("id").eq("id",companyId).eq("record_status","active").maybeSingle();
  if (companyError || !employer) createError("job","Select a valid active employer company.");
  let regionId: string | null = null;
  if (regionScope) {
    const {data: existing, error: findError} = await supabase.from("company_regions")
      .select("id,region_type,province").eq("company_id",companyId).eq("name",regionName).maybeSingle();
    if (findError) createError("job",findError.message);
    if (existing) {
      if (existing.region_type !== selectedScope || existing.province !== province) {
        createError("job","A different territory with this name exists for this company. Choose a distinct name.");
      }
      regionId = existing.id;
    } else {
      const {data: created, error} = await supabase.from("company_regions").insert({
        company_id:companyId,name:regionName,region_type:selectedScope,province,created_by:identity.userId,
      }).select("id").single();
      if (error || !created) createError("job",error?.message || "Could not register employer territory.");
      regionId = created.id;
    }
  }

  const {data: job,error} = await supabase.from("jobs").insert({
    company_user_id:null,company_id:companyId,slug:uniqueSlug(title),title,
    description:text(formData,"description") || title,
    sector:optional(formData,"sector"),province,
    district: districts.length === 1 ? districts[0] : null,
    city: cities.length === 1 ? cities[0] : null,
    tehsil,address:optional(formData,"address"),
    employment_type:text(formData,"employment_type") || "Not specified",
    minimum_qualification:optional(formData,"minimum_qualification"),
    minimum_experience:experience ? Number(experience) : null,
    deadline:optional(formData,"deadline"),
    verification_status:"pending",is_published:false,
  }).select("id").single();
  if (error || !job) createError("job",error?.message || "Could not create job.");
  const createdJobId: string = job.id;

  async function removeIncompleteJob(message: string): Promise<never> {
    const {error:cleanupError} = await supabase.from("jobs").delete().eq("id",createdJobId);
    createError("job",cleanupError ? message + " Incomplete draft cleanup also failed." : message + " The incomplete draft was removed.");
  }
  const {error:coverageError} = await supabase.from("job_coverage").insert({
    job_id:job.id,scope,province,region_id:regionId,display_text:label,
  });
  if (coverageError) await removeIncompleteJob("Could not save hiring coverage: " + coverageError.message);

  const places = [
    ...districts.map(name=>({job_id:job.id,area_level:"district",province,district:name,city:null,label:name})),
    ...cities.map(name=>({job_id:job.id,area_level:"city",province,district:null,city:name,label:name})),
  ];
  if (places.length) {
    const {error:areasError} = await supabase.from("job_coverage_areas").insert(places);
    if (areasError) await removeIncompleteJob("Could not save selected locations: " + areasError.message);
  }

  // Record company geography without altering official province/district definitions.
  if (regionId && places.length) {
    const {data: existingAreas, error:readError} = await supabase.from("company_region_areas")
      .select("area_level,label").eq("region_id",regionId);
    if (readError) await removeIncompleteJob("Could not read employer region areas.");
    const known=new Set((existingAreas || []).map(x=>x.area_level + ":" + x.label.toLowerCase()));
    const missing=places.filter(x=>!known.has(x.area_level + ":" + x.label.toLowerCase()));
    if (missing.length) {
      const {error:regionError} = await supabase.from("company_region_areas").insert(
        missing.map(x=>({region_id:regionId,area_level:x.area_level,province,district:x.district,city:x.city,label:x.label}))
      );
      if (regionError) await removeIncompleteJob("Could not save employer region areas: " + regionError.message);
    }
  }

  try {
    await saveDocument(formData,"supporting_document","job_supporting_document","job",String(job.id),identity.userId,supabase);
  } catch(uploadError) {
    createError("job", "Job saved, but document upload failed: " +
      (uploadError instanceof Error ? uploadError.message : "Unknown upload error"));
  }
  try{await saveJobAdvertImage(supabase,createdJobId,identity.userId,advert);}
  catch(err){createError("job","Job draft was saved, but the advertisement image could not be uploaded: "+(err instanceof Error?err.message:"Unknown error"));}
  await proposeJobMasterTerms({
    jobId:createdJobId,userId:identity.userId,
    sector:optional(formData,"sector"),qualification:optional(formData,"minimum_qualification"),
    cities,districts,tehsil,province,
  });
  const {data:companyForEmail}=await supabase.from("companies").select("canonical_name").eq("id",companyId).maybeSingle();
  await emailJobReviewNotice(createdJobId,title,companyForEmail?.canonical_name ?? "Employer");
  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/data");
  redirect("/admin/create?type=job&submitted="+encodeURIComponent(createdJobId));
}
