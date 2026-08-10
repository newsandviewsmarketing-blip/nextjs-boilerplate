import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature = "This service" } = await searchParams;
  return (
    <main>
      <SiteHeader />
      <section className="auth-section">
        <div className="single-form-shell">
          <div className="backend-form-card coming-soon-card">
            <span className="section-kicker">NEXT PLATFORM MODULE</span>
            <h1>{feature}</h1>
            <p>
              This frontend control is now connected to a clear destination. The
              related transaction workflow will be activated in its scheduled
              backend module.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/register">
                Create VetConnect account
              </Link>
              <Link className="button button-secondary" href="/">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
