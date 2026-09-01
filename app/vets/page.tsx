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
  description:
    "Find VetConnect-listed veterinarians in Pakistan by city, specialization, sector and veterinary service.",
  alternates: {
    canonical: "/vets",
  },
};

export const dynamic = "force-dynamic";

/* -------------------------------------------------------
   LOAD PUBLIC VETERINARIANS
------------------------------------------------------- */

async function loadVeterinarians(): Promise<PublicVeterinarian[]> {
  if (!isSupabaseConfigured()) {
    return sampleVeterinarians;
  }

  const supabase = await createClient();

  const select =
    "user_id, full_name, qualifications, specialization, veterinary_sector, years_experience, city, province, district, tehsil, services, profile_verified, pvmc_verified, image_url, public_phone, contact_email, address, google_maps_url";

  const [account, managed] = await Promise.all([
    supabase
      .from("public_veterinarians")
      .select(select)
      .order("full_name"),

    supabase
      .from("public_managed_veterinarians")
      .select(select)
      .order("full_name"),
  ]);

  return [
    ...(account.data ?? []),
    ...(managed.data ?? []),
  ] as PublicVeterinarian[];
}

/* -------------------------------------------------------
   VETERINARIAN DIRECTORY
------------------------------------------------------- */

export default async function VeterinarianDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    service?: string;
    sector?: string;
  }>;
}) {
  const params = await searchParams;
  const veterinarians = await loadVeterinarians();

  const query = (params.q ?? "").trim().toLowerCase();
  const city = (params.city ?? "").trim().toLowerCase();
  const service = (params.service ?? "").trim().toLowerCase();
  const sector = (params.sector ?? "").trim().toLowerCase();

  /* -------------------------------------------------------
     PROGRESSIVE FILTERING

     No filter = all approved veterinarians
     One filter = match that filter
     Two filters = both must match
     Three filters = all must match
  ------------------------------------------------------- */

  const visible = veterinarians.filter((vet) => {
    const searchableText = [
      vet.full_name,
      vet.qualifications ?? "",
      vet.specialization ?? "",
      vet.veterinary_sector ?? "",
      vet.city ?? "",
      ...vet.services,
    ]
      .join(" ")
      .toLowerCase();

    const queryMatch =
      !query || searchableText.includes(query);

    const cityMatch =
      !city ||
      city === "all cities" ||
      vet.city?.toLowerCase() === city;

    const sectorMatch =
      !sector ||
      sector === "all sectors" ||
      vet.veterinary_sector?.toLowerCase() === sector;

    const serviceMatch =
      !service ||
      service === "all services" ||
      vet.services.some((item) =>
        item.toLowerCase().includes(service),
      );

    return (
      queryMatch &&
      cityMatch &&
      sectorMatch &&
      serviceMatch
    );
  });

  /* -------------------------------------------------------
     FILTER OPTIONS
  ------------------------------------------------------- */

  const cities = [
    ...new Set(
      veterinarians
        .map((vet) => vet.city)
        .filter(Boolean),
    ),
  ] as string[];

  cities.sort((a, b) => a.localeCompare(b));

  const services = [
    ...new Set(
      veterinarians.flatMap((vet) => vet.services),
    ),
  ].sort((a, b) => a.localeCompare(b));

  /*
   * Main veterinary sectors stay visible even when
   * no current veterinarian exists in a particular sector.
   */
  const sectors = [
    "Pets",
    "Livestock",
    "Poultry",
    "Dairy",
    "Fisheries",
    "Equine",
  ];

  const showingSamples = veterinarians.some(
    (vet) => vet.is_sample,
  );

  return (
    <main>
      <SiteHeader />

      {/* ---------------------------------------------------
          PAGE INTRO
      --------------------------------------------------- */}

      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">
            VERIFIED VETERINARIAN DIRECTORY
          </span>

          <h1>Find the right veterinarian.</h1>

          <p>
            Search veterinarians by animal sector, location,
            specialization and available veterinary services.
            Public listings require VetConnect profile approval
            and PVMC credential review.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------
          DIRECTORY + FILTERS
      --------------------------------------------------- */}

      <section className="section compact-section">
        <div className="shell">

          <div className="directory-top">
            <div>
              <b>
                {visible.length} veterinarian{" "}
                {visible.length === 1
                  ? "profile"
                  : "profiles"}
              </b>

              <span>
                {showingSamples
                  ? "Demo mode because the backend is not configured"
                  : "Live verified directory"}
              </span>
            </div>

            <form
              className="market-search"
              method="get"
            >
              {/* NAME / EXPERTISE SEARCH */}

              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Name, qualification or expertise"
                aria-label="Search veterinarian"
              />

              {/* SECTOR */}

              <select
                name="sector"
                defaultValue={
                  params.sector ?? "All sectors"
                }
                aria-label="Veterinary sector"
              >
                <option value="All sectors">
                  All sectors
                </option>

                {sectors.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              {/* CITY */}

              <select
                name="city"
                defaultValue={
                  params.city ?? "All cities"
                }
                aria-label="City"
              >
                <option value="All cities">
                  All cities
                </option>

                {cities.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              {/* SERVICE */}

              <select
                name="service"
                defaultValue={
                  params.service ?? "All services"
                }
                aria-label="Veterinary service"
              >
                <option value="All services">
                  All services
                </option>

                {services.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <button
                className="button button-primary"
                type="submit"
              >
                Search
              </button>
            </form>
          </div>

          {/* -------------------------------------------------
              EMPTY RESULT
          ------------------------------------------------- */}

          {visible.length === 0 ? (
            <div className="empty-state">
              <h2>
                No verified veterinarian matches these filters.
              </h2>

              <p>
                Try removing one or more filters or search
                another city or veterinary sector.
              </p>

              <Link href="/vets">
                Clear search
              </Link>
            </div>
          ) : (
            /* -----------------------------------------------
               VETERINARIAN CARDS
            ----------------------------------------------- */

            <div className="company-grid">
              {visible.map((vet) => (
                <article key={vet.user_id}>

                  {/* PHOTO */}

                  <div className="company-mark large profile-photo-frame">
                    <ProfilePhoto
                      imageUrl={vet.image_url}
                      name={vet.full_name}
                      fallback={initials(vet.full_name)}
                    />
                  </div>

                  {/* SAMPLE LABEL */}

                  {vet.is_sample && (
                    <span className="sample-label">
                      Sample profile
                    </span>
                  )}

                  {/* NAME */}

                  <h3>{vet.full_name}</h3>

                  {/* MAIN SECTOR + CITY */}

                  <p>
                    {vet.veterinary_sector ||
                      "Veterinarian"}
                    {" • "}
                    {vet.city || "Pakistan"}
                  </p>

                  {/* SPECIALIZATION */}

                  {vet.specialization && (
                    <p className="profile-specialization">
                      {vet.specialization}
                    </p>
                  )}

                  {/* QUALIFICATION + EXPERIENCE */}

                  <div className="profile-chips">
                    {vet.qualifications && (
                      <span>
                        {vet.qualifications}
                      </span>
                    )}

                    <span>
                      {vet.years_experience}{" "}
                      {vet.years_experience === 1
                        ? "year"
                        : "years"}
                    </span>
                  </div>

                  {/* VERIFICATION / SERVICES */}

                  <dl>
                    <div>
                      <dt>PVMC credential</dt>

                      <dd>
                        {vet.pvmc_verified
                          ? "Verified"
                          : vet.is_sample
                            ? "Sample"
                            : "Pending"}
                      </dd>
                    </div>

                    <div>
                      <dt>VetConnect profile</dt>

                      <dd>
                        {vet.profile_verified
                          ? "Verified"
                          : vet.is_sample
                            ? "Sample"
                            : "Pending"}
                      </dd>
                    </div>

                    <div>
                      <dt>Services</dt>

                      <dd>
                        {vet.services
                          .slice(0, 2)
                          .join(", ") ||
                          "Not listed"}
                      </dd>
                    </div>
                  </dl>

                  {/* PROFILE CTA */}

                  <Link
                    className="button button-primary button-full"
                    href={`/vets/${vet.user_id}`}
                  >
                    View veterinarian profile
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------
          TRUST MODEL
      --------------------------------------------------- */}

      <section className="section section-soft">
        <div className="shell two-col">

          <div>
            <span className="section-kicker">
              TRUST MODEL
            </span>

            <h2>
              Two checks, two clear badges.
            </h2>

            <p>
              PVMC credential verification and VetConnect
              profile verification remain separate.
              Registration numbers and supporting evidence
              remain private.
            </p>
          </div>

          <div className="spec-list">

            <div>
              <b>PVMC Verified</b>

              <span>
                Veterinary credential matched with an
                accepted official source or supporting
                evidence.
              </span>
            </div>

            <div>
              <b>VetConnect Verified Profile</b>

              <span>
                Identity and public professional profile
                reviewed by VetConnect.
              </span>
            </div>

            <div>
              <b>Structured Filters</b>

              <span>
                Veterinarians can be discovered by sector,
                specialization, services and location.
              </span>
            </div>

          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
