import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ProfilePhoto from "../../components/ProfilePhoto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  initials,
  sampleVeterinarians,
  type PublicVeterinarian,
} from "@/lib/directories";

export const dynamic = "force-dynamic";

async function loadVeterinarian(id: string): Promise<PublicVeterinarian | null> {
  const sample = sampleVeterinarians.find((item) => item.user_id === id);
  if (!isSupabaseConfigured()) return sample ?? null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_veterinarians")
    .select(
      "user_id, full_name, qualifications, specialization, years_experience, city, services, profile_verified, pvmc_verified, image_url",
    )
    .eq("user_id", id)
    .maybeSingle();
  return (data as PublicVeterinarian | null) ?? sample ?? null;
}

export default async function VeterinarianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const veterinarian = await loadVeterinarian(id);
  if (!veterinarian) notFound();

  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="shell company-profile-hero">
          <div className="company-mark company-profile-logo profile-photo-frame">
            <ProfilePhoto
              imageUrl={veterinarian.image_url}
              name={veterinarian.full_name}
              fallback={initials(veterinarian.full_name)}
            />
          </div>
          <div>
            <span className="section-kicker">{veterinarian.is_sample ? "SAMPLE PROFILE" : "VERIFIED VETERINARIAN"}</span>
            <h1>{veterinarian.full_name}</h1>
            <p>{veterinarian.specialization || "Veterinary professional"}</p>
            <div className="profile-chips">
              {veterinarian.qualifications && <span>{veterinarian.qualifications}</span>}
              <span>{veterinarian.city || "Pakistan"}</span>
              <span>{veterinarian.years_experience} years experience</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section compact-section">
        <div className="shell">
          <div className="feature-columns">
            <div>
              <h3>Verification</h3>
              <p><strong>PVMC credential:</strong> {veterinarian.pvmc_verified ? "Verified" : veterinarian.is_sample ? "Sample only" : "Pending"}</p>
              <p><strong>VetConnect profile:</strong> {veterinarian.profile_verified ? "Verified" : veterinarian.is_sample ? "Sample only" : "Pending"}</p>
              <p>Private registration numbers and supporting documents are not shown on public profiles.</p>
            </div>
            <div>
              <h3>Professional information</h3>
              <p><strong>Qualification:</strong> {veterinarian.qualifications || "Not specified"}</p>
              <p><strong>Specialization:</strong> {veterinarian.specialization || "Not specified"}</p>
              <p><strong>Experience:</strong> {veterinarian.years_experience} years</p>
            </div>
            <div>
              <h3>Location</h3>
              <p><strong>City:</strong> {veterinarian.city || "Not specified"}</p>
              <p>Clinic, farm-visit and service-area details remain controlled by the profile owner.</p>
            </div>
            <div>
              <h3>Services</h3>
              {veterinarian.services.length ? (
                <div className="profile-chips">{veterinarian.services.map((service) => <span key={service}>{service}</span>)}</div>
              ) : <p>Services have not been listed.</p>}
            </div>
          </div>
          <div className="card-actions">
            <Link className="button button-primary" href="/coming-soon?feature=Appointment%20booking">Request appointment</Link>
            <Link className="button button-secondary" href="/vets">Back to directory</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
