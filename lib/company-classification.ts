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
