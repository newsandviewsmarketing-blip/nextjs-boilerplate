"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { parseTabularUpload } from "@/lib/tabular-import";

type Kind = "person" | "company" | "clinic" | "laboratory" | "product" | "job";
type Row = Record<string, string>;

function value(row: Row, key: string) { return String(row[key] ?? "").trim(); }
function nullable(row: Row, key: string) { return value(row, key) || null; }
function list(row: Row, key: string) { return value(row, key).split(",").map((item) => item.trim()).filter(Boolean); }
function numberValue(row: Row, key: string) { const parsed = Number(value(row, key) || 0); return Number.isFinite(parsed) ? parsed : 0; }
function slugify(input: string) { return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "record"; }
function uniqueSlug(input: string) { return `${slugify(input)}-${randomUUID().slice(0, 8)}`; }

async function requiredPermission(kind: Kind) {
  const permission = {
    person: "profiles.create",
    company: "companies.create",
    clinic: "clinics.manage",
    laboratory: "laboratories.manage",
    product: "products.create",
    job: "jobs.create",
  }[kind];
  return requireAdminPermission(permission, `/admin/create?type=${kind}`);
}

export async function bulkImportAction(formData: FormData) {
  const kind = String(formData.get("record_type") ?? "") as Kind;
  if (!["person","company","clinic","laboratory","product","job"].includes(kind)) {
    redirect("/admin/create?error=Invalid%20bulk%20import%20type.");
  }
  const identity = await requiredPermission(kind);
  const fileValue = formData.get("import_file");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    redirect(`/admin/create?type=${kind}&error=Choose%20a%20CSV%20or%20XLSX%20file.`);
  }

  let rows: Row[];
  try {
    rows = await parseTabularUpload(fileValue);
  } catch (error) {
    redirect(`/admin/create?type=${kind}&error=${encodeURIComponent(error instanceof Error ? error.message : "Could not read import file.")}`);
  }
  if (rows.length === 0) redirect(`/admin/create?type=${kind}&error=The%20import%20file%20contains%20no%20data%20rows.`);
  if (rows.length > 250) redirect(`/admin/create?type=${kind}&error=Import%20a%20maximum%20of%20250%20records%20at%20a%20time.`);

  const supabase = await createClient();
  let companyMap = new Map<string, string>();
  if (kind === "product" || kind === "job") {
    const { data } = await supabase.from("companies").select("id,canonical_name,trade_name").eq("record_status", "active");
    companyMap = new Map<string, string>();
    for (const company of data ?? []) {
      companyMap.set(String(company.id).toLowerCase(), String(company.id));
      companyMap.set(String(company.canonical_name ?? "").trim().toLowerCase(), String(company.id));
      if (company.trade_name) companyMap.set(String(company.trade_name).trim().toLowerCase(), String(company.id));
    }
  }

  let created = 0;
  const errors: string[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      if (kind === "person") {
        const name = value(row, "full_name");
        if (!name) throw new Error("full_name is required");
        const profileKind = value(row, "profile_kind") === "veterinarian" ? "veterinarian" : "professional";
        const { error } = await supabase.from("managed_people").insert({
          full_name: name, slug: uniqueSlug(name), profile_kind: profileKind,
          contact_email: nullable(row,"contact_email"), public_phone: nullable(row,"public_phone"), qualifications: nullable(row,"qualifications"),
          professional_type: nullable(row,"professional_type"), headline: nullable(row,"headline"), public_summary: nullable(row,"public_summary"),
          current_position: nullable(row,"current_position"), organization_name: nullable(row,"organization_name"), pvmc_number: nullable(row,"pvmc_number"),
          veterinary_sector: nullable(row,"veterinary_sector"), specialization: nullable(row,"specialization"), services: list(row,"services"), skills: list(row,"skills"),
          years_experience: numberValue(row,"years_experience"), province: nullable(row,"province"), district: nullable(row,"district"), tehsil: nullable(row,"tehsil"), city: nullable(row,"city"),
          address: nullable(row,"address"), google_maps_url: nullable(row,"google_maps_url"), image_url: nullable(row,"image_url"), verification_status: "pending",
          pvmc_verification_status: "pending", is_published: false, created_by: identity.userId, updated_by: identity.userId,
        });
        if (error) throw error;
      } else if (kind === "company") {
        const name = value(row,"canonical_name"); if (!name) throw new Error("canonical_name is required");
        const { error } = await supabase.from("companies").insert({
          canonical_name: name, legal_name: nullable(row,"legal_name"), trade_name: nullable(row,"trade_name"), slug: uniqueSlug(name), business_type: nullable(row,"business_type"),
          description: nullable(row,"description"), province: nullable(row,"province"), district: nullable(row,"district"), tehsil: nullable(row,"tehsil"), city: nullable(row,"city"), address: nullable(row,"address"),
          public_phone: nullable(row,"public_phone"), public_email: nullable(row,"public_email"), website: nullable(row,"website"), google_maps_url: nullable(row,"google_maps_url"), logo_url: nullable(row,"logo_url"),
          verification_status: "pending", is_published: false, created_by: identity.userId,
        });
        if (error) throw error;
      } else if (kind === "clinic") {
        const name = value(row,"clinic_name"); if (!name) throw new Error("clinic_name is required");
        const { error } = await supabase.from("clinics").insert({
          owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), clinic_name: name, facility_type: value(row,"facility_type") || "Veterinary Clinic", description: nullable(row,"description"),
          province: nullable(row,"province"), district: nullable(row,"district"), tehsil: nullable(row,"tehsil"), city: nullable(row,"city"), address: nullable(row,"address"), public_phone: nullable(row,"public_phone"),
          public_email: nullable(row,"public_email"), website: nullable(row,"website"), google_maps_url: nullable(row,"google_maps_url"), working_hours: nullable(row,"working_hours"), services: list(row,"services"), species: list(row,"species"),
          verification_status: "pending", is_published: false,
        });
        if (error) throw error;
      } else if (kind === "laboratory") {
        const name = value(row,"laboratory_name"); if (!name) throw new Error("laboratory_name is required");
        const { error } = await supabase.from("laboratories").insert({
          owner_id: null, created_by: identity.userId, slug: uniqueSlug(name), laboratory_name: name, laboratory_type: value(row,"laboratory_type") || "Diagnostic Laboratory", description: nullable(row,"description"),
          technical_head: nullable(row,"technical_head"), province: nullable(row,"province"), district: nullable(row,"district"), tehsil: nullable(row,"tehsil"), city: nullable(row,"city"), address: nullable(row,"address"), public_phone: nullable(row,"public_phone"),
          public_email: nullable(row,"public_email"), website: nullable(row,"website"), google_maps_url: nullable(row,"google_maps_url"), working_hours: nullable(row,"working_hours"), tests_offered: list(row,"tests_offered"), species_served: list(row,"species_served"),
          verification_status: "pending", is_published: false,
        });
        if (error) throw error;
      } else if (kind === "product") {
        const name = value(row,"product_name"); if (!name) throw new Error("product_name is required");
        const companyKey = (value(row,"company_id") || value(row,"company_name")).toLowerCase();
        const companyId = companyMap.get(companyKey); if (!companyId) throw new Error("company_id or company_name does not match a canonical company");
        const { error } = await supabase.from("products").insert({
          company_user_id: null, company_id: companyId, slug: uniqueSlug(name), product_name: name, brand_name: nullable(row,"brand_name"), generic_name: nullable(row,"generic_name"),
          category: value(row,"category") || "Medicines", sector: nullable(row,"sector"), composition: nullable(row,"composition"), strength: nullable(row,"strength"), dosage_form: nullable(row,"dosage_form"), presentation: nullable(row,"presentation"),
          packaging_type: nullable(row,"packaging_type"), pack_size_value: nullable(row,"pack_size_value"), pack_size_unit: nullable(row,"pack_size_unit"), vaccine_type: nullable(row,"vaccine_type"), concentration_value: nullable(row,"concentration_value"), concentration_unit: nullable(row,"concentration_unit"),
          administration_route: nullable(row,"administration_route"), pack_sizes: list(row,"pack_sizes"), indications: nullable(row,"indications"), description: nullable(row,"description"), image_url: nullable(row,"image_url"), verification_status: "pending", is_published: false,
        });
        if (error) throw error;
      } else if (kind === "job") {
        const title = value(row,"title"); if (!title) throw new Error("title is required");
        const companyKey = (value(row,"company_id") || value(row,"company_name")).toLowerCase();
        const companyId = companyMap.get(companyKey); if (!companyId) throw new Error("company_id or company_name does not match a canonical company");
        const { error } = await supabase.from("jobs").insert({
          company_user_id: null, company_id: companyId, slug: uniqueSlug(title), title, description: value(row,"description") || title, sector: nullable(row,"sector"), province: nullable(row,"province"), district: nullable(row,"district"), tehsil: nullable(row,"tehsil"), city: nullable(row,"city"),
          address: nullable(row,"address"), employment_type: value(row,"employment_type") || "Full-time", minimum_qualification: nullable(row,"minimum_qualification"), minimum_experience: numberValue(row,"minimum_experience"), deadline: nullable(row,"deadline"), verification_status: "pending", is_published: false,
        });
        if (error) throw error;
      }
      created += 1;
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Import failed"}`);
    }
  }

  revalidatePath("/admin/directory"); revalidatePath("/admin/reviews"); revalidatePath("/companies"); revalidatePath("/clinics"); revalidatePath("/labs"); revalidatePath("/marketplace"); revalidatePath("/jobs"); revalidatePath("/vets"); revalidatePath("/professionals");
  const summary = `${created} record${created === 1 ? "" : "s"} imported${errors.length ? `; ${errors.length} row(s) failed. ${errors.slice(0, 3).join(" | ")}` : "."}`;
  redirect(`/admin/create?type=${kind}&${errors.length && created === 0 ? "error" : "message"}=${encodeURIComponent(summary)}`);
}
