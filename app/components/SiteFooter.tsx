import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <div className="footer-logo-wrap">
            <Image
              src="/vetconnect-logo.png"
              alt="VetConnect"
              width={831}
              height={274}
              unoptimized
            />
          </div>
          <p>
            Connecting verified veterinary expertise, animal owners, farmers,
            companies, careers and learning across Pakistan.
          </p>
          <div className="footer-badges">
            <span>English</span>
            <span>اردو</span>
          </div>
        </div>
        <div>
          <h3>Platform</h3>
          <Link href="/vets">Find a Veterinarian</Link>
          <Link href="/clinics">Clinics & Hospitals</Link>
          <Link href="/labs">Diagnostic Laboratories</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/jobs">Jobs & Careers</Link>
          <Link href="/learn">Learning Hub</Link>
        </div>
        <div>
          <h3>For Partners</h3>
          <Link href="/companies">Company Profiles</Link>
          <Link href="/professionals">Industry Professionals</Link>
          <Link href="/register">Veterinarian Registration</Link>
          <Link href="/register">Employer Registration</Link>
          <a
            href="https://vetnewsandviews.com"
            target="_blank"
            rel="noreferrer"
          >
            Veterinary News & Views
          </a>
        </div>
        <div>
          <h3>Connect</h3>
          <a href="mailto:info@vetnewsandviews.com">info@vetnewsandviews.com</a>
          <a href="https://www.vetconnect.com.pk">www.vetconnect.com.pk</a>
          <p className="footer-note">
            Verified public information and secure account services are
            activated module by module. Product listings are informational.
          </p>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 VetConnect Pakistan</span>
        <span>
          Veterinary • Livestock • Poultry • Pets • Dairy • Fisheries • Animal
          Health
        </span>
      </div>
    </footer>
  );
}
