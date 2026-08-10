import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const vets = [
  [
    "SA",
    "Dr. Sara Ahmed",
    "Small Animal & Pet Practice",
    "Lahore",
    "Pets, Dogs, Cats",
    "Clinic, Video",
    "Today 6:00 PM",
  ],
  [
    "MH",
    "Dr. M. Hassan",
    "Livestock & Herd Health",
    "Faisalabad",
    "Livestock, Cattle, Buffalo",
    "Farm Visit, Video",
    "Tomorrow 9:30 AM",
  ],
  [
    "RK",
    "Dr. R. Khan",
    "Poultry Health",
    "Rawalpindi",
    "Poultry, Broiler, Layer",
    "On-site, Advisory",
    "Mon 11:00 AM",
  ],
  [
    "AN",
    "Dr. A. Noor",
    "Dairy Reproduction",
    "Multan",
    "Dairy, Cattle",
    "Farm Visit",
    "Tue 8:30 AM",
  ],
  [
    "FA",
    "Dr. F. Ali",
    "Equine Practice",
    "Lahore",
    "Equine, Horse",
    "Clinic, Farm Visit",
    "Wed 4:00 PM",
  ],
  [
    "HZ",
    "Dr. H. Zafar",
    "Aquatic Animal Health",
    "Islamabad",
    "Fisheries, Fish, Aquaculture",
    "Advisory, Video",
    "Thu 2:00 PM",
  ],
];

export default async function VetsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; sector?: string; service?: string }>;
}) {
  const params = await searchParams;
  const filteredVets = vets.filter((vet) => {
    const cityMatch =
      !params.city || params.city === "All cities" || vet[3] === params.city;
    const sectorMatch =
      !params.sector ||
      params.sector === "All sectors" ||
      vet[4].toLowerCase().includes(params.sector.toLowerCase());
    const serviceMatch =
      !params.service ||
      params.service === "Any service" ||
      vet[5]
        .toLowerCase()
        .includes(params.service.toLowerCase().replace(" consultation", ""));
    return cityMatch && sectorMatch && serviceMatch;
  });

  return (
    <main>
      <SiteHeader />
      <section className="page-hero">
        <div className="shell">
          <span className="section-kicker">VETERINARIAN DIRECTORY</span>
          <h1>Find the right veterinary professional.</h1>
          <p>
            Search by city, sector, animal and service type. Approved database
            profiles will replace the sample records as registrations are
            verified.
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
                <option>Lahore</option>
                <option>Faisalabad</option>
                <option>Islamabad</option>
                <option>Rawalpindi</option>
                <option>Multan</option>
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
                defaultValue={params.service ?? "Any service"}
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
                VetConnect administrators review PVMC and professional
                information before an approved profile becomes public.
              </p>
            </div>
          </aside>
          <div>
            <div className="directory-top">
              <div>
                <b>{filteredVets.length} veterinarian profiles</b>
                <span>Searchable sample directory</span>
              </div>
            </div>
            {filteredVets.length === 0 ? (
              <div className="empty-state">
                <h2>No profiles match these filters.</h2>
                <p>Clear the filters or choose another city and service.</p>
              </div>
            ) : (
              <div className="directory-grid">
                {filteredVets.map((vet) => (
                  <article className="directory-vet" key={vet[1]}>
                    <div className="directory-vet-head">
                      <div className="avatar">{vet[0]}</div>
                      <div>
                        <span className="sample-label">Sample profile</span>
                        <h3>{vet[1]}</h3>
                        <p>{vet[2]}</p>
                      </div>
                    </div>
                    <div className="verified-line">
                      <span>✓</span> Verification workflow preview
                    </div>
                    <div className="profile-chips">
                      <span>{vet[3]}</span>
                      <span>{vet[4]}</span>
                      <span>{vet[5]}</span>
                    </div>
                    <div className="availability-box">
                      <small>Next available</small>
                      <b>{vet[6]}</b>
                    </div>
                    <div className="profile-details">
                      <div>
                        <small>Clinic / service address</small>
                        <b>Profile-controlled location</b>
                      </div>
                      <div>
                        <small>Consultation fee</small>
                        <b>Shown when configured</b>
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
            <span className="section-kicker">PROFILE DATA MODEL</span>
            <h2>What a veterinarian can manage.</h2>
          </div>
          <div className="feature-columns">
            <div>
              <h3>Identity & verification</h3>
              <p>
                Name, photograph, PVMC number, qualifications, documents and
                verification status.
              </p>
            </div>
            <div>
              <h3>Clinical expertise</h3>
              <p>
                Specialties, species, services, consultation modes and
                professional experience.
              </p>
            </div>
            <div>
              <h3>Location & availability</h3>
              <p>
                Clinic address, city, nearby service areas, farm-visit radius,
                weekly schedule and available slots.
              </p>
            </div>
            <div>
              <h3>Practice & bookings</h3>
              <p>
                Fees, appointment types, booking confirmation, animal/case
                details, revisit history and follow-up.
              </p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
