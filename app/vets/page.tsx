import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeServices(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export default async function VeterinarianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: vet, error: vetError } = await supabase
    .from("veterinarian_profiles")
    .select(
      `
        user_id,
        pvmc_number,
        qualifications,
        specialization,
        years_experience,
        city,
        services,
        verification_status
      `,
    )
    .eq("user_id", id)
    .eq("verification_status", "approved")
    .maybeSingle();

  if (vetError || !vet) {
    notFound();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, city, account_status")
    .eq("id", id)
    .eq("account_status", "active")
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const fullName =
    profile.full_name?.trim() || "Veterinary Professional";

  const city =
    vet.city?.trim() || profile.city?.trim() || "Not specified";

  const services = normalizeServices(vet.services).filter((service) => {
    const lower = service.toLowerCase();

    return (
      !lower.includes("full name:") &&
      !lower.includes("phone:") &&
      !lower.includes("pvmc")
    );
  });

  return (
    <main>
      <SiteHeader />

      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">
            VERIFIED VETERINARIAN
          </span>

          <h1>{fullName}</h1>

          <p>
            {vet.specialization?.trim() ||
              "Veterinary Professional"}
          </p>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">
              VETCONNECT VERIFIED PROFILE
            </span>

            <h2>Professional information</h2>

            <p>
              This veterinarian profile has been reviewed and
              approved by VetConnect.
            </p>
          </div>

          <div className="feature-columns">
            <div>
              <h3>Identity & Verification</h3>

              <p>
                <strong>Name:</strong> {fullName}
              </p>

              <p>
                <strong>PVMC Registration:</strong>{" "}
                {vet.pvmc_number || "Not specified"}
              </p>

              <p>
                <strong>Status:</strong> Verified by VetConnect
              </p>
            </div>

            <div>
              <h3>Professional Qualifications</h3>

              <p>
                <strong>Qualification:</strong>{" "}
                {vet.qualifications || "Not specified"}
              </p>

              <p>
                <strong>Specialization:</strong>{" "}
                {vet.specialization || "Not specified"}
              </p>

              <p>
                <strong>Experience:</strong>{" "}
                {vet.years_experience !== null &&
                vet.years_experience !== undefined
                  ? `${vet.years_experience} years`
                  : "Not specified"}
              </p>
            </div>

            <div>
              <h3>Location</h3>

              <p>
                <strong>City:</strong> {city}
              </p>

              <p>
                Practice and service-area details can be added
                by the veterinarian.
              </p>
            </div>

            <div>
              <h3>Veterinary Services</h3>

              {services.length > 0 ? (
                <div className="profile-chips">
                  {services.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
              ) : (
                <p>Services have not been added yet.</p>
              )}
            </div>
          </div>

          <div className="card-actions">
            <Link
              className="button button-primary"
              href="/coming-soon?feature=Appointment%20booking"
            >
              Book appointment
            </Link>

            <Link
              className="button button-secondary"
              href="/vets"
            >
              Back to veterinarian directory
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
