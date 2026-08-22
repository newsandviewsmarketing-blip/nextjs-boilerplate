import Link from "next/link";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import ProductEditorFields from "../../../components/ProductEditorFields";
import AdminNav from "../../components/AdminNav";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAdminProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const identity = await requireAdminPermission("products.manage", "/admin/products/new");
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("public_companies")
    .select("user_id, company_name")
    .order("company_name");

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div><span className="section-kicker">NEW PRODUCT</span><h1>Create a marketplace record.</h1><p>The new record begins unpublished and can be reviewed before release.</p></div>
          <Link className="button button-secondary" href="/admin/products">Back to products</Link>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            <FormMessage {...params} />
            <form className="backend-form-card" action={createAdminProductAction}>
              <ProductEditorFields companies={companies ?? []} showRegulatory={hasAdminPermission(identity, "regulatory.review")} />
              <FormSubmitButton pendingLabel="Creating product...">Create unpublished product</FormSubmitButton>
            </form>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
