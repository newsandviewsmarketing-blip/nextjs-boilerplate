"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireCompanyPermission,
  type CompanyPermission,
} from "./workspace";

const COMPANY_PATH = "/dashboard/company";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function listValue(formData: FormData, name: string) {
  return value(formData, name)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function integerValue(formData: FormData, name: string) {
  const raw = value(formData, name);
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function message(kind: "error" | "message", text: string) {
  return `${COMPANY_PATH}?${kind}=${encodeURIComponent(text)}`;
}

function productMessage(
  productId: string,
  kind: "error" | "message",
  text: string,
) {
  return `${COMPANY_PATH}/products/${encodeURIComponent(productId)}?${kind}=${encodeURIComponent(text)}`;
}

function slugBase(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function uniqueSlug(input: string) {
  const base = slugBase(input) || "item";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function requireText(formData: FormData, name: string, label: string) {
  const result = value(formData, name);
  if (!result) {
    redirect(message("error", `${label} is required.`));
  }
  return result;
}

function ensureApprovedCompany(status: string) {
  if (status !== "approved") {
    redirect(
      message(
        "error",
        "The company must be approved before submitting products or jobs.",
      ),
    );
  }
}

async function requireWorkspace(permission: CompanyPermission) {
  return requireCompanyPermission(permission);
}

export async function updateCompanyProfileAction(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace("company.manage");

  const companyName = requireText(formData, "company_name", "Company name");
  const yearEstablishedRaw = value(formData, "year_established");
  const yearEstablished = yearEstablishedRaw
    ? Number.parseInt(yearEstablishedRaw, 10)
    : null;

  if (
    yearEstablished !== null &&
    (!Number.isInteger(yearEstablished) ||
      yearEstablished < 1800 ||
      yearEstablished > new Date().getFullYear())
  ) {
    redirect(message("error", "Enter a valid year established."));
  }

  const { error } = await supabase
    .from("company_profiles")
    .update({
      company_name: companyName,
      legal_name: value(formData, "legal_name") || null,
      trade_name: value(formData, "trade_name") || null,
      business_type: value(formData, "business_type") || null,
      registration_number: value(formData, "registration_number") || null,
      owner_name: value(formData, "owner_name") || null,
      chief_executive_name: value(formData, "chief_executive_name") || null,
      year_established: yearEstablished,
      country: value(formData, "country") || "Pakistan",
      city: value(formData, "city") || null,
      address: value(formData, "address") || null,
      description: value(formData, "description") || null,
      short_description: value(formData, "short_description") || null,
      website: value(formData, "website") || null,
      contact_email: value(formData, "contact_email") || null,
      logo_url: value(formData, "logo_url") || null,
      cover_image_url: value(formData, "cover_image_url") || null,
    })
    .eq("user_id", workspace.legacy_company_user_id);

  if (error) {
    redirect(message("error", error.message));
  }

  revalidatePath(COMPANY_PATH);
  redirect(message("message", "Company profile saved successfully."));
}

export async function createProductAction(formData: FormData) {
  const { identity, supabase, workspace } =
    await requireWorkspace("products.manage");

  ensureApprovedCompany(workspace.company_verification_status);

  const productName = requireText(formData, "product_name", "Product name");
  const category = requireText(formData, "category", "Product category");
  const description = requireText(formData, "description", "Public description");
  const sectors = listValue(formData, "sectors");
  const packSizes = listValue(formData, "pack_sizes");
  const species = listValue(formData, "species");
  const productionSystems = listValue(formData, "production_systems");
  const useAreas = listValue(formData, "use_areas");
  const routes = listValue(formData, "routes");

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      company_user_id: workspace.legacy_company_user_id,
      slug: uniqueSlug(productName),
      product_name: productName,
      brand_name: value(formData, "brand_name") || null,
      generic_name: value(formData, "generic_name") || null,
      category,
      sector: sectors[0] ?? null,
      product_code: value(formData, "product_code") || null,
      subclass: value(formData, "subclass") || null,
      therapeutic_class: value(formData, "therapeutic_class") || null,
      sectors,
      species,
      production_systems: productionSystems,
      use_areas: useAreas,
      routes,
      composition: value(formData, "composition") || null,
      indications: value(formData, "indications") || null,
      precautions: value(formData, "precautions") || null,
      contraindications: value(formData, "contraindications") || null,
      warnings: value(formData, "warnings") || null,
      meat_withdrawal: value(formData, "meat_withdrawal") || null,
      milk_withdrawal: value(formData, "milk_withdrawal") || null,
      egg_withdrawal: value(formData, "egg_withdrawal") || null,
      description,
      dosage_form: value(formData, "dosage_form") || null,
      strength: value(formData, "strength") || null,
      pack_sizes: packSizes,
      storage_instructions: value(formData, "storage_instructions") || null,
      temperature_range: value(formData, "temperature_range") || null,
      shelf_life: value(formData, "shelf_life") || null,
      country_of_origin: value(formData, "country_of_origin") || null,
      cold_chain: formData.get("cold_chain") === "on",
      availability: value(formData, "availability") || null,
      image_url: value(formData, "image_url") || null,
      verification_status: "pending",
      is_published: false,
      last_edited_by: identity.userId,
    })
    .select("id")
    .single();

  if (productError || !product) {
    redirect(message("error", productError?.message ?? "Product could not be created."));
  }

  const regulatoryNumber = value(formData, "regulatory_number");

  if (regulatoryNumber) {
    const { error: regulatoryError } = await supabase
      .from("product_regulatory")
      .insert({
        product_id: product.id,
        company_user_id: workspace.legacy_company_user_id,
        applicability: "provided",
        registration_status: "submitted",
        registration_number: regulatoryNumber,
        verification_status: "pending",
      });

    if (regulatoryError) {
      await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("company_user_id", workspace.legacy_company_user_id)
        .neq("verification_status", "approved");

      redirect(message("error", regulatoryError.message));
    }
  }

  revalidatePath(COMPANY_PATH);
  revalidatePath("/marketplace");
  redirect(message("message", "Product submitted for review."));
}

export async function updateProductAction(formData: FormData) {
  const { identity, supabase, workspace } =
    await requireWorkspace("products.manage");

  const productId = requireText(formData, "product_id", "Product ID");
  const productName = requireText(formData, "product_name", "Product name");
  const category = requireText(formData, "category", "Product category");
  const description = requireText(formData, "description", "Public description");
  const sectors = listValue(formData, "sectors");

  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("company_user_id", workspace.legacy_company_user_id)
    .maybeSingle();

  if (existingError) {
    redirect(productMessage(productId, "error", existingError.message));
  }

  if (!existing) {
    redirect(productMessage(productId, "error", "Product not found or access denied."));
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      product_name: productName,
      brand_name: value(formData, "brand_name") || null,
      generic_name: value(formData, "generic_name") || null,
      category,
      sector: sectors[0] ?? null,
      product_code: value(formData, "product_code") || null,
      subclass: value(formData, "subclass") || null,
      therapeutic_class: value(formData, "therapeutic_class") || null,
      sectors,
      species: listValue(formData, "species"),
      production_systems: listValue(formData, "production_systems"),
      use_areas: listValue(formData, "use_areas"),
      routes: listValue(formData, "routes"),
      composition: value(formData, "composition") || null,
      indications: value(formData, "indications") || null,
      precautions: value(formData, "precautions") || null,
      contraindications: value(formData, "contraindications") || null,
      warnings: value(formData, "warnings") || null,
      meat_withdrawal: value(formData, "meat_withdrawal") || null,
      milk_withdrawal: value(formData, "milk_withdrawal") || null,
      egg_withdrawal: value(formData, "egg_withdrawal") || null,
      description,
      dosage_form: value(formData, "dosage_form") || null,
      strength: value(formData, "strength") || null,
      pack_sizes: listValue(formData, "pack_sizes"),
      storage_instructions: value(formData, "storage_instructions") || null,
      temperature_range: value(formData, "temperature_range") || null,
      shelf_life: value(formData, "shelf_life") || null,
      country_of_origin: value(formData, "country_of_origin") || null,
      cold_chain: formData.get("cold_chain") === "on",
      availability: value(formData, "availability") || null,
      image_url: value(formData, "image_url") || null,
      last_edited_by: identity.userId,
    })
    .eq("id", productId)
    .eq("company_user_id", workspace.legacy_company_user_id);

  if (updateError) {
    redirect(productMessage(productId, "error", updateError.message));
  }

  const regulatoryNumber = value(formData, "regulatory_number");

  if (regulatoryNumber) {
    const { error: regulatoryError } = await supabase
      .from("product_regulatory")
      .upsert(
        {
          product_id: productId,
          company_user_id: workspace.legacy_company_user_id,
          applicability: "provided",
          registration_status: "submitted",
          registration_number: regulatoryNumber,
          verification_status: "pending",
        },
        { onConflict: "product_id" },
      );

    if (regulatoryError) {
      redirect(productMessage(productId, "error", regulatoryError.message));
    }
  }

  revalidatePath(COMPANY_PATH);
  revalidatePath(`${COMPANY_PATH}/products/${productId}`);
  revalidatePath("/marketplace");
  redirect(productMessage(productId, "message", "Product saved successfully."));
}

export async function deletePendingProductAction(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace("products.manage");
  const productId = requireText(formData, "product_id", "Product ID");

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("company_user_id", workspace.legacy_company_user_id)
    .neq("verification_status", "approved")
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(message("error", error.message));
  }

  if (!data) {
    redirect(
      message(
        "error",
        "Only a non-approved product belonging to this company can be removed.",
      ),
    );
  }

  revalidatePath(COMPANY_PATH);
  redirect(message("message", "Product removed."));
}

export async function updateInquiryStatusAction(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace("products.manage");
  const inquiryId = requireText(formData, "inquiry_id", "Inquiry ID");
  const status = value(formData, "status");
  const allowed = new Set(["reviewing", "responded", "closed"]);

  if (!allowed.has(status)) {
    redirect(message("error", "Choose a valid inquiry status."));
  }

  const { data, error } = await supabase
    .from("product_inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .eq("company_user_id", workspace.legacy_company_user_id)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(message("error", error.message));
  }

  if (!data) {
    redirect(message("error", "Inquiry not found or access denied."));
  }

  revalidatePath(COMPANY_PATH);
  redirect(message("message", "Inquiry status updated."));
}

export async function createJobAction(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace("jobs.manage");

  ensureApprovedCompany(workspace.company_verification_status);

  const title = requireText(formData, "title", "Job title");
  const description = requireText(
    formData,
    "job_description",
    "Job description",
  );
  const employmentType = requireText(
    formData,
    "employment_type",
    "Employment type",
  );

  const deadline = value(formData, "deadline") || null;
  const minimumExperience = integerValue(formData, "minimum_experience");

  const { error } = await supabase.from("jobs").insert({
    company_id: workspace.company_id,
    company_user_id: workspace.legacy_company_user_id,
    slug: uniqueSlug(title),
    title,
    description,
    sector: value(formData, "job_sector") || null,
    city: value(formData, "job_city") || null,
    province: value(formData, "job_province") || null,
    employment_type: employmentType,
    minimum_qualification: value(formData, "minimum_qualification") || null,
    minimum_experience: minimumExperience,
    deadline,
    verification_status: "pending",
    is_published: false,
  });

  if (error) {
    redirect(message("error", error.message));
  }

  revalidatePath(COMPANY_PATH);
  revalidatePath("/jobs");
  redirect(message("message", "Job submitted for review."));
}

export async function deletePendingJobAction(formData: FormData) {
  const { supabase, workspace } = await requireWorkspace("jobs.manage");
  const jobId = requireText(formData, "job_id", "Job ID");

  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("company_id", workspace.company_id)
    .neq("verification_status", "approved")
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(message("error", error.message));
  }

  if (!data) {
    redirect(
      message(
        "error",
        "Only a non-approved job belonging to this company can be removed.",
      ),
    );
  }

  revalidatePath(COMPANY_PATH);
  redirect(message("message", "Job removed."));
}
