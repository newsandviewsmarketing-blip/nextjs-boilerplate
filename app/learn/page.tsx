import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Veterinary Learning & Professional Development",
  description: "Explore veterinary, livestock, poultry, dairy, fisheries and animal-health learning opportunities on VetConnect.",
  alternates: { canonical: "/learn" },
};

const courses = [
  [
    "Poultry Health & Disease Management",
    "Poultry",
    "Veterinarians",
    "6 modules",
  ],
  ["Farm Biosecurity Essentials", "Livestock", "Farm Teams", "4 modules"],
  [
    "Veterinary Diagnostics & Sample Handling",
    "Clinical",
    "Veterinarians",
    "5 modules",
  ],
  [
    "Dairy Herd Health Fundamentals",
    "Dairy",
    "Veterinarians & Managers",
    "6 modules",
  ],
  [
    "Animal Health Product Stewardship",
    "Industry",
    "Technical & Sales Teams",
    "4 modules",
  ],
  [
    "Aquaculture Health Basics",
    "Fisheries",
    "Professionals & Students",
    "5 modules",
  ],
];

export default function LearnPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-hero learn-hero">
        <div className="shell">
          <span className="section-kicker">
            KNOWLEDGE HUB & ONLINE TRAINING
          </span>
          <h1>Learn. Update skills. Build a stronger professional profile.</h1>
          <p>
            A learning layer for veterinarians, students, farm teams and
            animal-health companies.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="#courses">
              Explore courses
            </Link>
            <Link
              className="button button-secondary"
              href="/register?role=company#registration"
            >
              Become a training partner
            </Link>
          </div>
        </div>
      </section>
      <section id="courses" className="section compact-section">
        <div className="shell">
          <div className="section-heading">
            <span className="section-kicker">COURSE CATALOGUE</span>
            <h2>Practical learning by sector.</h2>
          </div>
          <div className="learning-grid">
            {courses.map((course, index) => (
              <article key={course[0]}>
                <div className="course-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <span>{course[1]}</span>
                <h3>{course[0]}</h3>
                <p>{course[2]}</p>
                <div>
                  <small>{course[3]}</small>
                  <Link href="/coming-soon?feature=Course%20enrolment">
                    View course →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell two-col align-center">
          <div>
            <span className="section-kicker">PROFESSIONAL DEVELOPMENT</span>
            <h2>Connect learning with careers and profiles.</h2>
            <p>
              Completed learning can later feed into a professional development
              record and relevant job matching.
            </p>
          </div>
          <div className="learning-path">
            <div>
              <b>01</b>
              <span>
                <strong>Choose learning</strong>
                <small>By sector, role, skill or career goal.</small>
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Complete modules</strong>
                <small>Video, reading, assessment and live sessions.</small>
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Record completion</strong>
                <small>Add completion to your VetConnect profile.</small>
              </span>
            </div>
            <div>
              <b>04</b>
              <span>
                <strong>Use in career matching</strong>
                <small>Surface relevant skills for employers.</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
