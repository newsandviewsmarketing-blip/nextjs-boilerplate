import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function metadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata) return "No additional details";
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ") || "No additional details";
}

export default async function AdminAuditPage() {
  const identity = await requireAdminPermission("audit.view", "/admin/audit");
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(150);
  const rows = (data ?? []) as AuditRow[];

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div><span className="section-kicker">GOVERNANCE</span><h1>Administrative audit log.</h1><p>Latest recorded account, verification, marketplace and publishing actions.</p></div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            {rows.length === 0 ? (
              <div className="empty-state"><h2>No audit entries are available.</h2></div>
            ) : (
              <div className="audit-list">
                {rows.map((row) => (
                  <article key={row.id}>
                    <div>
                      <span className="module-tag">{row.entity_type}</span>
                      <h2>{row.action.replaceAll("_", " ").replaceAll(".", " · ")}</h2>
                      <p>{metadataSummary(row.metadata)}</p>
                    </div>
                    <dl>
                      <div><dt>Time</dt><dd>{new Date(row.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</dd></div>
                      <div><dt>Actor</dt><dd>{row.actor_id?.slice(0, 8) || "System"}</dd></div>
                      <div><dt>Record</dt><dd>{row.entity_id?.slice(0, 8) || "Not recorded"}</dd></div>
                    </dl>
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
