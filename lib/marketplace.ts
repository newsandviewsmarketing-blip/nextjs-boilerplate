export const productCategories = [
  "Medicines",
  "Vaccines",
  "Nutritional Supplements",
  "Poultry Feed",
  "Dairy Feed",
  "Pet Food",
  "Fish Feed",
  "Disinfectants",
  "Diagnostics",
  "Farm Equipment",
  "Water Treatment",
  "Feed Additives",
] as const;

export type PublicProduct = {
  id: string | null;
  slug: string;
  product_name: string;
  brand_name: string | null;
  generic_name: string | null;
  category: string;
  sector: string | null;
  composition: string | null;
  strength: string | null;
  dosage_form: string | null;
  pack_sizes: string[];
  indications: string | null;
  description: string | null;
  storage_instructions: string | null;
  image_url: string | null;
  availability: string | null;
  product_code?: string | null;
  subclass?: string | null;
  therapeutic_class?: string | null;
  sectors?: string[];
  species?: string[];
  production_systems?: string[];
  use_areas?: string[];
  routes?: string[];
  precautions?: string | null;
  contraindications?: string | null;
  warnings?: string | null;
  meat_withdrawal?: string | null;
  milk_withdrawal?: string | null;
  egg_withdrawal?: string | null;
  cold_chain?: boolean;
  temperature_range?: string | null;
  shelf_life?: string | null;
  country_of_origin?: string | null;
  regulatory_review_status?: string;
  company_user_id: string | null;
  company_name: string;
  company_city: string | null;
  is_sample?: boolean;
};

export type PublicCompany = {
  id?: string | null;
  user_id: string | null;
  company_name: string;
  business_type: string | null;
  city: string | null;
  province?: string | null;
  district?: string | null;
  tehsil?: string | null;
  address: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  public_phone?: string | null;
  google_maps_url?: string | null;
  logo_url: string | null;
  is_sample?: boolean;
};

export const sampleProducts: PublicProduct[] = [
  {
    id: null,
    slug: "sample-veterinary-medicine",
    product_name: "Veterinary Medicine",
    brand_name: "VetCare",
    generic_name: "Sample formulation",
    category: "Medicines",
    sector: "Livestock",
    composition: "Company-controlled product composition",
    strength: null,
    dosage_form: "As configured",
    pack_sizes: ["Multiple pack sizes"],
    indications: "For approved veterinary use",
    description: "A sample listing that will be replaced by approved company submissions.",
    storage_instructions: "Follow the manufacturer label.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Animal Health Company",
    company_city: "Lahore",
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-veterinary-vaccine",
    product_name: "Veterinary Vaccine",
    brand_name: "VaxLine",
    generic_name: "Sample biological",
    category: "Vaccines",
    sector: "Poultry",
    composition: "Company-controlled biological information",
    strength: null,
    dosage_form: "As configured",
    pack_sizes: ["Multiple presentations"],
    indications: "For approved veterinary use",
    description: "A sample vaccine listing for the public marketplace preview.",
    storage_instructions: "Maintain the manufacturer cold chain.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Biologicals Company",
    company_city: "Islamabad",
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-nutritional-supplement",
    product_name: "Nutritional Supplement",
    brand_name: "NutriVet",
    generic_name: "Sample nutrition product",
    category: "Nutritional Supplements",
    sector: "Dairy",
    composition: "Company-controlled nutrition information",
    strength: null,
    dosage_form: "Powder",
    pack_sizes: ["1 kg", "5 kg"],
    indications: "Nutritional support",
    description: "A sample nutrition listing for the public marketplace preview.",
    storage_instructions: "Store in a cool, dry place.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Nutrition Company",
    company_city: "Faisalabad",
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-poultry-feed",
    product_name: "Poultry Feed Product",
    brand_name: "FeedPro",
    generic_name: "Sample feed",
    category: "Poultry Feed",
    sector: "Poultry",
    composition: "Company-controlled feed composition",
    strength: null,
    dosage_form: "Feed",
    pack_sizes: ["25 kg", "50 kg"],
    indications: "Poultry nutrition",
    description: "A sample feed listing for the public marketplace preview.",
    storage_instructions: "Store away from moisture.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Feed Company",
    company_city: "Lahore",
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-premium-pet-food",
    product_name: "Premium Pet Food",
    brand_name: "PetPlus",
    generic_name: "Sample pet food",
    category: "Pet Food",
    sector: "Pets",
    composition: "Company-controlled food composition",
    strength: null,
    dosage_form: "Dry food",
    pack_sizes: ["1 kg", "3 kg"],
    indications: "Companion animal nutrition",
    description: "A sample pet food listing for the public marketplace preview.",
    storage_instructions: "Reseal after opening.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Pet Care Company",
    company_city: "Karachi",
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-aquaculture-feed",
    product_name: "Aquaculture Feed",
    brand_name: "AquaFeed",
    generic_name: "Sample fish feed",
    category: "Fish Feed",
    sector: "Fisheries",
    composition: "Company-controlled feed composition",
    strength: null,
    dosage_form: "Pellet",
    pack_sizes: ["20 kg"],
    indications: "Aquaculture nutrition",
    description: "A sample aquaculture listing for the public marketplace preview.",
    storage_instructions: "Store in a dry area.",
    image_url: null,
    availability: "Contact company",
    company_user_id: null,
    company_name: "Aqua Company",
    company_city: "Karachi",
    is_sample: true,
  },
];

export const sampleCompanies: PublicCompany[] = [
  ["Animal Health Company", "Pharmaceuticals", "Lahore", "Medicines and vaccines"],
  ["Veterinary Nutrition Company", "Feed & Nutrition", "Faisalabad", "Supplements and feed additives"],
  ["Poultry Solutions Company", "Poultry", "Lahore", "Products and technical services"],
  ["Dairy Solutions Company", "Dairy", "Multan", "Nutrition and equipment"],
  ["Aquaculture Company", "Fisheries", "Karachi", "Feed and health products"],
  ["Veterinary Diagnostics Company", "Diagnostics", "Islamabad", "Laboratory and diagnostic kits"],
].map(([company_name, business_type, city, description]) => ({
  user_id: null,
  company_name,
  business_type,
  city,
  address: null,
  description,
  website: null,
  contact_email: null,
  logo_url: null,
  is_sample: true,
}));

export function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function productMark(product: Pick<PublicProduct, "category" | "product_name">) {
  const source = product.category || product.product_name;
  return source.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "VET";
}
