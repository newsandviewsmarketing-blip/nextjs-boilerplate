import Link from "next/link";
import { getCurrentIdentity, type AccountRole } from "@/lib/auth";
import { getEffectiveAdminPermissions, staffRoleLabel, type AdminPermission } from "@/lib/admin";

type Entry = {name:string;href:string;permission:AdminPermission};
export default async function AdminNav({roles}:{roles:AccountRole[]}) {
  const identity=await getCurrentIdentity();
  const grants=identity ? await getEffectiveAdminPermissions(identity) : new Set<AdminPermission>();
  const allowed=(p:AdminPermission)=>grants.has(p);
  const review=(["profiles.review","regulatory.review","products.manage","jobs.manage"] as const).some(allowed);
  const assist=(["profiles.create","companies.create","clinics.manage","laboratories.manage","products.create","jobs.create"] as const).some(allowed);
  const groups:{title:string;items:Entry[]}[]=[
    {title:"Overview",items:[{name:"Dashboard",href:"/admin",permission:"admin.view"},{name:"Review history",href:"/admin/review-history",permission:"review.analytics"}]},
    {title:"People & organizations",items:[
      {name:"Veterinarians",href:"/admin/users?role=veterinarian",permission:"users.manage"},
      {name:"Professionals",href:"/admin/users?role=professional",permission:"users.manage"},
      {name:"Customers & newcomers",href:"/admin/users?role=user",permission:"users.manage"},
      {name:"User accounts",href:"/admin/users",permission:"users.manage"},
      {name:"Companies & firms",href:"/admin/directory?kind=company",permission:"directories.manage"},
      {name:"Clinics & hospitals",href:"/admin/directory?kind=clinic",permission:"directories.manage"},
      {name:"Laboratories",href:"/admin/directory?kind=laboratory",permission:"directories.manage"},
      {name:"Assisted entry",href:"/admin/directory?kind=managed_person",permission:"directories.manage"}]},
    {title:"Marketplace & HR",items:[
      {name:"Products & medicines",href:"/admin/products",permission:"products.manage"},
      {name:"Jobs",href:"/admin/directory?kind=job",permission:"directories.manage"},
      {name:"Job images",href:"/admin/jobs-media",permission:"jobs.manage"}]},
    {title:"Administration",items:[
      {name:"Master directory",href:"/admin/directory",permission:"directories.manage"},
      {name:"Categories & data",href:"/admin/data",permission:"master_data.manage"},
      {name:"Roles & permissions",href:"/admin/users",permission:"users.manage"},
      {name:"Audit log",href:"/admin/audit",permission:"audit.view"},
      {name:"Printable reports",href:"/admin/reports",permission:"audit.view"}]}
  ];
  return <aside className="admin-navigation vc-sidebar" aria-label="Administrator navigation">
    <div className="admin-navigation-heading vc-sidebar-brand"><span>VETCONNECT ADMIN</span><strong>{roles.map(staffRoleLabel).join(" · ") || "Administrator"}</strong></div>
    <details className="vc-sidebar-fold" open>
      <summary>Management menu</summary>
      <nav aria-label="Admin modules">
        {groups.map(group=><div className="vc-nav-section" key={group.title}>
          <span className="vc-nav-label">{group.title}</span>
          {group.title==="Overview" && review && <Link href="/admin/reviews">Approvals & review queue</Link>}
          {group.items.filter(item=>allowed(item.permission)).map(item=><Link href={item.href} key={item.name}>{item.name}</Link>)}
          {group.title==="Marketplace & HR" && allowed("jobs.manage") && <Link href="/admin/reviews#jobs-review">Job approvals</Link>}
        </div>)}
        {assist && <div className="vc-nav-section"><span className="vc-nav-label">Quick actions</span><Link href="/admin/create">Add new record</Link></div>}
        <div className="vc-nav-section"><Link href="/dashboard">My workspace</Link></div>
      </nav>
    </details>
  </aside>;
}
