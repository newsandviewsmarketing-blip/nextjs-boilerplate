import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../../components/SiteHeader";
import SiteFooter from "../../../../components/SiteFooter";
import AdminNav from "../../../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const tableFor: Record<string,{table:string;name:string}> = {
  managed_person:{table:"managed_people",name:"full_name"},
  company:{table:"companies",name:"canonical_name"},
  clinic:{table:"clinics",name:"clinic_name"},
  laboratory:{table:"laboratories",name:"laboratory_name"},
  job:{table:"jobs",name:"title"},
};

export default async function AdminDirectoryDossier({ params }: { params: Promise<{ kind:string; id:string }> }) {
  const { kind,id } = await params;
  const identity = await requireAdminPermission("directories.manage", `/admin/directory/${kind}/${id}`);
  const config = tableFor[kind]; if (!config) notFound();
  const supabase = await createClient();
  const { data,error } = await supabase.from(config.table).select("*").eq("id",id).maybeSingle();
  if (error || !data) notFound();
  const name = String(data[config.name] ?? "Directory record");
  const hidden = new Set(["pvmc_number","private_notes","evidence_path"]);
  const entries = Object.entries(data).filter(([key])=>!hidden.has(key));
  const publicHref = kind==="company"&&data.is_published?`/companies/${id}`:kind==="clinic"&&data.is_published?`/clinics/${data.slug}`:kind==="laboratory"&&data.is_published?`/labs/${data.slug}`:kind==="job"&&data.is_published?`/jobs/${data.slug}`:kind==="managed_person"&&data.is_published?(data.profile_kind==="veterinarian"?`/vets/${id}`:`/professionals/${data.slug}`):null;
  return <main><SiteHeader/><section className="dashboard-hero"><div className="shell"><span className="section-kicker">DIRECTORY DOSSIER</span><h1>{name}</h1><p>{kind.replaceAll("_"," ")} · {data.verification_status||data.record_status||"record"}</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout"><AdminNav roles={identity.roles}/><div className="admin-control-content">
      <div className="management-links"><Link className="button button-secondary" href="/admin/directory">Back to master directory</Link>{publicHref&&<Link className="button button-primary" href={publicHref} target="_blank">Open public page</Link>}</div>
      <div className="admin-directory-table-wrap"><table className="admin-directory-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>{entries.map(([key,value])=><tr key={key}><td>{key.replaceAll("_"," ")}</td><td>{Array.isArray(value)?value.join(", "):typeof value==="object"&&value?JSON.stringify(value):String(value??"—")}</td></tr>)}</tbody></table></div>
    </div></div></section><SiteFooter/></main>;
}
