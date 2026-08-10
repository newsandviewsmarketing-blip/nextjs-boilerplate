import { redirect } from "next/navigation";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormMessage from "../components/FormMessage";
import FormSubmitButton from "../components/FormSubmitButton";
import { reviewProductAction, reviewProfileAction } from "./actions";
import { getCurrentIdentity, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type PendingRow = Record<string, unknown> & { user_id: string };
type PendingDisplayRow = PendingRow & {
  profile_type: "veterinarian" | "company";
};
type PendingProduct = {
  id: string;
  company_user_id: string;
  product_name: string;
  brand_name: string | null;
  generic_name: string | null;
  category: string;
  sector: string | null;
  description: string | null;
  created_at: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (!identity.roles.some(isAdminRole))
    redirect("/dashboard?error=Admin%20access%20is%20required.");

  const supabase = await createClient();
  const [{ data: vets }, { data: companies }, { data: products }] = await Promise.all([
    supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("company_profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("products")
      .select("id, company_user_id, product_name, brand_name, generic_name, category, sector, description, created_at")
      .eq("verification_status", "pending")
      .order("created_at"),
  ]);
  const pending: PendingDisplayRow[] = [
    ...((vets ?? []) as PendingRow[]).map((row) => ({
      ...row,
      profile_type: "veterinarian" as const,
    })),
    ...((companies ?? []) as PendingRow[]).map((row) => ({
      ...row,
      profile_type: "company" as const,
    })),
  ];
  const ids = pending.map((row) => row.user_id);
  const { data: profiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, phone, city")
        .in("id", ids)
    : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const productRows = (products ?? []) as PendingProduct[];
  const productCompanyIds = [...new Set(productRows.map((product) => product.company_user_id))];
  const { data: productCompanies } = productCompanyIds.length
    ? await supabase
        .from("company_profiles")
        .select("user_id, company_name")
        .in("user_id", productCompanyIds)
    : { data: [] };
  const productCompanyMap = new Map(
    (productCompanies ?? []).map((company) => [company.user_id, company.company_name]),
  );
  const productIds = productRows.map((product) => product.id);
  const { data: complianceRows } = productIds.length
    ? await supabase
        .from("product_compliance")
        .select("product_id, regulatory_number")
        .in("product_id", productIds)
    : { data: [] };
  const complianceMap = new Map(
    (complianceRows ?? []).map((row) => [row.product_id, row.regulatory_number]),
  );

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">VETCONNECT ADMIN</span>
            <h1>Verification and moderation.</h1>
            <p>Signed in as {identity.email}</p>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <FormMessage {...params} />
          <div className="admin-summary">
            <article>
              <b>{pending.length}</b>
              <span>Pending profiles</span>
            </article>
            <article>
              <b>{(vets ?? []).length}</b>
              <span>Veterinarians</span>
            </article>
            <article>
              <b>{(companies ?? []).length}</b>
              <span>Companies</span>
            </article>
            <article>
              <b>{productRows.length}</b>
              <span>Products</span>
            </article>
          </div>
          <div className="admin-review-list">
            {pending.length === 0 && (
              <div className="empty-state">
                <h2>No profiles are waiting for review.</h2>
                <p>
                  New veterinarian and company registrations will appear here.
                </p>
              </div>
            )}
            {pending.map((row) => {
              const profile = profileMap.get(row.user_id);
              const type = String(row.profile_type);
              return (
                <article key={`${type}-${row.user_id}`}>
                  <div className="review-header">
                    <div>
                      <span className="module-tag">{type}</span>
                      <h2>
                        {type === "company"
                          ? String(
                              row.company_name ||
                                profile?.full_name ||
                                "Company",
                            )
                          : String(profile?.full_name || "Veterinarian")}
                      </h2>
                      <p>
                        {profile?.email} ·{" "}
                        {profile?.city || row.city || "City not provided"}
                      </p>
                    </div>
                    <span className="status-pill">Pending</span>
                  </div>
                  <dl className="review-details">
                    {type === "veterinarian" ? (
                      <>
                        <div>
                          <dt>PVMC number</dt>
                          <dd>{String(row.pvmc_number || "Not provided")}</dd>
                        </div>
                        <div>
                          <dt>Qualifications</dt>
                          <dd>
                            {String(row.qualifications || "Not provided")}
                          </dd>
                        </div>
                        <div>
                          <dt>Specialization</dt>
                          <dd>
                            {String(row.specialization || "Not provided")}
                          </dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <dt>Business type</dt>
                          <dd>{String(row.business_type || "Not provided")}</dd>
                        </div>
                        <div>
                          <dt>Registration / NTN</dt>
                          <dd>
                            {String(row.registration_number || "Not provided")}
                          </dd>
                        </div>
                        <div>
                          <dt>Address</dt>
                          <dd>{String(row.address || "Not provided")}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                  <form action={reviewProfileAction}>
                    <input type="hidden" name="profile_type" value={type} />
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <label htmlFor={`reason-${type}-${row.user_id}`}>
                      Review note, required when rejecting
                    </label>
                    <input
                      id={`reason-${type}-${row.user_id}`}
                      name="reason"
                      placeholder="Add correction or verification note"
                    />
                    <div className="review-actions">
                      <FormSubmitButton
                        className="button button-primary"
                        pendingLabel="Saving..."
                        name="decision"
                        value="approved"
                      >
                        Approve
                      </FormSubmitButton>
                      <button
                        className="button button-secondary"
                        type="submit"
                        name="decision"
                        value="rejected"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
          <div className="section-heading admin-product-heading">
            <span className="section-kicker">PRODUCT MODERATION</span>
            <h2>Marketplace submissions.</h2>
            <p>Approve complete company listings before they become public.</p>
          </div>
          <div className="admin-review-list">
            {productRows.length === 0 && (
              <div className="empty-state">
                <h2>No products are waiting for review.</h2>
                <p>New submissions from approved companies will appear here.</p>
              </div>
            )}
            {productRows.map((product) => (
              <article key={product.id}>
                <div className="review-header">
                  <div>
                    <span className="module-tag">{product.category}</span>
                    <h2>{product.product_name}</h2>
                    <p>
                      {productCompanyMap.get(product.company_user_id) || "Verified company"}
                      {product.sector ? ` · ${product.sector}` : ""}
                    </p>
                  </div>
                  <span className="status-pill">Pending</span>
                </div>
                <dl className="review-details">
                  <div><dt>Brand</dt><dd>{product.brand_name || "Not provided"}</dd></div>
                  <div><dt>Generic</dt><dd>{product.generic_name || "Not provided"}</dd></div>
                  <div><dt>Private regulatory reference</dt><dd>{complianceMap.get(product.id) || "Not provided"}</dd></div>
                </dl>
                <p>{product.description || "No product description was supplied."}</p>
                <form action={reviewProductAction}>
                  <input type="hidden" name="product_id" value={product.id} />
                  <label htmlFor={`product-reason-${product.id}`}>
                    Review note, required when rejecting
                  </label>
                  <input id={`product-reason-${product.id}`} name="reason" placeholder="Add correction or approval note" />
                  <div className="review-actions">
                    <FormSubmitButton className="button button-primary" pendingLabel="Saving..." name="decision" value="approved">
                      Approve and publish
                    </FormSubmitButton>
                    <button className="button button-secondary" type="submit" name="decision" value="rejected">Reject</button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
