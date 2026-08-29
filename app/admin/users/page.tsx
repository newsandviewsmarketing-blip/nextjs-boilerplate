import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission, staffRoleOptions, staffRoleLabel, permissionOptions } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updateStaffRolesAction, updateUserStatusAction, updateUserPermissionsAction } from "./actions";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  city: string | null;
  province: string | null;
  district: string | null;
  tehsil: string | null;
  primary_role: string;
  account_status: string;
  created_at: string;
};

type VetRow = {
  user_id: string;
  pvmc_number: string | null;
  veterinary_sector: string | null;
  specialization: string | null;
  verification_status: string | null;
};

type Params = {
  error?: string;
  message?: string;
  q?: string;
  role?: string;
  province?: string;
  district?: string;
  sector?: string;
  verification?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const identity = await requireAdminPermission("users.manage", "/admin/users");
  const supabase = await createClient();

  const [{ data: profiles, error: profilesError }, { data: roles }, { data: vets, error: vetsError }, { data: permissionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, city, province, district, tehsil, primary_role, account_status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("user_roles").select("user_id, role"),
    supabase
      .from("veterinarian_profiles")
      .select("user_id, pvmc_number, veterinary_sector, specialization, verification_status"),
    supabase.from("admin_user_permissions").select("user_id, granted_permissions, revoked_permissions"),
  ]);

  const roleMap = new Map<string, string[]>();
  for (const row of roles ?? []) {
    const current = roleMap.get(row.user_id) ?? [];
    current.push(String(row.role));
    roleMap.set(row.user_id, current);
  }

  const vetMap = new Map<string, VetRow>();
  for (const row of (vets ?? []) as VetRow[]) vetMap.set(row.user_id, row);
  const permissionMap = new Map<string, { granted: string[]; revoked: string[] }>();
  for (const row of permissionRows ?? []) permissionMap.set(row.user_id, { granted: row.granted_permissions ?? [], revoked: row.revoked_permissions ?? [] });

  const allRows = (profiles ?? []) as UserRow[];
  const query = (params.q ?? "").trim().toLowerCase();
  const rows = allRows.filter((profile) => {
    const vet = vetMap.get(profile.id);
    const haystack = `${profile.full_name} ${profile.email} ${profile.city ?? ""} ${profile.tehsil ?? ""} ${profile.district ?? ""} ${profile.province ?? ""} ${profile.primary_role} ${vet?.pvmc_number ?? ""} ${vet?.veterinary_sector ?? ""} ${vet?.specialization ?? ""}`.toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!params.role || params.role === "all" || profile.primary_role === params.role) &&
      (!params.province || params.province === "all" || profile.province === params.province) &&
      (!params.district || params.district === "all" || profile.district === params.district) &&
      (!params.sector || params.sector === "all" || vet?.veterinary_sector === params.sector) &&
      (!params.verification || params.verification === "all" || vet?.verification_status === params.verification)
    );
  });

  const provinces = [...new Set(allRows.map((row) => row.province).filter(Boolean))].sort() as string[];
  const districts = [...new Set(allRows.filter((row) => !params.province || params.province === "all" || row.province === params.province).map((row) => row.district).filter(Boolean))].sort() as string[];
  const sectors = [...new Set(((vets ?? []) as VetRow[]).map((row) => row.veterinary_sector).filter(Boolean))].sort() as string[];
  const primaryRoles = [...new Set(allRows.map((row) => row.primary_role).filter(Boolean))].sort();
  const exportParams = new URLSearchParams();
  for (const key of ["q", "role", "province", "district", "sector", "verification"] as const) {
    const value = params[key];
    if (value && value !== "all") exportParams.set(key, value);
  }
  const exportHref = `/admin/users/export${exportParams.size ? `?${exportParams.toString()}` : ""}`;

  return (
    <main>
      <SiteHeader />
      <section className="dashboard-hero">
        <div className="shell dashboard-hero-row">
          <div>
            <span className="section-kicker">ACCESS CONTROL & DIRECTORY</span>
            <h1>Users, veterinarians and administrator hierarchy.</h1>
            <p>Searchable operational directory with standardized geography and Excel-compatible export.</p>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell admin-control-layout">
          <AdminNav roles={identity.roles} />
          <div className="admin-control-content">
            <FormMessage
              error={params.error || profilesError?.message || vetsError?.message}
              message={params.message}
            />

            <div className="admin-summary">
              <article><b>{allRows.length}</b><span>Total registered users</span></article>
              <article><b>{allRows.filter((row) => row.primary_role === "veterinarian").length}</b><span>Veterinarians</span></article>
              <article><b>{((vets ?? []) as VetRow[]).filter((row) => row.verification_status === "approved").length}</b><span>Approved veterinarians</span></article>
              <article><b>{rows.length}</b><span>Current filtered results</span></article>
            </div>

            <div className="management-links">
              <Link className="button button-primary" href={exportHref}>Download CSV / Excel-compatible list</Link>
              <Link className="button button-secondary" href="/admin/users">Clear filters</Link>
            </div>

            <form className="admin-directory-filters" method="get">
              <div><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Name, email, PVMC, location or specialization" /></div>
              <div><label htmlFor="role">Role</label><select id="role" name="role" defaultValue={params.role ?? "all"}><option value="all">All roles</option>{primaryRoles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></div>
              <div><label htmlFor="province">Province</label><select id="province" name="province" defaultValue={params.province ?? "all"}><option value="all">All provinces</option>{provinces.map((province) => <option key={province}>{province}</option>)}</select></div>
              <div><label htmlFor="district">District</label><select id="district" name="district" defaultValue={params.district ?? "all"}><option value="all">All districts</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></div>
              <div><label htmlFor="sector">Veterinary sector</label><select id="sector" name="sector" defaultValue={params.sector ?? "all"}><option value="all">All sectors</option>{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></div>
              <div><label htmlFor="verification">Verification</label><select id="verification" name="verification" defaultValue={params.verification ?? "all"}><option value="all">All verification</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></div>
              <button className="button button-primary" type="submit">Apply filters</button>
            </form>

            <div className="admin-directory-table-wrap">
              <table className="admin-directory-table">
                <thead>
                  <tr>
                    <th>Name / Email</th>
                    <th>Role</th>
                    <th>Province</th>
                    <th>District</th>
                    <th>Tehsil / City</th>
                    <th>PVMC</th>
                    <th>Sector / Specialization</th>
                    <th>Verification</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => {
                    const vet = vetMap.get(user.id);
                    return (
                      <tr key={user.id}>
                        <td><Link href={`/admin/users/${user.id}`}><b>{user.full_name || "Unnamed account"}</b></Link><small>{user.email}</small></td>
                        <td>{user.primary_role.replaceAll("_", " ")}</td>
                        <td>{user.province || "—"}</td>
                        <td>{user.district || "—"}</td>
                        <td>{user.tehsil || user.city || "—"}</td>
                        <td>{vet?.pvmc_number || "—"}</td>
                        <td>{vet ? <><b>{vet.veterinary_sector || "—"}</b><small>{vet.specialization || ""}</small></> : "—"}</td>
                        <td>{vet?.verification_status || "—"}</td>
                        <td>{user.account_status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="section-heading admin-role-heading" id="staff-roles">
              <span className="section-kicker">ADMINISTRATOR HIERARCHY</span>
              <h2>Staff roles and account control.</h2>
              <p>Super Administrators can assign controlled staff roles without changing the user-owned professional record.</p>
            </div>

            <div className="role-hierarchy-grid">
              {staffRoleOptions.map((role) => (
                <article key={role.value}>
                  <b>Level {role.level}</b>
                  <h3>{role.label}</h3>
                  <p>{role.summary}</p>
                </article>
              ))}
            </div>

            <div className="admin-data-list user-admin-list">
              {rows.map((user) => {
                const assignedRoles = roleMap.get(user.id) ?? [];
                return (
                  <article key={user.id}>
                    <div className="admin-data-main">
                      <div className="admin-data-title"><span className="module-tag">{user.primary_role.replaceAll("_", " ")}</span><h2>{user.full_name || "Unnamed account"}</h2></div>
                      <p>{user.email} · {user.tehsil || user.city || "Location not provided"}</p>
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
                      <form className="staff-permission-form" action={updateUserPermissionsAction}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <fieldset>
                          <legend>Individual permission overrides</legend>
                          <div className="permission-override-grid">
                            {permissionOptions.map((permission) => {
                              const current = permissionMap.get(user.id) ?? { granted: [], revoked: [] };
                              return (
                                <div className="permission-override-row" key={permission.value}>
                                  <span><b>{permission.label}</b><small>{permission.summary}</small></span>
                                  <label><input type="checkbox" name="granted_permissions" value={permission.value} defaultChecked={current.granted.includes(permission.value)} /> Grant</label>
                                  <label><input type="checkbox" name="revoked_permissions" value={permission.value} defaultChecked={current.revoked.includes(permission.value)} /> Revoke</label>
                                </div>
                              );
                            })}
                          </div>
                        </fieldset>
                        <FormSubmitButton className="button button-secondary" pendingLabel="Saving permissions...">Save permissions</FormSubmitButton>
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
