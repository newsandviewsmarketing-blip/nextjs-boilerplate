/** Proposed shared taxonomy. Stable IDs are independent of display labels. */
export const COMPANY_CLASSIFICATION = {
  poultry: ["Broiler", "Layer", "Breeder", "Hatchery", "Processing"],
  dairy: ["Dairy farming", "Milk collection", "Milk processing"],
  livestock: ["Beef", "Buffalo", "Sheep", "Goat", "Camel"],
  feed_industry: ["Poultry feed mill", "Dairy feed mill", "Livestock feed mill", "Aqua feed mill", "Pet food manufacturing"],
  nutrition: ["Premixes", "Feed additives", "Minerals", "Vitamins", "Enzymes", "Probiotics", "Supplements"],
  medicines: ["Poultry medicines", "Dairy medicines", "Livestock medicines", "Pet medicines", "Aqua medicines"],
  vaccines: ["Poultry vaccines", "Dairy vaccines", "Livestock vaccines", "Pet vaccines", "Aqua vaccines", "Other biologicals"],
  feed_ingredients: ["Maize", "Soybean", "Soybean meal", "Oilseed meals", "Other ingredients"],
  genetics: ["Poultry genetics", "Dairy genetics", "Semen", "Embryos"],
  aquaculture: ["Fish farming", "Shrimp farming", "Hatcheries"],
  diagnostics: ["Veterinary testing", "Feed testing", "Food testing"],
  equipment: ["Poultry equipment", "Dairy equipment", "Feed mill machinery", "Laboratory equipment"],
  biosecurity: ["Disinfectants", "Hygiene", "Water treatment"],
  agriculture: ["Seeds", "Fodder", "Crops", "Inputs"],
  food_processing: ["Meat", "Milk", "Eggs"],
  pets: ["Pet food", "Accessories", "Pet care"],
  services: ["Veterinary", "Nutrition", "Farm management", "Training"],
  one_health: ["Wildlife health", "Conservation", "Zoonoses", "AMR"],
} as const;
export const COMPANY_ACTIVITIES = ["local_manufacturer", "contract_manufacturer", "importer", "exporter", "distributor", "trader", "wholesaler", "retailer", "principal", "indentor", "marketer", "registration_holder", "farm_operator", "processor", "service_provider", "consultant"] as const;
export type CompanySector = keyof typeof COMPANY_CLASSIFICATION;
export type CompanyClassification = { sector: CompanySector; subsectors: string[]; activities: string[] };
export function isCompanyClassification(value: unknown): value is CompanyClassification {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.sector !== "string" || !Object.prototype.hasOwnProperty.call(COMPANY_CLASSIFICATION, row.sector)) return false;
  const allowed = COMPANY_CLASSIFICATION[row.sector as CompanySector] as readonly string[];
  const valid = (items: unknown, options: readonly string[]) => Array.isArray(items) && items.length > 0 && items.length <= options.length && new Set(items).size === items.length && items.every(item => typeof item === "string" && options.includes(item));
  return valid(row.subsectors, allowed) && valid(row.activities, COMPANY_ACTIVITIES);
}

/** Reject malformed, oversized and duplicate-sector submissions at the server boundary. */
export function parseCompanyClassification(raw: string): CompanyClassification[] | null {
  if (!raw || raw.length > 24000) return null;
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows) || !rows.length || rows.length > Object.keys(COMPANY_CLASSIFICATION).length ||
        !rows.every(isCompanyClassification) || new Set(rows.map(row => row.sector)).size !== rows.length) return null;
    return rows.map(row => ({sector: row.sector, subsectors: [...row.subsectors], activities: [...row.activities]}));
  } catch { return null; }
}

/** Input must already be filtered to authorized canonical company records. */
export function summarizeCompanyClassification(records: readonly {companyId: string; classification: CompanyClassification[]}[]) {
  const companies = new Set<string>();
  const sectors = new Map<string, Set<string>>();
  const subsectors = new Map<string, Set<string>>();
  const activities = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, id: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(id);
  };
  for (const record of records) {
    companies.add(record.companyId);
    for (const row of record.classification) {
      if (!isCompanyClassification(row)) continue;
      add(sectors, row.sector, record.companyId);
      for (const sub of row.subsectors) add(subsectors, JSON.stringify([row.sector, sub]), record.companyId);
      for (const activity of row.activities) add(activities, JSON.stringify([row.sector, activity]), record.companyId);
    }
  }
  const counts = (map: Map<string, Set<string>>) => Object.fromEntries(Array.from(map, ([key, ids]) => [key, ids.size]));
  return {totalCompanies: companies.size, sectors: counts(sectors), subsectors: counts(subsectors), activities: counts(activities)};
}
