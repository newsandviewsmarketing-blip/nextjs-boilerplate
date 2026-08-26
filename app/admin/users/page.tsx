import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission, staffRoleOptions, staffRoleLabel } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updateStaffRolesAction, updateUserStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  city: string | null;
  primary_role: string;
  account_status: string;
  created_at: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  const params = await searchParams;
  const identity = await requireAdminPermission("users.manage", "/admin/users");
  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, city, primary_role, account_status, created_at").order("created_at", { ascending: false }).limit(250),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roleMap = new Map<string, string[]>();
  for (const row of roles ?? []) {
    const current = roleMap.get(row.user_id) ?? [];
    current.push(String(row.role));
    roleMap.set(row.user_id, current);
  }
  const query = (params.q ?? "").trim().toLowerCase();
  const rows = ((profiles ?? []) as UserRow[]).filter((profile) =>
    !query || `${profile.full_name} ${profile.email} ${profile.city ?? ""} ${profile.primary_role}`.toLowerCase().includes(query),
  );

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div><span className="section-kicker">ACCESS CONTROL</span><h1>Users and administrator hierarchy.</h1><p>Users self-register through verified email. Super Administrators assign controlled staff roles here.</p></div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            <FormMessage error={params.error} message={params.message} />
            <div className="role-hierarchy-grid">
              {staffRoleOptions.map((role) => (
                <article key={role.value}>
                  <b>Level {role.level}</b>
                  <h3>{role.label}</h3>
                  <p>{role.summary}</p>
                </article>
              ))}
            </div>
            <form className="admin-filter-bar" method="get">
              <div className="form-span-2"><label htmlFor="q">Find user</label><input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, email, city or primary role" /></div>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
            <div className="admin-data-list user-admin-list">
              {rows.map((user) => {
                const assignedRoles = roleMap.get(user.id) ?? [];
                return (
                  <article key={user.id}>
                    <div className="admin-data-main">
                      <div className="admin-data-title"><span className="module-tag">{user.primary_role.replaceAll("_", " ")}</span><h2>{user.full_name || "Unnamed account"}</h2></div>
                      <p>{user.email} · {user.city || "City not provided"}</p>
                      <div className="status-cluster">
                        <span className={`status-pill status-${user.account_status}`}>{user.account_status}</span>
                        {assignedRoles.filter((role) => staffRoleOptions.some((item) => item.value === role)).map((role) => <span className="status-pill" key={role}>{staffRoleLabel(role)}</span>)}
                      </div>
                    </div>
                    <div className="user-admin-forms">
                      <form className="staff-role-form" action={updateStaffRolesAction}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <fieldset>
                          <legend>Staff roles</legend>
                          {staffRoleOptions.map((role) => (
                            <label className="checkbox-line" key={role.value}>
                              <input type="checkbox" name="staff_roles" value={role.value} defaultChecked={assignedRoles.includes(role.value)} />
                              {role.label}
                            </label>
                          ))}
                        </fieldset>
                        <FormSubmitButton className="button button-secondary" pendingLabel="Saving roles...">Save roles</FormSubmitButton>
                      </form>
                      <form className="inline-status-form" action={updateUserStatusAction}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <select name="account_status" defaultValue={user.account_status} aria-label={`Account status for ${user.full_name || user.email}`}>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                        <button className="button button-secondary" type="submit">Update account</button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
