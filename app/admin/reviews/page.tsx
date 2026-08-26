import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import AdminNav from "../components/AdminNav";
import {
  reviewProductAction,
  reviewProfileAction,
  reviewVeterinarianCredentialAction,
  reviewJobAction,
  reviewProductRegulatoryAction,
} from "../actions";
import { getCurrentIdentity } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type PendingRow = Record<string, unknown> & { user_id: string; entity_id?: string };
type PendingDisplayRow = PendingRow & {
  profile_type: "veterinarian" | "company" | "professional" | "laboratory";
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
type PendingJob = {
  id: string;
  company_user_id: string;
  title: string;
  description: string;
  sector: string | null;
  city: string | null;
  employment_type: string;
  minimum_qualification: string | null;
  minimum_experience: number;
  deadline: string | null;
};
type PendingRegulatory = {
  product_id: string;
  registration_number: string | null;
  registration_status: string | null;
  applicability: string | null;
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
  if (
    !hasAdminPermission(identity, "profiles.review") &&
    !hasAdminPermission(identity, "products.manage") &&
    !hasAdminPermission(identity, "jobs.manage") &&
    !hasAdminPermission(identity, "regulatory.review")
  )
    redirect("/dashboard?error=Admin%20access%20is%20required.");

  const supabase = await createClient();
  const [{ data: vets }, { data: credentialVets }, { data: companies }, { data: professionals }, { data: laboratories }, { data: products }, { data: jobs }] = await Promise.all([
    supabase
      .from("veterinarian_profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("veterinarian_profiles")
      .select("user_id, pvmc_number, qualifications, specialization, city, pvmc_verification_status")
      .eq("verification_status", "approved")
      .eq("pvmc_verification_status", "pending")
      .order("created_at"),
    supabase
      .from("company_profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("professional_profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("laboratories")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("products")
      .select("id, company_user_id, product_name, brand_name, generic_name, category, sector, description, created_at")
      .eq("verification_status", "pending")
      .order("created_at"),
    supabase
      .from("jobs")
      .select("id, company_user_id, title, description, sector, city, employment_type, minimum_qualification, minimum_experience, deadline")
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
    ...((professionals ?? []) as PendingRow[]).map((row) => ({
      ...row,
      profile_type: "professional" as const,
    })),
    ...((laboratories ?? []) as Array<Record<string, unknown> & { id: string; owner_id: string }>).map((row) => ({
      ...row,
      user_id: row.owner_id,
      entity_id: row.id,
      profile_type: "laboratory" as const,
    })),
  ];
  const ids = [...new Set([
    ...pending.map((row) => row.user_id),
    ...((credentialVets ?? []) as PendingRow[]).map((row) => row.user_id),
  ])];
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
  const jobRows = (jobs ?? []) as PendingJob[];
  const { data: regulatoryData } = await supabase
    .from("product_regulatory")
    .select("product_id, registration_number, registration_status, applicability")
    .eq("verification_status", "pending");
  const regulatoryRows = (regulatoryData ?? []) as PendingRegulatory[];
  const regulatoryProductIds = regulatoryRows.map((row) => row.product_id);
  const { data: regulatoryProducts } = regulatoryProductIds.length
    ? await supabase
        .from("products")
        .select("id, product_name, company_user_id, category")
        .in("id", regulatoryProductIds)
    : { data: [] };
  const regulatoryProductMap = new Map(
    (regulatoryProducts ?? []).map((product) => [product.id, product]),
  );
  const productCompanyIds = [...new Set([
    ...productRows.map((product) => product.company_user_id),
    ...jobRows.map((job) => job.company_user_id),
  ])];
  const { data: productCompanies } = productCompanyIds.length
    ? await supabase
        .from("public_companies")
        .select("user_id, company_name")
        .in("user_id", productCompanyIds)
    : { data: [] };
  const productCompanyMap = new Map(
    (productCompanies ?? []).map((company) => [company.user_id, company.company_name]),
  );
  const productIds = productRows.map((product) => product.id);
  const { data: complianceRows } = productIds.length
    ? await supabase
        .from("product_regulatory")
        .select("product_id, registration_number")
        .in("product_id", productIds)
    : { data: [] };
  const complianceMap = new Map(
    (complianceRows ?? []).map((row) => [row.product_id, row.registration_number]),
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
  <div className="shell admin-control-layout">
    <AdminNav roles={identity.roles} />

    <div className="admin-control-content">
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
              <b>{(credentialVets ?? []).length}</b>
              <span>PVMC checks</span>
            </article>
            <article>
              <b>{(companies ?? []).length}</b>
              <span>Companies</span>
            </article>
            <article>
              <b>{(professionals ?? []).length}</b>
              <span>Professionals</span>
            </article>
            <article>
              <b>{(laboratories ?? []).length}</b>
              <span>Laboratories</span>
            </article>
            <article>
              <b>{productRows.length}</b>
              <span>Products</span>
            </article>
            <article>
              <b>{regulatoryRows.length}</b>
              <span>Regulatory checks</span>
            </article>
            <article>
              <b>{jobRows.length}</b>
              <span>Jobs</span>
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
                          ? String(row.company_name || profile?.full_name || "Company")
                          : type === "laboratory"
                            ? String(row.laboratory_name || profile?.full_name || "Laboratory")
                            : String(profile?.full_name || (type === "professional" ? "Professional" : "Veterinarian"))}
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
                    ) : type === "company" ? (
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
                    ) : type === "professional" ? (
                      <>
                        <div><dt>Professional type</dt><dd>{String(row.professional_type || "Not provided")}</dd></div>
                        <div><dt>Headline</dt><dd>{String(row.headline || "Not provided")}</dd></div>
                        <div><dt>Organization</dt><dd>{String(row.organization_name || "Not provided")}</dd></div>
                      </>
                    ) : (
                      <>
                        <div><dt>Laboratory type</dt><dd>{String(row.laboratory_type || "Not provided")}</dd></div>
                        <div><dt>Technical head</dt><dd>{String(row.technical_head || "Not provided")}</dd></div>
                        <div><dt>Address</dt><dd>{String(row.address || "Not provided")}</dd></div>
                      </>
                    )}
                  </dl>
                  <form action={reviewProfileAction}>
                    <input type="hidden" name="profile_type" value={type} />
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <input type="hidden" name="entity_id" value={String(row.entity_id || row.user_id)} />
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
            <span className="section-kicker">VETERINARY CREDENTIAL REVIEW</span>
            <h2>PVMC verification is separate from profile approval.</h2>
            <p>Registration numbers remain private. Only the verified status is published.</p>
          </div>
          <div className="admin-review-list">
            {(credentialVets ?? []).length === 0 && (
              <div className="empty-state"><h2>No PVMC credentials are waiting for review.</h2></div>
            )}
            {((credentialVets ?? []) as PendingRow[]).map((row) => {
              const profile = profileMap.get(row.user_id);
              return (
                <article key={`credential-${row.user_id}`}>
                  <div className="review-header"><div><span className="module-tag">PVMC</span><h2>{profile?.full_name || "Veterinarian"}</h2><p>{profile?.email} · {profile?.city || row.city || "City not provided"}</p></div><span className="status-pill">Pending</span></div>
                  <dl className="review-details"><div><dt>Private PVMC number</dt><dd>{String(row.pvmc_number || "Not provided")}</dd></div><div><dt>Qualification</dt><dd>{String(row.qualifications || "Not provided")}</dd></div><div><dt>Specialization</dt><dd>{String(row.specialization || "Not provided")}</dd></div></dl>
                  <form action={reviewVeterinarianCredentialAction}>
                    <input type="hidden" name="user_id" value={row.user_id} />
                    <label htmlFor={`credential-reason-${row.user_id}`}>Verification source or review note</label>
                    <input id={`credential-reason-${row.user_id}`} name="reason" placeholder="Record the source used for this decision" />
                    <div className="review-actions"><FormSubmitButton className="button button-primary" pendingLabel="Saving..." name="decision" value="approved">Verify credential</FormSubmitButton><button className="button button-secondary" type="submit" name="decision" value="rejected">Return / reject</button></div>
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
          <div className="section-heading admin-product-heading"><span className="section-kicker">REGULATORY REVIEW</span><h2>Product registration evidence.</h2><p>Product-profile approval and regulatory verification are recorded separately.</p></div>
          <div className="admin-review-list">
            {regulatoryRows.length === 0 && <div className="empty-state"><h2>No regulatory records are waiting for review.</h2></div>}
            {regulatoryRows.map((row) => { const product = regulatoryProductMap.get(row.product_id); return <article key={`regulatory-${row.product_id}`}><div className="review-header"><div><span className="module-tag">REGULATORY</span><h2>{product?.product_name || "Product"}</h2><p>{product?.category || "Animal health product"}</p></div><span className="status-pill">Pending</span></div><dl className="review-details"><div><dt>Private registration reference</dt><dd>{row.registration_number || "Not provided"}</dd></div><div><dt>Submitted status</dt><dd>{row.registration_status || "Not provided"}</dd></div><div><dt>Applicability</dt><dd>{row.applicability || "Requires reviewer determination"}</dd></div></dl><form action={reviewProductRegulatoryAction}><input type="hidden" name="product_id" value={row.product_id} /><label htmlFor={`regulatory-note-${row.product_id}`}>Verification source and reviewer note</label><input id={`regulatory-note-${row.product_id}`} name="notes" placeholder="Record the source and basis for this decision" /><div className="review-actions"><FormSubmitButton className="button button-primary" pendingLabel="Saving..." name="decision" value="verified">Verify registration</FormSubmitButton><button className="button button-secondary" type="submit" name="decision" value="not_applicable">Mark reviewed: not applicable</button><button className="button button-secondary" type="submit" name="decision" value="returned">Return for correction</button></div></form></article>; })}
        
                   </div>

          <div className="section-heading admin-product-heading">
            <span className="section-kicker">JOB MODERATION</span>
            <h2>Employer opportunities.</h2>
            <p>Approve complete, credible job information before it becomes public.</p>
          </div>

          <div className="admin-review-list">
            {jobRows.length === 0 && (
              <div className="empty-state">
                <h2>No jobs are waiting for review.</h2>
                <p>New opportunities from approved companies will appear here.</p>
              </div>
            )}

            {jobRows.map((job) => (
              <article key={job.id}>
                <div className="review-header">
                  <div>
                    <span className="module-tag">{job.sector || "JOB"}</span>
                    <h2>{job.title}</h2>
                    <p>
                      {productCompanyMap.get(job.company_user_id) || "Verified company"} ·{" "}
                      {job.city || "Pakistan"}
                    </p>
                  </div>
                  <span className="status-pill">Pending</span>
                </div>

                <dl className="review-details">
                  <div>
                    <dt>Employment type</dt>
                    <dd>{job.employment_type}</dd>
                  </div>
                  <div>
                    <dt>Qualification</dt>
                    <dd>{job.minimum_qualification || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd>{job.minimum_experience} years</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{job.deadline || "Not provided"}</dd>
                  </div>
                </dl>

                <p>{job.description}</p>

                <form action={reviewJobAction}>
                  <input type="hidden" name="job_id" value={job.id} />

                  <div className="review-actions">
                    <FormSubmitButton
                      className="button button-primary"
                      pendingLabel="Saving..."
                      name="decision"
                      value="approved"
                    >
                      Approve and publish
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
            ))}
          </div>

        </div>
      </div>
    </section>
      <SiteFooter />
    </main>
  );
}
