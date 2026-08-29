import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AdminNav from "../components/AdminNav";
import FormMessage from "../../components/FormMessage";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Params = { q?: string; kind?: string; status?: string; error?: string; message?: string };
type Row = { key:string; kind:string; name:string; subtitle:string; location:string; status:string; publicStatus:string; href:string; publicHref?:string };

export default async function AdminDirectoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const identity = await requireAdminPermission("directories.manage", "/admin/directory");
  const supabase = await createClient();
  const [profiles,vets,professionals,managed,companies,clinics,labs,jobs,products] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,primary_role,account_status,province,district,tehsil,city").limit(1500),
    supabase.from("veterinarian_profiles").select("user_id,verification_status,pvmc_verification_status,veterinary_sector,specialization"),
    supabase.from("professional_profiles").select("user_id,slug,professional_type,headline,verification_status,profile_visibility"),
    supabase.from("managed_people").select("id,full_name,profile_kind,contact_email,verification_status,pvmc_verification_status,is_published,province,district,tehsil,city,slug"),
    supabase.from("companies").select("id,canonical_name,business_type,verification_status,is_published,province,district,tehsil,city,slug"),
    supabase.from("clinics").select("id,clinic_name,facility_type,verification_status,is_published,province,district,tehsil,city,slug"),
    supabase.from("laboratories").select("id,laboratory_name,laboratory_type,verification_status,is_published,province,district,tehsil,city,slug"),
    supabase.from("jobs").select("id,title,sector,verification_status,is_published,province,district,tehsil,city,slug").order("created_at",{ascending:false}).limit(1000),
    supabase.from("products").select("id,product_name,category,verification_status,is_published,slug").order("created_at",{ascending:false}).limit(1000),
  ]);
  const vetMap = new Map((vets.data ?? []).map((r) => [r.user_id,r]));
  const profMap = new Map((professionals.data ?? []).map((r) => [r.user_id,r]));
  const loc = (r: {province?:string|null;district?:string|null;tehsil?:string|null;city?:string|null}) => [r.tehsil||r.city,r.district,r.province].filter(Boolean).join(", ") || "—";
  const rows: Row[] = [];
  for (const p of profiles.data ?? []) {
    const v = vetMap.get(p.id); const pr = profMap.get(p.id);
    const status = v?.verification_status || pr?.verification_status || p.account_status;
    rows.push({ key:`user-${p.id}`,kind:"account",name:p.full_name||p.email,subtitle:`${p.email} · ${p.primary_role}${v?.veterinary_sector?` · ${v.veterinary_sector}`:""}`,location:loc(p),status:String(status||"—"),publicStatus:v?`${v.verification_status}/${v.pvmc_verification_status}`:pr?String(pr.profile_visibility):"Account",href:`/admin/users/${p.id}`,publicHref:v?.verification_status==="approved"&&v?.pvmc_verification_status==="approved"?`/vets/${p.id}`:pr?.verification_status==="approved"?`/professionals/${pr.slug}`:undefined });
  }
  for (const r of managed.data ?? []) rows.push({ key:`managed-${r.id}`,kind:"managed_person",name:r.full_name,subtitle:`Staff-assisted ${r.profile_kind} · ${r.contact_email||"no client login"}`,location:loc(r),status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/directory/managed_person/${r.id}`,publicHref:r.is_published?(r.profile_kind==="veterinarian"?`/vets/${r.id}`:`/professionals/${r.slug}`):undefined });
  for (const r of companies.data ?? []) rows.push({ key:`company-${r.id}`,kind:"company",name:r.canonical_name,subtitle:r.business_type||"Company",location:loc(r),status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/directory/company/${r.id}`,publicHref:r.is_published?`/companies/${r.id}`:undefined });
  for (const r of clinics.data ?? []) rows.push({ key:`clinic-${r.id}`,kind:"clinic",name:r.clinic_name,subtitle:r.facility_type,location:loc(r),status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/directory/clinic/${r.id}`,publicHref:r.is_published?`/clinics/${r.slug}`:undefined });
  for (const r of labs.data ?? []) rows.push({ key:`lab-${r.id}`,kind:"laboratory",name:r.laboratory_name,subtitle:r.laboratory_type,location:loc(r),status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/directory/laboratory/${r.id}`,publicHref:r.is_published?`/labs/${r.slug}`:undefined });
  for (const r of jobs.data ?? []) rows.push({ key:`job-${r.id}`,kind:"job",name:r.title,subtitle:r.sector||"Job",location:loc(r),status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/directory/job/${r.id}`,publicHref:r.is_published?`/jobs/${r.slug}`:undefined });
  for (const r of products.data ?? []) rows.push({ key:`product-${r.id}`,kind:"product",name:r.product_name,subtitle:r.category||"Product",location:"—",status:r.verification_status,publicStatus:r.is_published?"Published":"Not published",href:`/admin/products/${r.id}`,publicHref:r.is_published?`/marketplace/${r.slug}`:undefined });

  const q = (params.q??"").toLowerCase().trim();
  const filtered = rows.filter((r) => (!q || `${r.name} ${r.subtitle} ${r.location}`.toLowerCase().includes(q)) && (!params.kind||params.kind==="all"||r.kind===params.kind) && (!params.status||params.status==="all"||r.status===params.status));
  const kinds = [...new Set(rows.map((r)=>r.kind))].sort();

  return <main><SiteHeader/><section className="dashboard-hero"><div className="shell"><span className="section-kicker">MASTER OPERATIONAL DIRECTORY</span><h1>People, companies, facilities, jobs and products in one table.</h1><p>Every row is linked to its administrative dossier and, when published, to the public profile.</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout"><AdminNav roles={identity.roles}/><div className="admin-control-content"><FormMessage error={params.error} message={params.message}/>
      <div className="admin-summary"><article><b>{rows.length}</b><span>All records</span></article><article><b>{rows.filter(r=>r.kind==="account"||r.kind==="managed_person").length}</b><span>People/accounts</span></article><article><b>{rows.filter(r=>["company","clinic","laboratory"].includes(r.kind)).length}</b><span>Organizations/facilities</span></article><article><b>{filtered.length}</b><span>Filtered results</span></article></div>
      <form className="admin-directory-filters" method="get"><div><label>Search</label><input name="q" defaultValue={params.q??""} placeholder="Name, email, sector, city..."/></div><div><label>Record type</label><select name="kind" defaultValue={params.kind??"all"}><option value="all">All record types</option>{kinds.map(k=><option key={k} value={k}>{k.replaceAll("_"," ")}</option>)}</select></div><div><label>Status</label><select name="status" defaultValue={params.status??"all"}><option value="all">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="active">Active</option></select></div><button className="button button-primary" type="submit">Apply filters</button><Link className="button button-secondary" href="/admin/directory">Clear</Link></form>
      <div className="admin-directory-table-wrap"><table className="admin-directory-table"><thead><tr><th>Name / Record</th><th>Type</th><th>Location</th><th>Review status</th><th>Public status</th><th>Links</th></tr></thead><tbody>{filtered.map(r=><tr key={r.key}><td><Link href={r.href}><b>{r.name}</b></Link><small>{r.subtitle}</small></td><td>{r.kind.replaceAll("_"," ")}</td><td>{r.location}</td><td>{r.status}</td><td>{r.publicStatus}</td><td><Link href={r.href}>Admin dossier</Link>{r.publicHref&&<> · <Link href={r.publicHref} target="_blank">Public</Link></>}</td></tr>)}</tbody></table></div>
    </div></div></section><SiteFooter/></main>;
}
