import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AdminNav from "./components/AdminNav";
import { requireAdminPermission, hasAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const identity = await requireAdminPermission("admin.view", "/admin");
  const supabase = await createClient();

  let pendingProfiles = 0;
  let pendingCredentials = 0;
  let pendingProducts = 0;
  let publishedProducts = 0;
  let pendingJobs = 0;
  let activeUsers = 0;
  let totalVeterinarians = 0;
  let approvedVeterinarians = 0;
  let totalCompanies = 0;
  let jobApplications = 0;
  let newRegistrations24h = 0;
  let newApplications24h = 0;
  let newProducts24h = 0;
  let newJobs24h = 0;
  let pendingClinicClaims = 0;
  let totalClinics = 0;
  let totalLaboratories = 0;
  let totalProfessionals = 0;
  let adminTeamCount = 0;
  let reviewerPerformance: Array<{ actorId: string; name: string; email: string; approved: number; rejected: number; returned: number; total: number }> = [];
  let recentAudit: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }> = [];

  if (hasAdminPermission(identity, "profiles.review")) {
    const [vets, companies, professionals, laboratories, credentials] =
      await Promise.all([
        supabase.from("veterinarian_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("company_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("professional_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("laboratories").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("veterinarian_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "approved").eq("pvmc_verification_status", "pending"),
      ]);
    pendingProfiles =
      (vets.count ?? 0) +
      (companies.count ?? 0) +
      (professionals.count ?? 0) +
      (laboratories.count ?? 0);
    pendingCredentials = credentials.count ?? 0;
  }

  if (hasAdminPermission(identity, "products.manage")) {
    const [pending, published] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("verification_status", "pending").is("archived_at", null),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_published", true).is("archived_at", null),
    ]);
    pendingProducts = pending.count ?? 0;
    publishedProducts = published.count ?? 0;
  }

  if (hasAdminPermission(identity, "jobs.manage")) {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending");
    pendingJobs = count ?? 0;
  }

  if (hasAdminPermission(identity, "users.manage")) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      users,
      vets,
      approvedVets,
      companies,
      applications,
      professionals,
      clinics,
      laboratories,
      newUsers,
      newApplications,
      newProducts,
      newJobs,
      clinicClaims,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "active"),
      supabase.from("veterinarian_profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("veterinarian_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "approved"),
      supabase.from("company_profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("job_applications").select("id", { count: "exact", head: true }),
      supabase.from("professional_profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("clinics").select("id", { count: "exact", head: true }),
      supabase.from("laboratories").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("job_applications").select("id", { count: "exact", head: true }).gte("applied_at", since24h),
      supabase.from("products").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("jobs").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("clinic_members").select("clinic_id", { count: "exact", head: true }).eq("membership_status", "pending"),
    ]);
    activeUsers = users.count ?? 0;
    totalVeterinarians = vets.count ?? 0;
    approvedVeterinarians = approvedVets.count ?? 0;
    totalCompanies = companies.count ?? 0;
    jobApplications = applications.count ?? 0;
    totalProfessionals = professionals.count ?? 0;
    totalClinics = clinics.count ?? 0;
    totalLaboratories = laboratories.count ?? 0;
    newRegistrations24h = newUsers.count ?? 0;
    newApplications24h = newApplications.count ?? 0;
    newProducts24h = newProducts.count ?? 0;
    newJobs24h = newJobs.count ?? 0;
    pendingClinicClaims = clinicClaims.count ?? 0;
    const { data: staffRows } = await supabase.from("user_roles").select("user_id, role").in("role", ["super_admin", "verification_officer", "content_admin", "career_admin", "analyst"]);
    adminTeamCount = new Set((staffRows ?? []).map((row) => row.user_id)).size;
  }

  if (hasAdminPermission(identity, "review.analytics")) {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: decisionRows } = await supabase
      .from("audit_logs")
      .select("actor_id, action, created_at")
      .gte("created_at", since30d)
      .order("created_at", { ascending: false })
      .limit(1000);
    const decisions = (decisionRows ?? []).filter((row) => row.actor_id && (row.action.endsWith(".approved") || row.action.endsWith(".verified") || row.action.endsWith(".not_applicable") || row.action.endsWith(".rejected") || row.action.endsWith(".returned")));
    const actorIds = [...new Set(decisions.map((row) => row.actor_id).filter(Boolean))] as string[];
    const { data: actorProfiles } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
    const actorMap = new Map<string, { id: string; full_name: string | null; email: string }>((((actorProfiles ?? []) as Array<{ id: string; full_name: string | null; email: string }>)).map((row) => [row.id, row]));
    const perf = new Map<string, { actorId: string; name: string; email: string; approved: number; rejected: number; returned: number; total: number }>();
    for (const row of decisions) {
      const actorId = String(row.actor_id);
      const actor = actorMap.get(actorId);
      const current = perf.get(actorId) ?? { actorId, name: actor?.full_name || "Administrator", email: actor?.email || "Account unavailable", approved: 0, rejected: 0, returned: 0, total: 0 };
      if (row.action.endsWith(".rejected")) current.rejected += 1;
      else if (row.action.endsWith(".returned")) current.returned += 1;
      else current.approved += 1;
      current.total += 1;
      perf.set(actorId, current);
    }
    reviewerPerformance = [...perf.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }

  if (hasAdminPermission(identity, "audit.view")) {
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    recentAudit = (data ?? []) as typeof recentAudit;
  }

  const modules = [
    {
      allowed:
        hasAdminPermission(identity, "profiles.create") ||
        hasAdminPermission(identity, "companies.create") ||
        hasAdminPermission(identity, "clinics.manage") ||
        hasAdminPermission(identity, "laboratories.manage") ||
        hasAdminPermission(identity, "products.create") ||
        hasAdminPermission(identity, "jobs.create"),
      tag: "ASSISTED ENTRY",
      title: "Create records for clients",
      text: "Staff-assisted entry for professionals, companies, clinics, laboratories, products and jobs without requiring the client to create the record first.",
      href: "/admin/create",
    },
    {
      allowed: hasAdminPermission(identity, "directories.manage") || hasAdminPermission(identity, "users.manage"),
      tag: "MASTER DIRECTORY",
      title: "Operational database table",
      text: "Search linked users, professionals, companies, clinics, laboratories, products and jobs with direct record links.",
      href: "/admin/directory",
    },
    {
      allowed: hasAdminPermission(identity, "master_data.manage"),
      tag: "DATA STUDIO",
      title: "Manage dropdowns and master data",
      text: "Add cities, sectors, services, facility types, tests, product packaging, vaccine types, job sectors and other reusable options without a code deployment.",
      href: "/admin/data",
    },
    {
      allowed:
        hasAdminPermission(identity, "profiles.review") ||
        hasAdminPermission(identity, "regulatory.review") ||
        hasAdminPermission(identity, "jobs.manage"),
      tag: "VERIFY",
      title: "Review queues",
      text: "Profiles, PVMC credentials, product regulatory records and jobs awaiting a decision.",
      href: "/admin/reviews",
    },
    {
      allowed: hasAdminPermission(identity, "products.manage"),
      tag: "MARKETPLACE",
      title: "Product management",
      text: "Add, edit, publish, unpublish, archive, restore or remove product records.",
      href: "/admin/products",
    },
    {
      allowed: hasAdminPermission(identity, "users.manage"),
      tag: "ACCESS",
      title: "Users and hierarchy",
      text: "Activate accounts and assign multiple staff roles without changing user-owned profiles.",
      href: "/admin/users",
    },
    {
      allowed: hasAdminPermission(identity, "review.analytics"),
      tag: "ACCOUNTABILITY",
      title: "Reviewer performance",
      text: "See who approved, rejected or returned records and review the full decision register.",
      href: "/admin/review-history",
    },
    {
      allowed: hasAdminPermission(identity, "audit.view"),
      tag: "GOVERNANCE",
      title: "Audit log",
      text: "Read the latest administrative changes and publishing decisions.",
      href: "/admin/audit",
    },
  ].filter((item) => item.allowed);

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">VETCONNECT ADMIN</span>
            <h1>Platform control centre.</h1>
            <p>Role-based operations for {identity.email}</p>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
         <aside className="admin-control-sidebar">
  <AdminNav roles={identity.roles} />
</aside>
          <div className="admin-control-content">
            <div className="section-heading">
              <span className="section-kicker">TODAY&apos;S WORK</span>
              <h2>Queues and platform status.</h2>
              <p>Only modules permitted for your assigned role are shown.</p>
            </div>
            <div className="admin-summary phase4-summary">
              {hasAdminPermission(identity, "profiles.review") && (
                <>
                  <article><b>{pendingProfiles}</b><span>Profiles to review</span></article>
                  <article><b>{pendingCredentials}</b><span>Credential checks</span></article>
                </>
              )}
              {hasAdminPermission(identity, "products.manage") && (
                <>
                  <article><b>{pendingProducts}</b><span>Products to review</span></article>
                  <article><b>{publishedProducts}</b><span>Published products</span></article>
                </>
              )}
              {hasAdminPermission(identity, "jobs.manage") && (
                <article><b>{pendingJobs}</b><span>Jobs to review</span></article>
              )}
              {hasAdminPermission(identity, "users.manage") && (
                <>
                  <article><b>{activeUsers}</b><span>Active user accounts</span></article>
                  <article><b>{adminTeamCount}</b><span>Administrator accounts</span></article>
                  <article><b>{totalVeterinarians}</b><span>Total veterinarians</span></article>
                  <article><b>{approvedVeterinarians}</b><span>Approved veterinarians</span></article>
                  <article><b>{totalCompanies}</b><span>Registered companies</span></article>
                  <article><b>{jobApplications}</b><span>Job applications</span></article>
                </>
              )}
            </div>
            {hasAdminPermission(identity, "users.manage") && (
              <section className="admin-pulse-panel" aria-labelledby="operational-pulse-heading">
                <div className="section-heading compact-heading">
                  <span className="section-kicker">LAST 24 HOURS</span>
                  <h2 id="operational-pulse-heading">Operational pulse.</h2>
                  <p>A quick summary of activity that needs attention or shows platform movement.</p>
                </div>
                <div className="admin-pulse-grid">
                  <article><b>{newRegistrations24h}</b><span>New registrations</span></article>
                  <article><b>{newApplications24h}</b><span>New job applications</span></article>
                  <article><b>{newProducts24h}</b><span>New product records</span></article>
                  <article><b>{newJobs24h}</b><span>New job records</span></article>
                  <article><b>{pendingClinicClaims}</b><span>Pending clinic affiliations</span></article>
                  <article><b>{totalProfessionals}</b><span>Professional profiles</span></article>
                  <article><b>{totalClinics}</b><span>Clinics in database</span></article>
                  <article><b>{totalLaboratories}</b><span>Laboratories in database</span></article>
                </div>
              </section>
            )}

            {hasAdminPermission(identity, "review.analytics") && (
              <section className="admin-reviewer-performance" aria-labelledby="reviewer-performance-heading">
                <div className="admin-activity-header">
                  <div><span className="section-kicker">LAST 30 DAYS</span><h2 id="reviewer-performance-heading">Reviewer accountability.</h2><p>Approval and rejection counts by administrator.</p></div>
                  <Link href="/admin/review-history">Open full review history →</Link>
                </div>
                {reviewerPerformance.length === 0 ? (
                  <div className="empty-state"><h2>No review decisions recorded yet.</h2></div>
                ) : (
                  <div className="admin-directory-table-wrap">
                    <table className="admin-directory-table reviewer-table">
                      <thead><tr><th>Administrator</th><th>Approved / verified</th><th>Rejected</th><th>Returned</th><th>Total</th></tr></thead>
                      <tbody>{reviewerPerformance.map((reviewer) => <tr key={reviewer.actorId}><td><b>{reviewer.name}</b><small>{reviewer.email}</small></td><td>{reviewer.approved}</td><td>{reviewer.rejected}</td><td>{reviewer.returned}</td><td><b>{reviewer.total}</b></td></tr>)}</tbody>
                    </table>
                  </div>
                )}
                {hasAdminPermission(identity, "users.manage") && <div className="management-links"><Link className="button button-secondary" href="/admin/users#staff-roles">Manage administrator roles & permissions</Link></div>}
              </section>
            )}

            {hasAdminPermission(identity, "audit.view") && recentAudit.length > 0 && (
              <section className="admin-recent-activity" aria-labelledby="recent-activity-heading">
                <div className="admin-activity-header">
                  <div>
                    <span className="section-kicker">RECENT UPDATES</span>
                    <h2 id="recent-activity-heading">Latest recorded actions.</h2>
                  </div>
                  <Link href="/admin/audit">Open full audit log →</Link>
                </div>
                <div className="admin-activity-list">
                  {recentAudit.map((row, index) => (
                    <article key={row.id}>
                      <span className="admin-activity-index">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <b>{row.action.replaceAll("_", " ").replaceAll(".", " · ")}</b>
                        <span>{row.entity_type.replaceAll("_", " ")} · {new Date(row.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className="admin-module-grid">
              {modules.map((item) => (
                <article key={item.href}>
                  <span>{item.tag}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link href={item.href}>Open module →</Link>
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
