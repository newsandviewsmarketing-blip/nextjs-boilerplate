import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MasterDataItem = {
  id: string;
  category: string;
  parent_id: string | null;
  code: string | null;
  label: string;
  description: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export const masterDataCategories = [
  ["province", "Province / Territory"],
  ["district", "District"],
  ["tehsil", "Tehsil / Taluka"],
  ["city", "City / Town"],
  ["veterinary_sector", "Veterinary Sector"],
  ["veterinary_specialization", "Veterinary Specialization"],
  ["veterinary_service", "Veterinary Service"],
  ["species", "Species"],
  ["business_type", "Business Type"],
  ["facility_type", "Clinic / Facility Type"],
  ["laboratory_type", "Laboratory Type"],
  ["laboratory_test", "Laboratory Test"],
  ["product_category", "Product Category"],
  ["product_dosage_form", "Product Dosage Form"],
  ["product_presentation", "Product Presentation"],
  ["product_packaging", "Product Packaging / Unit"],
  ["vaccine_type", "Vaccine Type"],
  ["concentration_unit", "Concentration Unit"],
  ["administration_route", "Administration Route"],
  ["job_sector", "Job Sector"],
  ["employment_type", "Employment Type"],
] as const;

export async function loadMasterData(category?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("master_data_items")
    .select("id, category, parent_id, code, label, description, metadata, sort_order, is_active")
    .order("sort_order")
    .order("label");
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  return { items: (data ?? []) as MasterDataItem[], error };
}

export function itemsByCategory(items: MasterDataItem[], category: string) {
  return items.filter((item) => item.category === category && item.is_active);
}
