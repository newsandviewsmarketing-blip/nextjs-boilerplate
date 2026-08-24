import type { Metadata } from "next";
import Link from "next/link";

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

          </p>
        </div>
      </section>

      <section className="section compact-section">
        <div className="shell">

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
        <div className="spec-list">
  ...
</div>
</div>
</section>

<SiteFooter />
</main>
