import Link from "next/link";
import "@/app/components/CareerWorkspaceFrame.css";
import { getCurrentIdentity, type AccountRole } from "@/lib/auth";
import { getEffectiveAdminPermissions, staffRoleLabel, type AdminPermission } from "@/lib/admin";

type Entry = {name:string;href:string;permission:AdminPermission};
export default async function AdminNav({roles}:{roles:AccountRole[]}) {
  const identity=await getCurrentIdentity();
  const grants=identity ? await getEffectiveAdminPermissions(identity) : new Set<AdminPermission>();
  const allowed=(p:AdminPermission)=>grants.has(p);
  const assist=(["profiles.create","companies.create","clinics.manage","laboratories.manage","products.create","jobs.create"] as const).some(allowed);
  const groups:{title:string;items:Entry[]}[]=[
    {title:"Dashboard",items:[
      {name:"Overview & latest updates",href:"/admin",permission:"admin.view"},
    ]},
    {title:"Approvals",items:[
      {name:"Profile and organization reviews",href:"/admin/reviews",permission:"profiles.review"},
      {name:"PVMC credential reviews",href:"/admin/reviews#credential-checks",permission:"regulatory.review"},
      {name:"PVMC data rechecks",href:"/admin/credential-recheck",permission:"regulatory.review"},
      {name:"Product submissions",href:"/admin/reviews#pending-products",permission:"products.manage"},
      {name:"Job submissions",href:"/admin/reviews#jobs-review",permission:"jobs.manage"},
      {name:"Clinic affiliations",href:"/admin/clinic-affiliations",permission:"users.manage"},
      {name:"Master-data suggestions",href:"/admin/data#suggestions-to-review",permission:"master_data.manage"},
    ]},
    {title:"People & organizations",items:[
      {name:"Veterinarians",href:"/admin/users?role=veterinarian",permission:"users.manage"},
      {name:"Professionals",href:"/admin/users?role=professional",permission:"users.manage"},
      {name:"Customers",href:"/admin/users?role=user",permission:"users.manage"},
      {name:"All accounts",href:"/admin/users",permission:"users.manage"},
      {name:"Companies",href:"/admin/directory?kind=company",permission:"directories.manage"},
      {name:"Clinics & hospitals",href:"/admin/directory?kind=clinic",permission:"directories.manage"},
      {name:"Laboratories",href:"/admin/directory?kind=laboratory",permission:"directories.manage"},
      {name:"Assisted records",href:"/admin/directory?kind=managed_person",permission:"directories.manage"},
    ]},
    {title:"Marketplace & HR",items:[
      {name:"Products and medicines",href:"/admin/products",permission:"products.manage"},
      {name:"Jobs",href:"/admin/jobs",permission:"jobs.manage"},
      {name:"Applications",href:"/admin/applications",permission:"jobs.manage"},
      {name:"Job images",href:"/admin/jobs-media",permission:"jobs.manage"},
    ]},
    {title:"Governance & data",items:[
      {name:"Website pages",href:"/admin/website",permission:"site_content.edit"},
      {name:"Master directory",href:"/admin/directory",permission:"directories.manage"},
      {name:"Standardized data",href:"/admin/data",permission:"master_data.manage"},
      {name:"Roles and permissions",href:"/admin/users",permission:"users.manage"},
      {name:"Audit log",href:"/admin/audit",permission:"audit.view"},
      {name:"Reports / CSV",href:"/admin/reports",permission:"audit.view"},
    ]},
  ];
  const visibleGroups=groups.map(group=>({
    ...group,items:group.items.filter(item=>allowed(item.permission)||(item.href==="/admin/website"&&allowed("site.manage")))
  })).filter(group=>group.items.length>0);
  return <aside className="admin-navigation vc-sidebar" aria-label="Administrator navigation">
    <div className="admin-navigation-heading vc-sidebar-brand"><span>VETCONNECT ADMIN</span><strong>{roles.map(staffRoleLabel).join(" · ") || "Administrator"}</strong></div>
    <details className="vc-sidebar-fold" open>
      <summary>Management menu</summary>
      <nav aria-label="Admin modules">
        {visibleGroups.map(group=><details className="vc-nav-section vc-admin-section" key={group.title} open={group.title==="Dashboard"||group.title==="Approvals"}>
          <summary className="vc-nav-label">{group.title}</summary>
          {group.items.map(item=><Link href={item.href} key={item.name}>{item.name}</Link>)}
        </details>)}
        {assist && <div className="vc-nav-section"><Link href="/admin/create">Create a record</Link></div>}
        <div className="vc-nav-section"><Link href="/dashboard">My workspace</Link></div>
      </nav>
    </details>
  </aside>;
}
