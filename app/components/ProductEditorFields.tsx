import { productCategories } from "@/lib/marketplace";

export type ProductEditorValue = {
  company_user_id?: string | null;
  product_name?: string | null;
  product_code?: string | null;
  brand_name?: string | null;
  generic_name?: string | null;
  category?: string | null;
  subclass?: string | null;
  therapeutic_class?: string | null;
  sectors?: string[] | null;
  species?: string[] | null;
  production_systems?: string[] | null;
  use_areas?: string[] | null;
  routes?: string[] | null;
  composition?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  pack_sizes?: string[] | null;
  indications?: string | null;
  precautions?: string | null;
  contraindications?: string | null;
  warnings?: string | null;
  meat_withdrawal?: string | null;
  milk_withdrawal?: string | null;
  egg_withdrawal?: string | null;
  description?: string | null;
  storage_instructions?: string | null;
  cold_chain?: boolean | null;
  temperature_range?: string | null;
  shelf_life?: string | null;
  country_of_origin?: string | null;
  image_url?: string | null;
  availability?: string | null;
  regulatory_number?: string | null;
};

type CompanyOption = { user_id: string; company_name: string };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function list(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default function ProductEditorFields({
  product = {},
  companies,
  lockCompany = false,
  showRegulatory = true,
}: {
  product?: ProductEditorValue;
  companies?: CompanyOption[];
  lockCompany?: boolean;
  showRegulatory?: boolean;
}) {
  return (
    <div className="form-grid product-editor-grid">
      {companies && (
        <div className="form-span-2">
          <label htmlFor="company_user_id">Listing company</label>
          <select
            id="company_user_id"
            name="company_user_id"
            defaultValue={text(product.company_user_id)}
            required
            disabled={lockCompany}
          >
            <option value="" disabled>Select an approved company</option>
            {companies.map((company) => (
              <option key={company.user_id} value={company.user_id}>
                {company.company_name}
              </option>
            ))}
          </select>
          {lockCompany && (
            <input type="hidden" name="company_user_id" value={text(product.company_user_id)} />
          )}
        </div>
      )}
      <div>
        <label htmlFor="product_name">Product name</label>
        <input id="product_name" name="product_name" defaultValue={text(product.product_name)} required />
      </div>
      <div>
        <label htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={text(product.category)} required>
          <option value="" disabled>Select category</option>
          {productCategories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </div>
      <div><label htmlFor="brand_name">Brand</label><input id="brand_name" name="brand_name" defaultValue={text(product.brand_name)} /></div>
      <div><label htmlFor="generic_name">Generic name</label><input id="generic_name" name="generic_name" defaultValue={text(product.generic_name)} /></div>
      <div><label htmlFor="product_code">Product code / SKU</label><input id="product_code" name="product_code" defaultValue={text(product.product_code)} /></div>
      <div><label htmlFor="subclass">Product subclass</label><input id="subclass" name="subclass" defaultValue={text(product.subclass)} placeholder="Live vaccine, feed additive..." /></div>
      <div><label htmlFor="therapeutic_class">Therapeutic / functional class</label><input id="therapeutic_class" name="therapeutic_class" defaultValue={text(product.therapeutic_class)} /></div>
      <div><label htmlFor="sectors">Sectors</label><input id="sectors" name="sectors" defaultValue={list(product.sectors)} placeholder="Poultry, dairy, livestock" /></div>
      <div><label htmlFor="species">Species</label><input id="species" name="species" defaultValue={list(product.species)} placeholder="Chicken, cattle, buffalo" /></div>
      <div><label htmlFor="production_systems">Production systems</label><input id="production_systems" name="production_systems" defaultValue={list(product.production_systems)} placeholder="Broiler, layer, breeder" /></div>
      <div><label htmlFor="use_areas">Disease / use areas</label><input id="use_areas" name="use_areas" defaultValue={list(product.use_areas)} /></div>
      <div><label htmlFor="routes">Administration routes</label><input id="routes" name="routes" defaultValue={list(product.routes)} /></div>
      <div><label htmlFor="dosage_form">Dosage / product form</label><input id="dosage_form" name="dosage_form" defaultValue={text(product.dosage_form)} /></div>
      <div><label htmlFor="strength">Strength</label><input id="strength" name="strength" defaultValue={text(product.strength)} /></div>
      <div><label htmlFor="pack_sizes">Pack sizes</label><input id="pack_sizes" name="pack_sizes" defaultValue={list(product.pack_sizes)} placeholder="100 ml, 500 ml" /></div>
      <div className="form-span-2"><label htmlFor="composition">Composition</label><textarea id="composition" name="composition" defaultValue={text(product.composition)} /></div>
      <div className="form-span-2"><label htmlFor="indications">Indications / intended use</label><textarea id="indications" name="indications" defaultValue={text(product.indications)} /></div>
      <div className="form-span-2"><label htmlFor="precautions">Precautions</label><textarea id="precautions" name="precautions" defaultValue={text(product.precautions)} /></div>
      <div><label htmlFor="contraindications">Contraindications</label><textarea id="contraindications" name="contraindications" defaultValue={text(product.contraindications)} /></div>
      <div><label htmlFor="warnings">Warnings</label><textarea id="warnings" name="warnings" defaultValue={text(product.warnings)} /></div>
      <div><label htmlFor="meat_withdrawal">Meat withdrawal</label><input id="meat_withdrawal" name="meat_withdrawal" defaultValue={text(product.meat_withdrawal)} /></div>
      <div><label htmlFor="milk_withdrawal">Milk withdrawal</label><input id="milk_withdrawal" name="milk_withdrawal" defaultValue={text(product.milk_withdrawal)} /></div>
      <div><label htmlFor="egg_withdrawal">Egg withdrawal</label><input id="egg_withdrawal" name="egg_withdrawal" defaultValue={text(product.egg_withdrawal)} /></div>
      <div className="form-span-2"><label htmlFor="description">Public description</label><textarea id="description" name="description" defaultValue={text(product.description)} required /></div>
      <div className="form-span-2"><label htmlFor="storage_instructions">Storage instructions</label><input id="storage_instructions" name="storage_instructions" defaultValue={text(product.storage_instructions)} /></div>
      <div><label htmlFor="temperature_range">Temperature range</label><input id="temperature_range" name="temperature_range" defaultValue={text(product.temperature_range)} /></div>
      <div><label htmlFor="shelf_life">Shelf life</label><input id="shelf_life" name="shelf_life" defaultValue={text(product.shelf_life)} /></div>
      <div><label htmlFor="country_of_origin">Country of origin</label><input id="country_of_origin" name="country_of_origin" defaultValue={text(product.country_of_origin)} /></div>
      <label className="checkbox-line"><input type="checkbox" name="cold_chain" defaultChecked={Boolean(product.cold_chain)} /> Cold chain required</label>
      {showRegulatory && (
        <div><label htmlFor="regulatory_number">Private regulatory reference</label><input id="regulatory_number" name="regulatory_number" defaultValue={text(product.regulatory_number)} /></div>
      )}
      <div><label htmlFor="availability">Availability</label><input id="availability" name="availability" defaultValue={text(product.availability)} /></div>
      <div className="form-span-2"><label htmlFor="image_url">Public image URL</label><input id="image_url" name="image_url" type="url" defaultValue={text(product.image_url)} placeholder="https://..." /></div>
    </div>
  );
}
