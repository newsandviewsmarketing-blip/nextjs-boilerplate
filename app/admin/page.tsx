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
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "active");
    activeUsers = count ?? 0;
  }

  const modules = [
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
          <AdminNav roles={identity.roles} />
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
                <article><b>{activeUsers}</b><span>Active user accounts</span></article>
              )}
            </div>
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
