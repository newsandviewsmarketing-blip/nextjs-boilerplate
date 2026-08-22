import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  companyInitials,
  sampleCompanies,
  type PublicCompany,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

async function loadCompanies() {
  if (!isSupabaseConfigured()) return sampleCompanies;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_companies")
    .select(
      "user_id, company_name, business_type, city, address, description, website, contact_email, logo_url",
    )
    .order("company_name");
  return data?.length ? (data as PublicCompany[]) : sampleCompanies;
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const companies = await loadCompanies();
  const query = (params.q ?? "").toLowerCase();
  const visibleCompanies = companies.filter(
    (company) =>
      (!query ||
        `${company.company_name} ${company.business_type ?? ""} ${company.city ?? ""} ${company.description ?? ""}`
          .toLowerCase()
          .includes(query)) &&
      (!params.type ||
        params.type === "All business types" ||
        company.business_type?.toLowerCase().includes(params.type.toLowerCase())),
  );
  const types = [...new Set(companies.map((company) => company.business_type).filter(Boolean))] as string[];

  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">COMPANY DIRECTORY</span>
          <h1>A verified animal-health business network.</h1>
          <p>
            Approved company profiles provide the identity layer behind public
            marketplace products and customer inquiries.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register?role=company#registration">Register a company</Link>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <div className="directory-top">
            <div>
              <b>{visibleCompanies.length} company profiles</b>
              <span>{companies.some((company) => company.is_sample) ? "Sample preview until companies are approved" : "Administrator-approved directory"}</span>
            </div>
            <form className="market-search" method="get">
              <input name="q" defaultValue={params.q ?? ""} placeholder="Search company" />
              <select name="type" defaultValue={params.type ?? "All business types"}>
                <option>All business types</option>
                {types.map((type) => <option key={type}>{type}</option>)}
              </select>
              <button className="button button-primary" type="submit">Search</button>
            </form>
          </div>
          {visibleCompanies.length === 0 ? (
            <div className="empty-state"><h2>No companies match this search.</h2><Link href="/companies">Clear search</Link></div>
          ) : (
            <div className="company-grid">
              {visibleCompanies.map((company, index) => (
                <article key={company.user_id ?? company.company_name}>
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="company-mark large company-logo" src={company.logo_url} alt="" />
                  ) : (
                    <div className="company-mark large">{companyInitials(company.company_name)}</div>
                  )}
                  {company.is_sample && <span className="sample-label">Sample company</span>}
                  <h3>{company.company_name}</h3>
                  <p>{company.business_type || "Animal health"} • {company.city || "Pakistan"}</p>
                  <div className="profile-chips"><span>{company.description || "Verified business profile"}</span></div>
                  <dl>
                    <div><dt>Products</dt><dd>Approved listings</dd></div>
                    <div><dt>Contact</dt><dd>Profile-controlled</dd></div>
                    <div><dt>Status</dt><dd>{company.is_sample ? "Preview" : "Verified"}</dd></div>
                  </dl>
                  <Link className="button button-primary button-full" href={`/companies/${company.user_id ?? `sample-${index + 1}`}`}>
                    View company
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell two-col">
          <div><span className="section-kicker">BUSINESS PROFILE</span><h2>A single verified company identity.</h2><p>Company approval connects business details, public products and information requests without exposing private verification documents.</p></div>
          <div className="spec-list">
            <div><b>Identity</b><span>Registered name, business type and location.</span></div>
            <div><b>Public contacts</b><span>Company-controlled email and website.</span></div>
            <div><b>Marketplace</b><span>Only administrator-approved products are public.</span></div>
            <div><b>Privacy</b><span>Regulatory records remain protected from public access.</span></div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
