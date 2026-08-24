import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import FormMessage from "../../../../components/FormMessage";
import FormSubmitButton from "../../../../components/FormSubmitButton";
import ProductEditorFields, { type ProductEditorValue } from "../../../../components/ProductEditorFields";
import { getCurrentIdentity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateCompanyProductAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function CompanyProductEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const identity = await getCurrentIdentity();
  if (!identity) redirect(`/login?next=${encodeURIComponent(`/dashboard/company/products/${id}`)}`);
  if (!identity.roles.includes("company")) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: product }, { data: regulatory }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).eq("company_user_id", identity.userId).maybeSingle(),
    supabase.from("product_regulatory").select("registration_number").eq("product_id", id).eq("company_user_id", identity.userId).maybeSingle(),
  ]);
  if (!product) notFound();
  const updateAction = updateCompanyProductAction.bind(null, id);
  const editorProduct = {
    ...(product as ProductEditorValue),
    regulatory_number: regulatory?.registration_number ?? null,
  };

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">COMPANY PRODUCT EDITOR</span>
            <h1>{product.product_name}</h1>
            <p>{product.verification_status} · {product.is_published ? "published" : "unpublished"}</p>
          </div>
          <Link className="button button-secondary" href="/dashboard/company">Back to company workspace</Link>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...messages} />
          {product.verification_status === "approved" && (
            <div className="setup-notice">
              <h2>Approved product editing</h2>
              <p>Saving a material change returns the product to administrator review and temporarily removes it from public listings.</p>
            </div>
          )}
          <form className="backend-form-card" action={updateAction}>
            <ProductEditorFields product={editorProduct} />
            <FormSubmitButton pendingLabel="Saving product...">Save and submit changes</FormSubmitButton>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
