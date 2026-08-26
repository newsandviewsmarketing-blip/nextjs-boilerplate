import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ProfilePhoto from "../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  initials,
  sampleVeterinarians,
  type PublicVeterinarian,
} from "@/lib/directories";

export const metadata: Metadata = {
  title: "Veterinarians in Pakistan",
  description: "Find VetConnect-listed veterinarians in Pakistan by city, specialization and veterinary service.",
  alternates: { canonical: "/vets" },
};

export const dynamic = "force-dynamic";

async function loadVeterinarians(): Promise<PublicVeterinarian[]> {
  if (!isSupabaseConfigured()) return sampleVeterinarians;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_veterinarians")
    .select(
      "user_id, full_name, qualifications, specialization, years_experience, city, services, profile_verified, pvmc_verified, image_url",
    )
    .order("full_name");

  if (error || !data?.length) return sampleVeterinarians;
  return data as PublicVeterinarian[];
}

export default async function VeterinarianDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; service?: string }>;
}) {
  const params = await searchParams;
  const veterinarians = await loadVeterinarians();
  const query = (params.q ?? "").trim().toLowerCase();
  const city = (params.city ?? "").trim().toLowerCase();
  const service = (params.service ?? "").trim().toLowerCase();
  const visible = veterinarians.filter((vet) => {
    const text = `${vet.full_name} ${vet.qualifications ?? ""} ${vet.specialization ?? ""} ${vet.city ?? ""} ${vet.services.join(" ")}`.toLowerCase();
    return (
      (!query || text.includes(query)) &&
      (!city || city === "all cities" || vet.city?.toLowerCase() === city) &&
      (!service || service === "all services" || vet.services.some((item) => item.toLowerCase().includes(service)))
    );
  });
  const cities = [...new Set(veterinarians.map((vet) => vet.city).filter(Boolean))] as string[];
  const services = [...new Set(veterinarians.flatMap((vet) => vet.services))];
  const showingSamples = veterinarians.some((vet) => vet.is_sample);

  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">VERIFIED VETERINARIAN DIRECTORY</span>
          <h1>Find the right veterinary professional.</h1>
          <p>
            Public directory access is reserved for veterinarians whose profile
            and veterinary credential have both completed the VetConnect review.
          </p>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <div className="directory-top">
            <div>
              <b>{visible.length} veterinarian profiles</b>
              <span>
                {showingSamples
                  ? "Sample profiles until credential-verified members are published"
                  : "PVMC credential and VetConnect profile review completed"}
              </span>
            </div>
            <form className="market-search" method="get">
              <input name="q" defaultValue={params.q ?? ""} placeholder="Name, qualification or expertise" />
              <select name="city" defaultValue={params.city ?? "All cities"}>
                <option>All cities</option>
                {cities.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select name="service" defaultValue={params.service ?? "All services"}>
                <option>All services</option>
                {services.map((item) => <option key={item}>{item}</option>)}
              </select>
              <button className="button button-primary" type="submit">Search</button>
            </form>
          </div>
          {visible.length === 0 ? (
            <div className="empty-state">
              <h2>No veterinarian matches these filters.</h2>
              <Link href="/vets">Clear search</Link>
            </div>
          ) : (
            <div className="company-grid">
              {visible.map((vet) => (
                <article key={vet.user_id}>
                  <div className="company-mark large profile-photo-frame">
                    <ProfilePhoto
                      imageUrl={vet.image_url}
                      name={vet.full_name}
                      fallback={initials(vet.full_name)}
                    />
                  </div>
                  {vet.is_sample && <span className="sample-label">Sample profile</span>}
                  <h3>{vet.full_name}</h3>
                  <p>{vet.specialization || "Veterinary professional"} • {vet.city || "Pakistan"}</p>
                  <div className="profile-chips">
                    {vet.qualifications && <span>{vet.qualifications}</span>}
                    <span>{vet.years_experience} years</span>
                  </div>
                  <dl>
                    <div><dt>PVMC credential</dt><dd>{vet.pvmc_verified ? "Verified" : vet.is_sample ? "Sample" : "Pending"}</dd></div>
                    <div><dt>VetConnect profile</dt><dd>{vet.profile_verified ? "Verified" : vet.is_sample ? "Sample" : "Pending"}</dd></div>
                    <div><dt>Services</dt><dd>{vet.services.slice(0, 2).join(", ") || "Not listed"}</dd></div>
                  </dl>
                  <Link className="button button-primary button-full" href={`/vets/${vet.user_id}`}>
                    View professional profile
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell two-col">
          <div>
            <span className="section-kicker">TRUST MODEL</span>
            <h2>Two checks, two clear badges.</h2>
            <p>PVMC credential verification and VetConnect profile verification are recorded separately. A professional is not labelled as a veterinarian in this directory until the veterinary credential check is complete.</p>
          </div>
          <div className="spec-list">
            <div><b>PVMC Verified</b><span>Professional credential matched with an official source or accepted evidence.</span></div>
            <div><b>VetConnect Verified Profile</b><span>Identity, public profile and contact information reviewed by VetConnect.</span></div>
            <div><b>Private by design</b><span>Registration numbers and verification documents are not displayed publicly.</span></div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
