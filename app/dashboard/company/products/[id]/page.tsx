import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import FormMessage from "../../../../components/FormMessage";
import FormSubmitButton from "../../../../components/FormSubmitButton";
import { productCategories } from "@/lib/marketplace";
import { updateProductAction } from "../../actions";
import {
  getCurrentCompanyWorkspace,
  workspaceHasPermission,
} from "../../workspace";

export const dynamic = "force-dynamic";

type ProductEditRow = {
  id: string;
  product_name: string;
  brand_name: string | null;
  generic_name: string | null;
  category: string;
  product_code: string | null;
  subclass: string | null;
  therapeutic_class: string | null;
  sectors: string[] | null;
  species: string[] | null;
  production_systems: string[] | null;
  use_areas: string[] | null;
  routes: string[] | null;
  composition: string | null;
  indications: string | null;
  precautions: string | null;
  contraindications: string | null;
  warnings: string | null;
  meat_withdrawal: string | null;
  milk_withdrawal: string | null;
  egg_withdrawal: string | null;
  description: string | null;
  dosage_form: string | null;
  strength: string | null;
  pack_sizes: string[] | null;
  storage_instructions: string | null;
  temperature_range: string | null;
  shelf_life: string | null;
  country_of_origin: string | null;
  cold_chain: boolean;
  availability: string | null;
  image_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
};

function csv(items: string[] | null) {
  return (items ?? []).join(", ");
}

export default async function CompanyProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ id }, formParams] = await Promise.all([params, searchParams]);
  const { supabase, workspace } = await getCurrentCompanyWorkspace();

  if (!workspaceHasPermission(workspace, "products.manage")) {
    redirect(
      `/dashboard/company?error=${encodeURIComponent(
        "You do not have permission to edit company products.",
      )}`,
    );
  }

  const [{ data: product, error: productError }, { data: regulatory, error: regulatoryError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, product_name, brand_name, generic_name, category, product_code, subclass, therapeutic_class, sectors, species, production_systems, use_areas, routes, composition, indications, precautions, contraindications, warnings, meat_withdrawal, milk_withdrawal, egg_withdrawal, description, dosage_form, strength, pack_sizes, storage_instructions, temperature_range, shelf_life, country_of_origin, cold_chain, availability, image_url, verification_status, rejection_reason",
        )
        .eq("id", id)
        .eq("company_user_id", workspace.legacy_company_user_id)
        .maybeSingle(),
      supabase
        .from("product_regulatory")
        .select("registration_number")
        .eq("product_id", id)
        .maybeSingle(),
    ]);

  if (productError) {
    redirect(`/dashboard/company?error=${encodeURIComponent(productError.message)}`);
  }
  if (regulatoryError) {
    redirect(`/dashboard/company?error=${encodeURIComponent(regulatoryError.message)}`);
  }
  if (!product) notFound();

  const row = product as ProductEditRow;

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">PRODUCT EDITOR</span>
            <h1>{row.product_name}</h1>
            <p>Company: {workspace.canonical_name}</p>
          </div>
          <Link className="button button-secondary" href="/dashboard/company">
            Back to company
          </Link>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...formParams} />

          {row.rejection_reason && (
            <div className="setup-notice">
              <h2>Review note</h2>
              <p>{row.rejection_reason}</p>
            </div>
          )}

          <form className="backend-form-card" action={updateProductAction}>
            <input type="hidden" name="product_id" value={row.id} />
            <div className="section-heading">
              <span className="section-kicker">{row.verification_status.toUpperCase()}</span>
              <h2>Edit product information.</h2>
              <p>Material changes may return an approved record to review.</p>
            </div>
            <div className="form-grid">
              <div><label htmlFor="product_name">Product name</label><input id="product_name" name="product_name" required defaultValue={row.product_name} /></div>
              <div><label htmlFor="category">Category</label><select id="category" name="category" required defaultValue={row.category}>{productCategories.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div><label htmlFor="brand_name">Brand</label><input id="brand_name" name="brand_name" defaultValue={row.brand_name ?? ""} /></div>
              <div><label htmlFor="generic_name">Generic name</label><input id="generic_name" name="generic_name" defaultValue={row.generic_name ?? ""} /></div>
              <div><label htmlFor="product_code">Product code / SKU</label><input id="product_code" name="product_code" defaultValue={row.product_code ?? ""} /></div>
              <div><label htmlFor="subclass">Product subclass</label><input id="subclass" name="subclass" defaultValue={row.subclass ?? ""} /></div>
              <div><label htmlFor="therapeutic_class">Therapeutic / functional class</label><input id="therapeutic_class" name="therapeutic_class" defaultValue={row.therapeutic_class ?? ""} /></div>
              <div><label htmlFor="sectors">Sectors</label><input id="sectors" name="sectors" defaultValue={csv(row.sectors)} /></div>
              <div><label htmlFor="species">Species</label><input id="species" name="species" defaultValue={csv(row.species)} /></div>
              <div><label htmlFor="production_systems">Production systems</label><input id="production_systems" name="production_systems" defaultValue={csv(row.production_systems)} /></div>
              <div><label htmlFor="use_areas">Disease / use areas</label><input id="use_areas" name="use_areas" defaultValue={csv(row.use_areas)} /></div>
              <div><label htmlFor="routes">Routes</label><input id="routes" name="routes" defaultValue={csv(row.routes)} /></div>
              <div><label htmlFor="dosage_form">Dosage / product form</label><input id="dosage_form" name="dosage_form" defaultValue={row.dosage_form ?? ""} /></div>
              <div><label htmlFor="strength">Strength</label><input id="strength" name="strength" defaultValue={row.strength ?? ""} /></div>
              <div><label htmlFor="pack_sizes">Pack sizes</label><input id="pack_sizes" name="pack_sizes" defaultValue={csv(row.pack_sizes)} /></div>
              <div className="form-span-2"><label htmlFor="composition">Composition</label><textarea id="composition" name="composition" defaultValue={row.composition ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="indications">Indications / intended use</label><textarea id="indications" name="indications" defaultValue={row.indications ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="precautions">Precautions</label><textarea id="precautions" name="precautions" defaultValue={row.precautions ?? ""} /></div>
              <div><label htmlFor="contraindications">Contraindications</label><textarea id="contraindications" name="contraindications" defaultValue={row.contraindications ?? ""} /></div>
              <div><label htmlFor="warnings">Warnings</label><textarea id="warnings" name="warnings" defaultValue={row.warnings ?? ""} /></div>
              <div><label htmlFor="meat_withdrawal">Meat withdrawal</label><input id="meat_withdrawal" name="meat_withdrawal" defaultValue={row.meat_withdrawal ?? ""} /></div>
              <div><label htmlFor="milk_withdrawal">Milk withdrawal</label><input id="milk_withdrawal" name="milk_withdrawal" defaultValue={row.milk_withdrawal ?? ""} /></div>
              <div><label htmlFor="egg_withdrawal">Egg withdrawal</label><input id="egg_withdrawal" name="egg_withdrawal" defaultValue={row.egg_withdrawal ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="description">Public description</label><textarea id="description" name="description" required defaultValue={row.description ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="storage_instructions">Storage instructions</label><input id="storage_instructions" name="storage_instructions" defaultValue={row.storage_instructions ?? ""} /></div>
              <div><label htmlFor="temperature_range">Temperature range</label><input id="temperature_range" name="temperature_range" defaultValue={row.temperature_range ?? ""} /></div>
              <div><label htmlFor="shelf_life">Shelf life</label><input id="shelf_life" name="shelf_life" defaultValue={row.shelf_life ?? ""} /></div>
              <div><label htmlFor="country_of_origin">Country of origin</label><input id="country_of_origin" name="country_of_origin" defaultValue={row.country_of_origin ?? ""} /></div>
              <label className="checkbox-line"><input type="checkbox" name="cold_chain" defaultChecked={row.cold_chain} /> Cold chain required</label>
              <div><label htmlFor="regulatory_number">Regulatory reference</label><input id="regulatory_number" name="regulatory_number" defaultValue={regulatory?.registration_number ?? ""} /></div>
              <div><label htmlFor="availability">Availability</label><input id="availability" name="availability" defaultValue={row.availability ?? ""} /></div>
              <div className="form-span-2"><label htmlFor="image_url">Public image URL</label><input id="image_url" name="image_url" type="url" defaultValue={row.image_url ?? ""} /></div>
            </div>
            <FormSubmitButton pendingLabel="Saving and submitting changes...">
              Save and submit changes
            </FormSubmitButton>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
