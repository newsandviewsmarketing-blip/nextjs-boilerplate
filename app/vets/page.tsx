import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  city?: string;
  sector?: string;
  service?: string;
};

type VetCard = {
  userId: string;
  fullName: string;
  initials: string;
  pvmcNumber: string;
  qualifications: string;
  specialization: string;
  yearsExperience: number | null;
  city: string;
  services: string[];
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "VC";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeServices(value: unknown): string[] {
  let values: string[] = [];

  if (Array.isArray(value)) {
    values = value.map((item) => String(item).trim());
  } else if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();

    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          values = parsed.map((item) => String(item).trim());
        } else {
          values = [trimmed];
        }
      } catch {
        values = trimmed.split(",").map((item) => item.trim());
      }
    } else {
      values = trimmed.split(",").map((item) => item.trim());
    }
  }

  return values.filter((service) => {
    if (!service) return false;

    const lower = service.toLowerCase();

    if (lower.includes("full name:")) return false;
    if (lower.includes("phone:")) return false;
    if (lower.includes("pvmc")) return false;

    return service.length <= 80;
  });
}

export default async function VetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let loadError = false;

  const { data: veterinarianRows, error: veterinarianError } = await supabase
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
    .eq("verification_status", "approved");

  if (veterinarianError) {
    loadError = true;
  }

  const userIds = (veterinarianRows ?? []).map((row) => row.user_id);

  let profileRows: {
    id: string;
    full_name: string | null;
    city: string | null;
    account_status: string | null;
  }[] = [];

  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, city, account_status")
      .in("id", userIds)
      .eq("account_status", "active");

    if (error) {
      loadError = true;
    }

    profileRows = data ?? [];
  }

  const profilesById = new Map(
    profileRows.map((profile) => [profile.id, profile]),
  );

  const liveVets: VetCard[] = [];

  for (const row of veterinarianRows ?? []) {
    const profile = profilesById.get(row.user_id);

    if (!profile) continue;

    const fullName =
      profile.full_name?.trim() || "Veterinary Professional";

    liveVets.push({
      userId: row.user_id,
      fullName,
      initials: getInitials(fullName),
      pvmcNumber: row.pvmc_number
        ? String(row.pvmc_number)
        : "",
      qualifications: row.qualifications?.trim() || "",
      specialization: row.specialization?.trim() || "",
      yearsExperience:
        row.years_experience === null ||
        row.years_experience === undefined
          ? null
          : Number(row.years_experience),
      city: row.city?.trim() || profile.city?.trim() || "",
      services: normalizeServices(row.services),
    });
  }

  const filteredVets = liveVets.filter((vet) => {
    const cityMatch =
      !params.city ||
      params.city === "All cities" ||
      vet.city.toLowerCase() === params.city.toLowerCase();

    const sectorText = [
      vet.specialization,
      vet.qualifications,
      ...vet.services,
    ]
      .join(" ")
      .toLowerCase();

    const sectorMatch =
      !params.sector ||
      params.sector === "All sectors" ||
      sectorText.includes(params.sector.toLowerCase());

    const serviceText = vet.services.join(" ").toLowerCase();

    const requestedService = (params.service ?? "")
      .toLowerCase()
      .replace(" consultation", "");

    const serviceMatch =
      !params.service ||
      params.service === "Any service" ||
      serviceText.includes(requestedService);

    return cityMatch && sectorMatch && serviceMatch;
  });

  const availableCities = Array.from(
    new Set(
      liveVets
        .map((vet) => vet.city)
        .filter((city) => Boolean(city)),
    ),
  ).sort();

  return (
    <main>
      <SiteHeader />

      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">
            VETERINARIAN DIRECTORY
          </span>

          <h1>Find the right veterinary professional.</h1>

          <p>
            Search approved veterinary professionals by city,
            specialization and available services.
          </p>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell directory-layout">
          <aside className="directory-filters">
            <form method="get">
              <h3>Filter profiles</h3>

              <label htmlFor="city">City</label>

              <select
                id="city"
                name="city"
                defaultValue={params.city ?? "All cities"}
              >
                <option>All cities</option>

                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <label htmlFor="sector">Sector / Animal</label>

              <select
                id="sector"
                name="sector"
                defaultValue={params.sector ?? "All sectors"}
              >
                <option>All sectors</option>
                <option>Pets</option>
                <option>Livestock</option>
                <option>Poultry</option>
                <option>Dairy</option>
                <option>Equine</option>
                <option>Fisheries</option>
              </select>

              <label htmlFor="service">Service type</label>

              <select
                id="service"
                name="service"
                defaultValue={
                  params.service ?? "Any service"
                }
              >
                <option>Any service</option>
                <option>Clinic</option>
                <option>Farm Visit</option>
                <option>Video Consultation</option>
                <option>Advisory</option>
              </select>

              <button
                className="button button-primary button-full"
                type="submit"
              >
                Apply filters
              </button>

              <Link className="filter-reset" href="/vets">
                Clear filters
              </Link>
            </form>

            <div className="filter-note">
              <b>Verification workflow</b>

              <p>
                VetConnect administrators review PVMC and
                professional information before a veterinarian
                profile becomes publicly visible.
              </p>
            </div>
          </aside>

          <div>
            <div className="directory-top">
              <div>
                <b>
                  {filteredVets.length} veterinarian{" "}
                  {filteredVets.length === 1
                    ? "profile"
                    : "profiles"}
                </b>

                <span>Approved VetConnect directory</span>
              </div>
            </div>

            {loadError ? (
              <div className="empty-state">
                <h2>Directory is temporarily unavailable.</h2>

                <p>
                  Approved veterinarian profiles could not be
                  loaded from the database.
                </p>
              </div>
            ) : filteredVets.length === 0 ? (
              <div className="empty-state">
                <h2>No approved profiles match these filters.</h2>

                <p>
                  Clear the filters or choose another city,
                  sector or service.
                </p>
              </div>
            ) : (
              <div className="directory-grid">
                {filteredVets.map((vet) => (
                  <article
                    className="directory-vet"
                    key={vet.userId}
                  >
                    <div className="directory-vet-head">
                      <div className="avatar">
                        {vet.initials}
                      </div>

                      <div>
                        <span className="sample-label">
                          Approved profile
                        </span>

                        <h3>{vet.fullName}</h3>

                        <p>
                          {vet.specialization ||
                            "Veterinary Professional"}
                        </p>
                      </div>
                    </div>

                    <div className="verified-line">
                      <span>✓</span> Verified by VetConnect
                    </div>

                    <div className="profile-chips">
                      {vet.city && <span>{vet.city}</span>}

                      {vet.qualifications && (
                        <span>{vet.qualifications}</span>
                      )}

                      {vet.pvmcNumber && (
                        <span>
                          PVMC {vet.pvmcNumber}
                        </span>
                      )}

                      {vet.yearsExperience !== null && (
                        <span>
                          {vet.yearsExperience}{" "}
                          {vet.yearsExperience === 1
                            ? "year"
                            : "years"}{" "}
                          experience
                        </span>
                      )}
                    </div>

                    {vet.services.length > 0 && (
                      <div className="profile-chips">
                        {vet.services
                          .slice(0, 4)
                          .map((service) => (
                            <span key={service}>
                              {service}
                            </span>
                          ))}
                      </div>
                    )}

                    <div className="availability-box">
                      <small>Availability</small>
                      <b>Contact veterinarian</b>
                    </div>

                    <div className="profile-details">
                      <div>
                        <small>Specialization</small>
                        <b>
                          {vet.specialization ||
                            "Not specified"}
                        </b>
                      </div>

                      <div>
                        <small>PVMC registration</small>
                        <b>
                          {vet.pvmcNumber ||
                            "Not specified"}
                        </b>
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
                        href="/coming-soon?feature=Full%20veterinarian%20profile"
                      >
                        View full profile
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">
              PROFILE DATA MODEL
            </span>

            <h2>What a veterinarian can manage.</h2>
          </div>

          <div className="feature-columns">
            <div>
              <h3>Identity & verification</h3>

              <p>
                Name, photograph, PVMC number, qualifications,
                documents and verification status.
              </p>
            </div>

            <div>
              <h3>Clinical expertise</h3>

              <p>
                Specialties, species, services, consultation
                modes and professional experience.
              </p>
            </div>

            <div>
              <h3>Location & availability</h3>

              <p>
                Clinic address, city, nearby service areas,
                farm-visit radius, weekly schedule and
                available slots.
              </p>
            </div>

            <div>
              <h3>Practice & bookings</h3>

              <p>
                Fees, appointment types, booking confirmation,
                animal/case details, revisit history and
                follow-up.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
