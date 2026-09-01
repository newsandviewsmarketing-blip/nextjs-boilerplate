import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ProfilePhoto from "../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { initials, sampleVeterinarians, type PublicVeterinarian } from "@/lib/directories";

export const metadata: Metadata = { title: "Veterinarians in Pakistan", description: "Find VetConnect-listed veterinarians in Pakistan by city, specialization, sector and veterinary service.", alternates: { canonical: "/vets" } };
export const dynamic = "force-dynamic";

async function loadVeterinarians(): Promise<PublicVeterinarian[]> {
  if (!isSupabaseConfigured()) return sampleVeterinarians;
  const supabase = await createClient();
  const select = "user_id, full_name, qualifications, specialization, veterinary_sector, years_experience, city, province, district, tehsil, services, profile_verified, pvmc_verified, image_url, public_phone, contact_email, address, google_maps_url";
  const [account,managed] = await Promise.all([
    supabase.from("public_veterinarians").select(select).order("full_name"),
    supabase.from("public_managed_veterinarians").select(select).order("full_name"),
  ]);
  return [...(account.data ?? []), ...(managed.data ?? [])] as PublicVeterinarian[];
}

export default async function VeterinarianDirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; service?: string; sector?: string }> }) {
  const params = await searchParams;
  const veterinarians = await loadVeterinarians();
  const query=(params.q??"").trim().toLowerCase(), city=(params.city??"").trim().toLowerCase(), service=(params.service??"").trim().toLowerCase(), sector=(params.sector??"").trim().toLowerCase();
  const visible=veterinarians.filter(v=>{ const text=`${v.full_name} ${v.qualifications??""} ${v.specialization??""} ${v.veterinary_sector??""} ${v.city??""} ${v.services.join(" ")}`.toLowerCase(); return (!query||text.includes(query))&&(!city||city==="all cities"||v.city?.toLowerCase()===city)&&(!service||service==="all services"||v.services.some(x=>x.toLowerCase().includes(service)))&&(!sector||sector==="all sectors"||v.veterinary_sector?.toLowerCase()===sector); });
  const cities=[...new Set(veterinarians.map(v=>v.city).filter(Boolean))] as string[];
  const services=[...new Set(veterinarians.flatMap(v=>v.services))];
 const sectors = [
  "Pets",
  "Livestock",
  "Poultry",
  "Dairy",
  "Fisheries",
  "Equine",
];
  const showingSamples=veterinarians.some(v=>v.is_sample);
  return <main><SiteHeader/><section className="page-hero"><div className="shell"><span className="section-kicker">VERIFIED VETERINARIAN DIRECTORY</span><h1>Find the right veterinary professional.</h1><p>Public veterinarian listings require both VetConnect profile approval and PVMC credential review.</p></div></section>
    <section className="section compact-section"><div className="shell"><div className="directory-top"><div><b>{visible.length} veterinarian profiles</b><span>{showingSamples?"Demo mode because the backend is not configured":"Live verified directory"}</span></div><form className="market-search" method="get"><input name="q" defaultValue={params.q??""} placeholder="Name, qualification or expertise"/><select name="sector" defaultValue={params.sector??"All sectors"}><option>All sectors</option>{sectors.map(x=><option key={x}>{x}</option>)}</select><select name="city" defaultValue={params.city??"All cities"}><option>All cities</option>{cities.map(x=><option key={x}>{x}</option>)}</select><select name="service" defaultValue={params.service??"All services"}><option>All services</option>{services.map(x=><option key={x}>{x}</option>)}</select><button className="button button-primary" type="submit">Search</button></form></div>
    {visible.length===0?<div className="empty-state"><h2>No verified veterinarian matches these filters.</h2><p>Profiles remain hidden until both review checks are complete.</p><Link href="/vets">Clear search</Link></div>:<div className="company-grid">{visible.map(v=><article key={v.user_id}><div className="company-mark large profile-photo-frame"><ProfilePhoto imageUrl={v.image_url} name={v.full_name} fallback={initials(v.full_name)}/></div>{v.is_sample&&<span className="sample-label">Sample profile</span>}<h3>{v.full_name}</h3><p>{v.specialization||"Veterinary professional"} • {v.city||"Pakistan"}</p><div className="profile-chips">{v.qualifications&&<span>{v.qualifications}</span>}{v.veterinary_sector&&<span>{v.veterinary_sector}</span>}<span>{v.years_experience} years</span></div><dl><div><dt>PVMC credential</dt><dd>{v.pvmc_verified?"Verified":v.is_sample?"Sample":"Pending"}</dd></div><div><dt>VetConnect profile</dt><dd>{v.profile_verified?"Verified":v.is_sample?"Sample":"Pending"}</dd></div><div><dt>Services</dt><dd>{v.services.slice(0,2).join(", ")||"Not listed"}</dd></div></dl><Link className="button button-primary button-full" href={`/vets/${v.user_id}`}>View professional profile</Link></article>)}</div>}</div></section>
    <section className="section section-soft"><div className="shell two-col"><div><span className="section-kicker">TRUST MODEL</span><h2>Two checks, two clear badges.</h2><p>PVMC verification and VetConnect profile verification remain separate. Registration numbers and evidence stay private.</p></div><div className="spec-list"><div><b>PVMC Verified</b><span>Credential matched with an accepted source/evidence.</span></div><div><b>VetConnect Verified Profile</b><span>Identity and public profile reviewed.</span></div><div><b>Database-driven filters</b><span>Sector, specialization, services and locations can be extended from Admin Data Studio.</span></div></div></div></section><SiteFooter/></main>;
}
