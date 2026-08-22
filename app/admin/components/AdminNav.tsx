import Link from "next/link";
import type { AccountRole } from "@/lib/auth";
import {
  hasAdminPermissionForRoles,
  staffRoleLabel,
  type AdminPermission,
} from "@/lib/admin";

export default function AdminNav({ roles }: { roles: AccountRole[] }) {
  const reviewPermissions: AdminPermission[] = [
    "profiles.review",
    "regulatory.review",
    "products.manage",
    "jobs.manage",
  ];
  const canReview = reviewPermissions.some((permission) =>
    hasAdminPermissionForRoles(roles, permission),
  );

  return (
    <aside className="admin-navigation" aria-label="Administrator navigation">
      <div className="admin-navigation-heading">
        <span>ADMIN CONTROL</span>
        <strong>{roles.map(staffRoleLabel).join(" · ")}</strong>
      </div>
      <nav>
        <Link href="/admin">Overview</Link>
        {canReview && <Link href="/admin/reviews">Review queues</Link>}
        {hasAdminPermissionForRoles(roles, "products.manage") && (
          <Link href="/admin/products">Products</Link>
        )}
        {hasAdminPermissionForRoles(roles, "users.manage") && (
          <Link href="/admin/users">Users & roles</Link>
        )}
        {hasAdminPermissionForRoles(roles, "audit.view") && (
          <Link href="/admin/audit">Audit log</Link>
        )}
        <Link href="/dashboard">My account</Link>
      </nav>
    </aside>
  );
}
