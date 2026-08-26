import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

const modules = [
  {
    tag: "VET",
    title: "Verified Veterinarian Network",
    text: "Professional profiles built around qualifications, PVMC verification workflow, expertise, species, clinic details, service areas and real availability.",
    href: "/vets",
    link: "Find a veterinarian",
  },
  {
    tag: "MKT",
    title: "Veterinary Marketplace",
    text: "Company profiles and structured B2B/B2C product listings for medicines, vaccines, feed, nutrition, equipment, pet care, dairy, poultry and fisheries.",
    href: "/marketplace",
    link: "Explore marketplace",
  },
  {
    tag: "CLN",
    title: "Clinics & Veterinary Hospitals",
    text: "Facility profiles organized by location, services, species, public contacts, working hours and linked veterinary professionals.",
    href: "/clinics",
    link: "Find a facility",
  },
  {
    tag: "LAB",
    title: "Diagnostic Laboratory Network",
    text: "Laboratory profiles, branches, test menus, species coverage and evidence-based accreditation status in a dedicated directory.",
    href: "/labs",
    link: "Explore laboratories",
  },
  {
    tag: "PRO",
    title: "Animal Health Professionals",
    text: "A separate professional network for nutrition, laboratory, research, academia, farm management, regulatory and technical roles.",
    href: "/professionals",
    link: "Find professionals",
  },
  {
    tag: "JOB",
    title: "Jobs & Talent Matching",
    text: "A career bridge where companies can publish openings and students or professionals can build profiles, upload CVs and discover relevant opportunities.",
    href: "/jobs",
    link: "Explore careers",
  },
  {
    tag: "EDU",
    title: "Learning & Professional Development",
    text: "Courses, workshops, seminars and technical learning designed to help veterinary professionals and sector teams keep their skills current.",
    href: "/learn",
    link: "Visit learning hub",
  },
];

const sampleVets = [
  {
    initials: "SA",
    name: "Dr. Sara Ahmed",
    role: "Small Animal & Pet Practice",
    city: "Lahore",
    animals: "Dogs • Cats",
    mode: "Clinic • Video",
    next: "Today, 6:00 PM",
  },
  {
    initials: "MH",
    name: "Dr. M. Hassan",
    role: "Livestock & Herd Health",
    city: "Faisalabad",
    animals: "Cattle • Buffalo",
    mode: "Farm Visit • Video",
    next: "Tomorrow, 9:30 AM",
  },
  {
    initials: "RK",
    name: "Dr. R. Khan",
    role: "Poultry Health",
    city: "Rawalpindi",
    animals: "Broiler • Layer",
    mode: "On-site • Advisory",
    next: "Mon, 11:00 AM",
  },
];

const marketCategories = [
  "Medicines",
  "Vaccines",
  "Feed & Nutrition",
  "Pet Care",
  "Farm Equipment",
  "Diagnostics",
  "Disinfectants",
  "Aquaculture",
];

const jobs = [
  {
    role: "Veterinary Officer",
    company: "Animal Health Company",
    city: "Lahore",
    type: "Full-time",
    sector: "Livestock",
  },
  {
    role: "Technical Sales Executive",
    company: "Veterinary Nutrition Company",
    city: "Faisalabad",
    type: "Full-time",
    sector: "Feed & Nutrition",
  },
  {
    role: "Veterinary Intern",
    company: "Veterinary Clinic Network",
    city: "Islamabad",
    type: "Internship",
    sector: "Companion Animals",
  },
];

const courses = [
  {
    code: "01",
    title: "Poultry Health & Disease Management",
    meta: "Technical course • Veterinarians",
  },
  {
    code: "02",
    title: "Farm Biosecurity Essentials",
    meta: "Short course • Farm teams",
  },
  {
    code: "03",
    title: "Veterinary Diagnostics & Sample Handling",
    meta: "Professional learning • Clinical",
  },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> Pakistan&apos;s veterinary connection platform
            </div>
            <h1>
              Veterinary expertise, products, careers and learning.{" "}
              <em>Connected.</em>
            </h1>
            <p className="hero-lead">
              VetConnect brings verified veterinary professionals, facilities,
              diagnostic laboratories, animal-health companies, products,
              careers and learning into one structured platform.
            </p>
            <div className="hero-actions">
              <Link href="/vets" className="button button-primary">
                Find a Veterinarian
              </Link>
              <Link href="/register" className="button button-secondary">
                Create Professional Profile
              </Link>
            </div>
            <div className="trust-row">
              <span>Separate PVMC and profile verification</span>
              <span>Location & expertise matching</span>
              <span>Verified company and product data</span>
              <span>English + Urdu ready</span>
            </div>
          </div>

          <div className="hero-search-card">
            <div className="search-card-head">
              <div>
                <small>SMART MATCHING</small>
                <h2>What do you need today?</h2>
              </div>
              <span className="status-pill">Structured Discovery</span>
            </div>
            <div className="search-tabs">
              <Link className="active" href="/vets">
                Veterinarian
              </Link>
              <Link href="/marketplace">Product</Link>
              <Link href="/jobs">Job</Link>
              <Link href="/learn">Course</Link>
            </div>
            <label>Location</label>
            <select defaultValue="Faisalabad">
              <option>Faisalabad</option>
              <option>Lahore</option>
              <option>Islamabad</option>
              <option>Rawalpindi</option>
              <option>Multan</option>
              <option>Other city</option>
            </select>
            <div className="form-two">
              <div>
                <label>Animal / Sector</label>
                <select defaultValue="Livestock">
                  <option>Livestock</option>
                  <option>Pets</option>
                  <option>Poultry</option>
                  <option>Dairy</option>
                  <option>Fisheries</option>
                  <option>Equine</option>
                </select>
              </div>
              <div>
                <label>Service</label>
                <select defaultValue="Consultation">
                  <option>Consultation</option>
                  <option>Clinic Visit</option>
                  <option>Farm Visit</option>
                  <option>Video Consultation</option>
                  <option>Vaccination</option>
                  <option>Diagnostics</option>
                </select>
              </div>
            </div>
            <Link className="button button-primary button-full" href="/vets">
              Search matching profiles
            </Link>
            <p className="microcopy">
              Match by city, specialty, species, service type and availability.
            </p>
          </div>
        </div>
      </section>

      <section className="quick-bar">
        <div className="shell quick-grid">
          <Link href="/vets">
            <b>Find a Vet</b>
            <span>Search verified professional profiles</span>
          </Link>
          <Link href="/marketplace">
            <b>Find Animal Health Products</b>
            <span>Explore verified information and suppliers</span>
          </Link>
          <Link href="/jobs">
            <b>Find a Job</b>
            <span>Jobs, internships and talent profiles</span>
          </Link>
          <Link href="/learn">
            <b>Upgrade Skills</b>
            <span>Courses, workshops and seminars</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <span className="section-kicker">THE COMPLETE ECOSYSTEM</span>
              <h2>More than a booking page.</h2>
            </div>
            <p>
              VetConnect is structured as a multi-sided platform. Each module
              has its own users, profiles, search logic and transaction path,
              but all modules connect around the veterinary and animal-health
              ecosystem.
            </p>
          </div>
          <div className="module-grid">
            {modules.map((m) => (
              <article className="module-card" key={m.title}>
                <span className="module-tag">{m.tag}</span>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <Link href={m.href}>
                  {m.link} <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft" id="veterinarians">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">VETERINARIAN DISCOVERY</span>
            <h2>Profiles that help users make an informed choice.</h2>
            <p>
              A useful veterinarian profile should show more than a name. It
              should combine verification, qualifications, expertise, species,
              service areas, clinic information, availability and booking
              options.
            </p>
          </div>
          <div className="vet-layout">
            <div className="filter-panel">
              <h3>Match the right professional</h3>
              <div className="filter-item">
                <b>1</b>
                <span>
                  <strong>Choose need</strong>
                  <small>
                    Pet, livestock, poultry, dairy, fisheries or other.
                  </small>
                </span>
              </div>
              <div className="filter-item">
                <b>2</b>
                <span>
                  <strong>Choose location</strong>
                  <small>
                    City, nearby area, clinic, farm visit or online.
                  </small>
                </span>
              </div>
              <div className="filter-item">
                <b>3</b>
                <span>
                  <strong>Compare profiles</strong>
                  <small>
                    Qualifications, specialty, availability, services and
                    reviews.
                  </small>
                </span>
              </div>
              <div className="filter-item">
                <b>4</b>
                <span>
                  <strong>Book a slot</strong>
                  <small>
                    Add animal/case details and receive confirmation.
                  </small>
                </span>
              </div>
              <Link className="button button-dark button-full" href="/vets">
                Open veterinarian directory
              </Link>
            </div>
            <div className="vet-card-grid">
              {sampleVets.map((vet) => (
                <article className="vet-card" key={vet.name}>
                  <div className="vet-card-top">
                    <div className="avatar">{vet.initials}</div>
                    <div>
                      <span className="sample-label">Sample profile</span>
                      <h3>{vet.name}</h3>
                      <p>{vet.role}</p>
                    </div>
                  </div>
                  <div className="verified-line">
                    <span>✓</span> PVMC verification field
                  </div>
                  <dl>
                    <div>
                      <dt>City</dt>
                      <dd>{vet.city}</dd>
                    </div>
                    <div>
                      <dt>Animals</dt>
                      <dd>{vet.animals}</dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{vet.mode}</dd>
                    </div>
                    <div>
                      <dt>Next slot</dt>
                      <dd>{vet.next}</dd>
                    </div>
                  </dl>
                  <div className="card-actions">
                    <Link href="/vets" className="button button-primary">
                      View profile
                    </Link>
                    <Link
                      className="icon-button"
                      href="/login?next=/dashboard"
                      aria-label="Save profile"
                    >
                      ♡
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section marketplace-preview">
        <div className="shell two-col">
          <div>
            <span className="section-kicker">MARKETPLACE</span>
            <h2>Structured product listings, backed by company profiles.</h2>
            <p>
              Companies can build verified business profiles and list products
              with category, generic and brand information, pack sizes,
              technical details, regulatory review status, documents,
              availability and quotation requests.
            </p>
            <div className="category-cloud">
              {marketCategories.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Link className="button button-primary" href="/marketplace">
              Browse marketplace
            </Link>
          </div>
          <div className="company-product-card">
            <div className="company-head">
              <div className="company-mark">AH</div>
              <div>
                <small>Sample company profile</small>
                <h3>Animal Health Company</h3>
                <p>Pharmaceuticals • Nutrition • Lahore</p>
              </div>
              <span className="status-pill">Profile</span>
            </div>
            <div className="product-list-mini">
              <div>
                <span className="product-thumb">RX</span>
                <p>
                  <b>Veterinary Medicine</b>
                  <small>Brand • Generic • Pack • Price</small>
                </p>
                <strong>View</strong>
              </div>
              <div>
                <span className="product-thumb">VAX</span>
                <p>
                  <b>Vaccine Listing</b>
                  <small>Species • Pack • Cold chain notes</small>
                </p>
                <strong>View</strong>
              </div>
              <div>
                <span className="product-thumb">NUT</span>
                <p>
                  <b>Nutrition Product</b>
                  <small>Category • Pack • Bulk quotation</small>
                </p>
                <strong>View</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="section-heading split-heading light-heading">
            <div>
              <span className="section-kicker">JOBS & TALENT</span>
              <h2>One career system for employers and candidates.</h2>
            </div>
            <p>
              Companies get an HR-facing space to publish openings and search
              candidate profiles. Students and professionals can build career
              profiles, upload CVs, define interests and discover relevant
              vacancies.
            </p>
          </div>
          <div className="jobs-home-grid">
            <div className="job-list">
              {jobs.map((j) => (
                <article className="job-row" key={j.role}>
                  <div className="job-logo">VC</div>
                  <div>
                    <span>{j.sector}</span>
                    <h3>{j.role}</h3>
                    <p>
                      {j.company} • {j.city} • {j.type}
                    </p>
                  </div>
                  <Link href="/jobs">View job</Link>
                </article>
              ))}
            </div>
            <div className="talent-panel">
              <span className="module-tag">CANDIDATE</span>
              <h3>Build one career profile.</h3>
              <ul>
                <li>CV upload and structured profile</li>
                <li>Education, experience and skills</li>
                <li>Preferred sectors and locations</li>
                <li>Jobs and internship matching</li>
                <li>Application tracking</li>
              </ul>
              <Link href="/jobs" className="button button-white">
                Explore careers
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell two-col align-center">
          <div>
            <span className="section-kicker">LEARNING HUB</span>
            <h2>Professional development connected to industry needs.</h2>
            <p>
              Courses and short learning programs can sit alongside jobs and
              professional profiles, allowing veterinarians, students and
              company teams to strengthen practical skills and maintain a
              visible learning record.
            </p>
            <Link className="button button-primary" href="/learn">
              Explore learning hub
            </Link>
          </div>
          <div className="course-stack">
            {courses.map((c) => (
              <Link href="/learn" key={c.code}>
                <span>{c.code}</span>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.meta}</p>
                </div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="shell two-col align-center">
          <div className="news-panel">
            <div className="news-brand">VNV</div>
            <div>
              <small>INDUSTRY NEWS PARTNER</small>
              <h3>Veterinary News & Views</h3>
              <p>
                Sector news, research, policy, markets, events and professional
                updates can connect the VetConnect community with current
                industry information.
              </p>
            </div>
          </div>
          <div>
            <span className="section-kicker">CONNECTED KNOWLEDGE</span>
            <h2>
              News, services and professional opportunity in one ecosystem.
            </h2>
            <p>
              VetConnect can link platform users to relevant veterinary and
              animal-sector coverage while maintaining a clear separation
              between marketplace, professional services, careers and editorial
              content.
            </p>
            <a
              className="button button-dark"
              href="https://vetnewsandviews.com"
              target="_blank"
              rel="noreferrer"
            >
              Visit Veterinary News & Views
            </a>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-row">
          <div>
            <small>JOIN THE NETWORK</small>
            <h2>Choose how you want to connect.</h2>
          </div>
          <div className="cta-buttons">
            <Link className="button button-white" href="/register">
              Veterinarian / Professional
            </Link>
            <Link className="button button-outline-white" href="/register">
              Company / Employer
            </Link>
            <Link className="button button-outline-white" href="/register">
              Student / Job Seeker
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
