import Link from "next/link";
import { getCurrentIdentity, type AccountRole } from "@/lib/auth";
import { getEffectiveAdminPermissions, staffRoleLabel, type AdminPermission } from "@/lib/admin";

export default async function AdminNav({ roles }: { roles: AccountRole[] }) {
  const identity = await getCurrentIdentity();
  const permissions = identity ? await getEffectiveAdminPermissions(identity) : new Set<AdminPermission>();
  const can = (permission: AdminPermission) => permissions.has(permission);
  const canReview = (["profiles.review", "regulatory.review", "products.manage", "jobs.manage"] as const).some(can);
  const canAssist = (["profiles.create", "companies.create", "clinics.manage", "laboratories.manage", "products.create", "jobs.create"] as const).some(can);

  return (
    <aside className="admin-navigation" aria-label="Administrator navigation">
      <div className="admin-navigation-heading"><span>ADMIN CONTROL</span><strong>{roles.map(staffRoleLabel).join(" · ")}</strong></div>
      <nav>
        {can("admin.view") && <Link href="/admin">Overview</Link>}
        {canAssist && <Link href="/admin/create">Assisted entry</Link>}
        {can("directories.manage") && <Link href="/admin/directory">Master directory</Link>}
        {can("master_data.manage") && <Link href="/admin/data">Data Studio</Link>}
        {canReview && <Link href="/admin/reviews">Review queues</Link>}
        {can("jobs.manage") && <Link href="/admin/jobs-media">Job advertisement images</Link>}
        {can("review.analytics") && <Link href="/admin/review-history">Review history</Link>}
        {can("products.manage") && <Link href="/admin/products">Products</Link>}
        {can("users.manage") && <Link href="/admin/users">Users & roles</Link>}
        {can("audit.view") && <Link href="/admin/audit">Audit log</Link>}
        <Link href="/dashboard">My account</Link>
      </nav>
    </aside>
  );
}
