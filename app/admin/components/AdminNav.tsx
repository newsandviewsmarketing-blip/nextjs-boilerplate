import Link from "next/link";
import type { AccountRole } from "@/lib/auth";
import { hasAdminPermissionForRoles, staffRoleLabel, type AdminPermission } from "@/lib/admin";

export default function AdminNav({ roles }: { roles: AccountRole[] }) {
  const reviewPermissions: AdminPermission[] = ["profiles.review", "regulatory.review", "products.manage", "jobs.manage"];
  const canReview = reviewPermissions.some((permission) => hasAdminPermissionForRoles(roles, permission));
  const canAssist = roles.some((role) => ["super_admin", "verification_officer", "content_admin", "career_admin"].includes(role));
  const canDirectory = roles.some((role) => ["super_admin", "verification_officer", "content_admin"].includes(role));

  return (
    <aside className="admin-navigation" aria-label="Administrator navigation">
      <div className="admin-navigation-heading"><span>ADMIN CONTROL</span><strong>{roles.map(staffRoleLabel).join(" · ")}</strong></div>
      <nav>
        <Link href="/admin">Overview</Link>
        {canAssist && <Link href="/admin/create">Assisted entry</Link>}
        {canDirectory && <Link href="/admin/directory">Master directory</Link>}
        {roles.includes("super_admin") && <Link href="/admin/data">Data Studio</Link>}
        {canReview && <Link href="/admin/reviews">Review queues</Link>}
        {hasAdminPermissionForRoles(roles, "review.analytics") && <Link href="/admin/review-history">Review history</Link>}
        {hasAdminPermissionForRoles(roles, "products.manage") && <Link href="/admin/products">Products</Link>}
        {hasAdminPermissionForRoles(roles, "users.manage") && <Link href="/admin/users">Users & roles</Link>}
        {hasAdminPermissionForRoles(roles, "audit.view") && <Link href="/admin/audit">Audit log</Link>}
        <Link href="/dashboard">My account</Link>
      </nav>
    </aside>
  );
}
