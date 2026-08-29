import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import AdminNav from "../../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminUserDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await requireAdminPermission("directories.manage", `/admin/users/${id}`);
  const supabase = await createClient();
  const [profile,vet,professional,roles,credentials,companies] = await Promise.all([
    supabase.from("profiles").select("*").eq("id",id).maybeSingle(),
    supabase.from("veterinarian_profiles").select("*").eq("user_id",id).maybeSingle(),
    supabase.from("professional_profiles").select("*").eq("user_id",id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id",id),
    supabase.from("professional_credentials").select("id,credential_type,issuing_authority,verification_status").eq("professional_user_id",id),
    supabase.from("company_members").select("company_id,member_role,membership_status,verification_status").eq("user_id",id),
  ]);
  if (!profile.data) notFound();
  const p = profile.data;
  const v = vet.data;
  const pr = professional.data;
  const publicVet = p.account_status === "active" && v?.verification_status === "approved" && v?.pvmc_verification_status === "approved";
  const publicProfessional = p.account_status === "active" && pr?.verification_status === "approved" && pr?.profile_visibility === "public";

  return <main><SiteHeader/><section className="dashboard-hero"><div className="shell"><span className="section-kicker">ACCOUNT DOSSIER</span><h1>{p.full_name || p.email}</h1><p>{p.email} · {p.primary_role}</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout"><AdminNav roles={identity.roles}/><div className="admin-control-content">
      <div className="admin-summary"><article><b>{p.account_status}</b><span>Account</span></article><article><b>{v?.verification_status||"Not created"}</b><span>Veterinarian profile</span></article><article><b>{v?.pvmc_verification_status||"Not applicable"}</b><span>PVMC credential</span></article><article><b>{pr?.verification_status||"Not created"}</b><span>Professional profile</span></article></div>
      <div className="section-heading"><span className="section-kicker">PUBLIC VISIBILITY DIAGNOSIS</span><h2>Why this person is or is not visible.</h2></div>
      <div className="admin-data-list"><article><div className="admin-data-main"><h2>Veterinarian directory</h2><p>{publicVet ? "Eligible and visible when the public view contains this account." : `Blocked: ${p.account_status!=="active"?"account is not active":v?.verification_status!=="approved"?"veterinarian profile is not approved":v?.pvmc_verification_status!=="approved"?"PVMC credential is not approved":"veterinarian profile does not exist"}.`}</p></div>{publicVet&&<Link className="button button-secondary" href={`/vets/${id}`} target="_blank">Open public vet profile</Link>}</article>
      <article><div className="admin-data-main"><h2>Professional directory</h2><p>{publicProfessional ? "Eligible and visible as a public professional." : `Blocked: ${p.account_status!=="active"?"account is not active":pr?.verification_status!=="approved"?"professional profile is not approved":pr?.profile_visibility!=="public"?"profile visibility is not public":"professional profile does not exist"}.`}</p></div>{publicProfessional&&<Link className="button button-secondary" href={`/professionals/${pr.slug}`} target="_blank">Open public professional profile</Link>}</article></div>
      <div className="section-heading"><span className="section-kicker">IDENTITY & WORKFLOW</span><h2>Linked account modules.</h2></div>
      <div className="spec-list"><div><b>Roles</b><span>{(roles.data??[]).map(r=>r.role).join(", ")||"None"}</span></div><div><b>Location</b><span>{[p.tehsil||p.city,p.district,p.province].filter(Boolean).join(", ")||"Not provided"}</span></div><div><b>Veterinary sector</b><span>{v?.veterinary_sector||"Not provided"}</span></div><div><b>Specialization</b><span>{v?.specialization||"Not provided"}</span></div><div><b>Professional headline</b><span>{pr?.headline||"Not provided"}</span></div><div><b>Credentials</b><span>{credentials.data?.length||0} record(s)</span></div><div><b>Company memberships</b><span>{companies.data?.length||0} record(s)</span></div></div>
      <div className="management-links"><Link className="button button-secondary" href="/admin/users">Back to users</Link><Link className="button button-secondary" href="/admin/reviews">Review queues</Link></div>
    </div></div></section><SiteFooter/></main>;
}
