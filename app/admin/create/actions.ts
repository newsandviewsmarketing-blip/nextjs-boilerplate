"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function optional(form: FormData, key: string) { return text(form, key) || null; }
function list(form: FormData, key: string) { return text(form, key).split(",").map((x) => x.trim()).filter(Boolean); }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "record"; }
function uniqueSlug(value: string) { return `${slugify(value)}-${Date.now().toString(36)}`; }

export async function createManagedPersonAction(formData: FormData) {
  const identity = await requireAdminPermission("profiles.create", "/admin/create?type=person");
  const publish = formData.get("publish_now") === "on";
  if (publish) await requireAdminPermission("profiles.review", "/admin/create?type=person");
  const fullName = text(formData, "full_name");
  const profileKind = text(formData, "profile_kind") || "professional";
  if (!fullName) redirect("/admin/create?type=person&error=Full%20name%20is%20required.");
  const pvmc = optional(formData, "pvmc_number");
  const supabase = await createClient();
  const { error } = await supabase.from("managed_people").insert({
    full_name: fullName, slug: uniqueSlug(fullName), profile_kind: profileKind,
    contact_email: optional(formData,"contact_email"), public_phone: optional(formData,"public_phone"),
    qualifications: optional(formData,"qualifications"), professional_type: optional(formData,"professional_type"),
    headline: optional(formData,"headline"), public_summary: optional(formData,"public_summary"),
    current_position: optional(formData,"current_position"), organization_name: optional(formData,"organization_name"),
    pvmc_number: pvmc, veterinary_sector: optional(formData,"veterinary_sector"), specialization: optional(formData,"specialization"),
    services: list(formData,"services"), skills: list(formData,"skills"), years_experience: Number(text(formData,"years_experience") || 0),
    province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"),
    address: optional(formData,"address"), google_maps_url: optional(formData,"google_maps_url"), image_url: optional(formData,"image_url"),
    verification_status: publish ? "approved" : "pending",
    pvmc_verification_status: publish && profileKind === "veterinarian" && pvmc ? "approved" : "pending",
    is_published: publish, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null,
    created_by: identity.userId, updated_by: identity.userId,
  });
  if (error) redirect(`/admin/create?type=person&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/directory"); revalidatePath("/vets"); revalidatePath("/professionals");
  redirect("/admin/create?type=person&message=Assisted%20profile%20created.");
}

export async function createCompanyAction(formData: FormData) {
  const identity = await requireAdminPermission("companies.create", "/admin/create?type=company");
  const publish = formData.get("publish_now") === "on";
  if (publish) await requireAdminPermission("directories.manage", "/admin/create?type=company");
  const name = text(formData,"canonical_name");
  if (!name) redirect("/admin/create?type=company&error=Company%20name%20is%20required.");
  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    canonical_name: name, legal_name: optional(formData,"legal_name"), trade_name: optional(formData,"trade_name"), slug: uniqueSlug(name),
    business_type: optional(formData,"business_type"), description: optional(formData,"description"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), logo_url: optional(formData,"logo_url"),
    verification_status: publish ? "approved" : "pending", is_published: publish, created_by: identity.userId, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null,
  });
  if (error) redirect(`/admin/create?type=company&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/directory"); revalidatePath("/companies");
  redirect("/admin/create?type=company&message=Company%20record%20created.");
}

export async function createClinicAction(formData: FormData) {
  const identity = await requireAdminPermission("clinics.manage", "/admin/create?type=clinic");
  const name = text(formData,"clinic_name"); if (!name) redirect("/admin/create?type=clinic&error=Clinic%20name%20is%20required.");
  const publish = formData.get("publish_now") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("clinics").insert({ owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), clinic_name: name, facility_type: text(formData,"facility_type") || "Veterinary Clinic", description: optional(formData,"description"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), working_hours: optional(formData,"working_hours"), emergency_service: formData.get("emergency_service") === "on", services: list(formData,"services"), species: list(formData,"species"), verification_status: publish ? "approved" : "pending", is_published: publish, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null });
  if (error) redirect(`/admin/create?type=clinic&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/directory"); revalidatePath("/clinics");
  redirect("/admin/create?type=clinic&message=Clinic%20record%20created.");
}

export async function createLaboratoryAction(formData: FormData) {
  const identity = await requireAdminPermission("laboratories.manage", "/admin/create?type=laboratory");
  const name = text(formData,"laboratory_name"); if (!name) redirect("/admin/create?type=laboratory&error=Laboratory%20name%20is%20required.");
  const publish = formData.get("publish_now") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("laboratories").insert({ owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), laboratory_name: name, laboratory_type: text(formData,"laboratory_type") || "Diagnostic Laboratory", description: optional(formData,"description"), technical_head: optional(formData,"technical_head"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), public_phone: optional(formData,"public_phone"), public_email: optional(formData,"public_email"), website: optional(formData,"website"), google_maps_url: optional(formData,"google_maps_url"), working_hours: optional(formData,"working_hours"), tests_offered: list(formData,"tests_offered"), species_served: list(formData,"species_served"), verification_status: publish ? "approved" : "pending", is_published: publish, verified_by: publish ? identity.userId : null, verified_at: publish ? new Date().toISOString() : null });
  if (error) redirect(`/admin/create?type=laboratory&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/directory"); revalidatePath("/labs");
  redirect("/admin/create?type=laboratory&message=Laboratory%20record%20created.");
}

export async function createAdminProductAction(formData: FormData) {
  const identity = await requireAdminPermission("products.create", "/admin/create?type=product");
  const name = text(formData,"product_name"); const companyId = text(formData,"company_id");
  if (!name || !companyId) redirect("/admin/create?type=product&error=Company%20and%20product%20name%20are%20required.");
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({ company_user_id: null, company_id: companyId, slug: uniqueSlug(name), product_name: name, brand_name: optional(formData,"brand_name"), generic_name: optional(formData,"generic_name"), category: text(formData,"category") || "Medicines", sector: optional(formData,"sector"), composition: optional(formData,"composition"), strength: optional(formData,"strength"), dosage_form: optional(formData,"dosage_form"), presentation: optional(formData,"presentation"), packaging_type: optional(formData,"packaging_type"), pack_size_value: optional(formData,"pack_size_value"), pack_size_unit: optional(formData,"pack_size_unit"), vaccine_type: optional(formData,"vaccine_type"), concentration_value: optional(formData,"concentration_value"), concentration_unit: optional(formData,"concentration_unit"), administration_route: optional(formData,"administration_route"), pack_sizes: list(formData,"pack_sizes"), indications: optional(formData,"indications"), description: optional(formData,"description"), verification_status: "pending", is_published: false, verified_by: null });
  if (error) redirect(`/admin/create?type=product&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products"); revalidatePath("/marketplace");
  redirect("/admin/create?type=product&message=Product%20draft%20created%20for%20review.");
}

export async function createAdminJobAction(formData: FormData) {
  await requireAdminPermission("jobs.create", "/admin/create?type=job");
  const title = text(formData,"title"); const companyId = text(formData,"company_id");
  if (!title || !companyId) redirect("/admin/create?type=job&error=Company%20and%20job%20title%20are%20required.");
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({ company_user_id: null, company_id: companyId, slug: uniqueSlug(title), title, description: text(formData,"description") || title, sector: optional(formData,"sector"), province: optional(formData,"province"), district: optional(formData,"district"), tehsil: optional(formData,"tehsil"), city: optional(formData,"city"), address: optional(formData,"address"), employment_type: text(formData,"employment_type") || "Full-time", minimum_qualification: optional(formData,"minimum_qualification"), minimum_experience: Number(text(formData,"minimum_experience") || 0), deadline: optional(formData,"deadline"), verification_status: "pending", is_published: false });
  if (error) redirect(`/admin/create?type=job&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/jobs"); revalidatePath("/admin/reviews");
  redirect("/admin/create?type=job&message=Job%20draft%20created%20for%20review.");
}
