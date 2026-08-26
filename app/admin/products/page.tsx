import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { changeAdminProductStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  company_user_id: string;
  slug: string;
  product_name: string;
  brand_name: string | null;
  category: string;
  verification_status: string;
  is_published: boolean;
  archived_at: string | null;
  updated_at: string;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const identity = await requireAdminPermission("products.manage", "/admin/products");
  const supabase = await createClient();
  const [{ data: products }, { data: companies }] = await Promise.all([
    supabase
      .from("products")
      .select("id, company_user_id, slug, product_name, brand_name, category, verification_status, is_published, archived_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(250),
    supabase.from("public_companies").select("user_id, company_name"),
  ]);
  const companyMap = new Map((companies ?? []).map((company) => [company.user_id, company.company_name]));
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "all";
  const rows = ((products ?? []) as ProductRow[]).filter((product) => {
    const text = `${product.product_name} ${product.brand_name ?? ""} ${product.category} ${companyMap.get(product.company_user_id) ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesStatus =
      status === "all" ||
      (status === "published" && product.is_published && !product.archived_at) ||
      (status === "unpublished" && !product.is_published && !product.archived_at) ||
      (status === "archived" && Boolean(product.archived_at)) ||
      product.verification_status === status;
    return matchesQuery && matchesStatus;
  });
  const allRows = (products ?? []) as ProductRow[];

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">MARKETPLACE ADMIN</span>
            <h1>Products and publishing.</h1>
            <p>Add, edit, publish, unpublish and archive from one workspace.</p>
          </div>
          <Link className="button button-primary" href="/admin/products/new">Add product</Link>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            <FormMessage error={params.error} message={params.message} />
            <div className="admin-summary phase4-summary">
              <article><b>{allRows.length}</b><span>Total records</span></article>
              <article><b>{allRows.filter((item) => item.is_published && !item.archived_at).length}</b><span>Published</span></article>
              <article><b>{allRows.filter((item) => item.verification_status === "pending" && !item.archived_at).length}</b><span>Pending review</span></article>
              <article><b>{allRows.filter((item) => item.archived_at).length}</b><span>Archived</span></article>
            </div>
            <form className="admin-filter-bar" method="get">
              <div>
                <label htmlFor="q">Search products</label>
                <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Product, brand, category or company" />
              </div>
              <div>
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={status}>
                  <option value="all">All records</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                  <option value="pending">Pending review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <button className="button button-secondary" type="submit">Apply filters</button>
            </form>
            {rows.length === 0 ? (
              <div className="empty-state"><h2>No matching products.</h2><p>Change the filters or create a new product record.</p></div>
            ) : (
              <div className="admin-data-list">
                {rows.map((product) => (
                  <article key={product.id} className={product.archived_at ? "is-archived" : ""}>
                    <div className="admin-data-main">
                      <div className="admin-data-title">
                        <span className="module-tag">{product.category}</span>
                        <h2>{product.product_name}</h2>
                      </div>
                      <p>{product.brand_name || "No brand"} · {companyMap.get(product.company_user_id) || "Approved company"}</p>
                      <div className="status-cluster">
                        <span className={`status-pill status-${product.verification_status}`}>{product.verification_status}</span>
                        <span className={`status-pill ${product.is_published ? "status-approved" : ""}`}>
                          {product.archived_at ? "archived" : product.is_published ? "published" : "unpublished"}
                        </span>
                      </div>
                    </div>
                    <div className="admin-row-actions">
                      <Link className="button button-secondary" href={`/admin/products/${product.id}`}>Edit</Link>
                      {!product.archived_at && !product.is_published && (
                        <form action={changeAdminProductStatusAction}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <button className="button button-primary" name="decision" value="publish" type="submit">Publish</button>
                        </form>
                      )}
                      {!product.archived_at && product.is_published && (
                        <form action={changeAdminProductStatusAction}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <button className="button button-secondary" name="decision" value="unpublish" type="submit">Unpublish</button>
                        </form>
                      )}
                      <form action={changeAdminProductStatusAction}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <button className="text-button" name="decision" value={product.archived_at ? "restore" : "archive"} type="submit">
                          {product.archived_at ? "Restore" : "Archive"}
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
