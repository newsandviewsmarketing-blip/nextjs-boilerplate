"use client";

import type { FormEvent } from "react";

export default function Home() {
  function handleNotify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="email"]');
    const email = input?.value.trim();
    if (!email) return;

    const subject = encodeURIComponent("VetConnect launch — notify me");
    const body = encodeURIComponent(
      `Please notify me when VetConnect Pakistan launches.\n\nMy email: ${email}`
    );

    window.location.href = `mailto:newsandviews.marketing@gmail.com?subject=${subject}&body=${body}`;

    const status = document.getElementById("formStatus");
    if (status) {
      status.style.display = "block";
      status.textContent =
        "Opening your email app to confirm — send it and you're on the list.";
    }
  }

  return (
    <main>
      <header className="nav">
        <div className="nav-inner">
          <div className="brand">
            <img src="/logo.png" alt="VetConnect Pakistan logo" />
          </div>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#pillars">What it is</a>
            <a href="#about">About</a>
            <a href="#notify">Get notified</a>
          </nav>
          <a className="nav-cta" href="#notify">
            Get early access
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              <span className="dot" />
              Launching soon — Pakistan
            </span>
            <h1>
              Every vet in Pakistan.
              <br />
              <span>One network.</span>
            </h1>
            <p className="lede">
              VetConnect is bringing Pakistan&apos;s veterinary professionals,
              clinics, and suppliers onto a single platform — verified profiles,
              real jobs, a trusted directory of manufacturers and distributors,
              and a marketplace built for the field, not for ads.
            </p>

            <form className="hero-form" id="notify" onSubmit={handleNotify}>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@clinic.com.pk"
                required
              />
              <button className="btn-primary" type="submit">
                Notify me at launch
              </button>
            </form>
            <p className="form-note">
              No spam — one email when VetConnect goes live.
            </p>
            <p className="form-status" id="formStatus" />
          </div>

          <div className="hero-visual">
            <div className="network-card">
              <svg
                viewBox="0 0 380 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Diagram of veterinary professionals connected across Pakistani cities"
              >
                <line className="edge" x1="190" y1="150" x2="70" y2="60" />
                <line className="edge" x1="190" y1="150" x2="300" y2="55" />
                <line className="edge" x1="190" y1="150" x2="60" y2="220" />
                <line className="edge" x1="190" y1="150" x2="310" y2="230" />
                <line className="edge" x1="190" y1="150" x2="190" y2="40" />
                <line className="edge" x1="70" y1="60" x2="190" y2="40" />
                <line className="edge" x1="300" y1="55" x2="190" y2="40" />
                <line className="edge" x1="60" y1="220" x2="310" y2="230" />

                <g>
                  <circle className="node orange node-pulse" cx="190" cy="150" r="9" />
                  <circle className="node node-pulse" cx="70" cy="60" r="5.5" />
                  <circle className="node node-pulse" cx="300" cy="55" r="5.5" />
                  <circle className="node node-pulse" cx="60" cy="220" r="5.5" />
                  <circle className="node node-pulse" cx="310" cy="230" r="5.5" />
                  <circle className="node node-pulse" cx="190" cy="40" r="5.5" />
                </g>

                <text className="city-label" x="190" y="172" textAnchor="middle">
                  VETCONNECT
                </text>
                <text className="city-label" x="70" y="46" textAnchor="middle">
                  LAHORE
                </text>
                <text className="city-label" x="300" y="41" textAnchor="middle">
                  KARACHI
                </text>
                <text className="city-label" x="60" y="240" textAnchor="middle">
                  PESHAWAR
                </text>
                <text className="city-label" x="310" y="250" textAnchor="middle">
                  MULTAN
                </text>
                <text className="city-label" x="190" y="26" textAnchor="middle">
                  ISLAMABAD
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="pillars" id="pillars">
        <div className="wrap">
          <div className="section-head">
            <div className="section-kicker">What&apos;s coming</div>
            <h2>Four things the field has never had in one place</h2>
            <p>
              VetConnect is built around what a working veterinarian, clinic
              owner, or supplier actually needs day to day — not a generic
              social feed.
            </p>
          </div>

          <div className="pillar-grid">
            <div className="pillar">
              <div className="num">01</div>
              <h3>Professional profiles</h3>
              <p>
                A verified profile for every veterinarian in Pakistan —
                qualifications, experience, and specialization, built for the
                field, not general networking.
              </p>
            </div>
            <div className="pillar">
              <div className="num">02</div>
              <h3>Jobs, matched</h3>
              <p>
                Clinics and companies post real openings; AI-assisted matching
                connects the right vet to the right role, faster than a job board
                scroll.
              </p>
            </div>
            <div className="pillar">
              <div className="num">03</div>
              <h3>Verified directory</h3>
              <p>
                Manufacturers, importers, distributors, and clinics — categorized
                by specialization: antibiotics, probiotics, feed additives,
                nutraceuticals, microbiology.
              </p>
            </div>
            <div className="pillar">
              <div className="num">04</div>
              <h3>Marketplace</h3>
              <p>
                Source and sell veterinary products directly through verified
                suppliers — no middleman guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="wrap about-grid">
          <div>
            <h2>
              Pakistan&apos;s veterinary sector is large, distributed, and
              disconnected.
            </h2>
            <p>
              Vets, clinics, and suppliers are spread across every province — but
              there&apos;s never been one trusted place to find each other.
              VetConnect is built to fix that: a single, verified home for the
              people and businesses that keep Pakistan&apos;s livestock, poultry,
              and animal health sector running.
            </p>
          </div>
          <div>
            <div className="stat-row">
              <div className="stat">
                <div className="n">4</div>
                <div className="l">CORE MODULES AT LAUNCH</div>
              </div>
              <div className="stat">
                <div className="n">100%</div>
                <div className="l">VERIFIED LISTINGS</div>
              </div>
              <div className="stat">
                <div className="n">PK</div>
                <div className="l">BUILT FOR PAKISTAN</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <h2>Be first on the network when it opens.</h2>
          <p>
            Leave your email — we&apos;ll send one message the day VetConnect goes
            live.
          </p>
          <form className="hero-form" onSubmit={handleNotify}>
            <input type="email" placeholder="you@clinic.com.pk" required />
            <button className="btn-primary" type="submit">
              Notify me at launch
            </button>
          </form>
        </div>
      </section>

      <footer>
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <img src="/logo.png" alt="VetConnect Pakistan logo" />
            <span>© 2026 VetConnect Pakistan. All rights reserved.</span>
          </div>
          <div className="footer-links">
            <a href="mailto:newsandviews.marketing@gmail.com">Contact</a>
            <a href="#pillars">What it is</a>
            <a href="#notify">Get notified</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
