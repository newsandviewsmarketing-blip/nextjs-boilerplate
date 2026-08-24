import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import FormMessage from "../../../components/FormMessage";
import FormSubmitButton from "../../../components/FormSubmitButton";
import ProductEditorFields, { type ProductEditorValue } from "../../../components/ProductEditorFields";
import AdminNav from "../../components/AdminNav";
import { hasAdminPermission, requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  changeAdminProductStatusAction,
  permanentlyDeleteProductAction,
  updateAdminProductAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EditAdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const identity = await requireAdminPermission("products.manage", `/admin/products/${id}`);
  const supabase = await createClient();
  const canReviewRegulatory = hasAdminPermission(identity, "regulatory.review");
  const [{ data: product }, { data: regulatory }, { data: companies }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    canReviewRegulatory
      ? supabase.from("product_regulatory").select("registration_number").eq("product_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("public_companies").select("user_id, company_name").order("company_name"),
  ]);
  if (!product) notFound();
  const editorProduct = {
    ...(product as ProductEditorValue),
    regulatory_number: regulatory?.registration_number ?? null,
  };
  const updateAction = updateAdminProductAction.bind(null, id);

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div><span className="section-kicker">PRODUCT EDITOR</span><h1>{product.product_name}</h1><p>{product.verification_status} · {product.is_published ? "published" : "unpublished"}{product.archived_at ? " · archived" : ""}</p></div>
          <Link className="button button-secondary" href="/admin/products">Back to products</Link>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            <FormMessage {...messages} />
            <div className="product-admin-toolbar">
              <form action={changeAdminProductStatusAction}>
                <input type="hidden" name="product_id" value={id} />
                <button className="button button-primary" name="decision" value="publish" type="submit">Approve & publish</button>
              </form>
              <form action={changeAdminProductStatusAction}>
                <input type="hidden" name="product_id" value={id} />
                <button className="button button-secondary" name="decision" value="unpublish" type="submit">Unpublish</button>
              </form>
              <form action={changeAdminProductStatusAction}>
                <input type="hidden" name="product_id" value={id} />
                <button className="button button-secondary" name="decision" value="pending" type="submit">Return to review</button>
              </form>
              <form action={changeAdminProductStatusAction}>
                <input type="hidden" name="product_id" value={id} />
                <button className="text-button" name="decision" value={product.archived_at ? "restore" : "archive"} type="submit">{product.archived_at ? "Restore" : "Archive"}</button>
              </form>
            </div>
            <form className="backend-form-card" action={updateAction}>
              <ProductEditorFields product={editorProduct} companies={companies ?? []} lockCompany showRegulatory={canReviewRegulatory} />
              <FormSubmitButton pendingLabel="Saving product...">Save product details</FormSubmitButton>
            </form>
            {hasAdminPermission(identity, "products.delete") && (
              <form className="danger-zone" action={permanentlyDeleteProductAction}>
                <div><span className="section-kicker">DANGER ZONE</span><h2>Permanent removal</h2><p>This deletes the product and dependent variants, media, regulatory and inquiry records.</p></div>
                <input type="hidden" name="product_id" value={id} />
                <label htmlFor="confirmation">Type DELETE to confirm</label>
                <input id="confirmation" name="confirmation" autoComplete="off" required />
                <button className="button button-danger" type="submit">Permanently delete</button>
              </form>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
