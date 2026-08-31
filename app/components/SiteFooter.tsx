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
            rel="noopener noreferrer"
          >
            Veterinary News & Views
          </a>
        </div>

        <div>
          <h3>Connect</h3>

          <a href="mailto:vetconnect.official@gmail.com">
            vetconnect.official@gmail.com
          </a>

          <a
            href="https://www.vetconnect.com.pk"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.vetconnect.com.pk
          </a>

          <div className="footer-socials" aria-label="VetConnect social media">
            <a
              className="footer-social-link"
              href="https://www.facebook.com/VetConnect.Digital"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VetConnect on Facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 22v-9h3l.45-3.5H13.5V7.25c0-1.01.28-1.7 1.73-1.7H17V2.42c-.31-.04-1.38-.13-2.62-.13-2.6 0-4.38 1.59-4.38 4.5V9.5H7v3.5h3v9h3.5Z" />
              </svg>
            </a>

            <a
              className="footer-social-link"
              href="https://www.linkedin.com/company/vet-connectofficial/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VetConnect on LinkedIn"
              title="LinkedIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5.2 8.4H2V22h3.2V8.4ZM3.6 2A1.86 1.86 0 1 0 3.6 5.72 1.86 1.86 0 0 0 3.6 2ZM8.3 8.4H11.4v1.86h.05c.43-.82 1.5-2.12 3.88-2.12 4.15 0 4.92 2.73 4.92 6.28V22h-3.24v-6.72c0-1.6-.03-3.67-2.24-3.67-2.24 0-2.58 1.75-2.58 3.55V22H8.3V8.4Z" />
              </svg>
            </a>

            <a
              className="footer-social-link"
              href="https://wa.me/923007600037"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with VetConnect on WhatsApp"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.52 3.48A11.82 11.82 0 0 0 12.09 0C5.56 0 .25 5.31.25 11.84c0 2.09.55 4.13 1.59 5.93L.16 24l6.37-1.67a11.83 11.83 0 0 0 5.55 1.42h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.13-3.41-8.43ZM12.09 21.75h-.01a9.79 9.79 0 0 1-4.99-1.37l-.36-.21-3.78.99 1.01-3.69-.23-.38a9.81 9.81 0 1 1 8.36 4.66Zm5.38-7.36c-.29-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.64.07-.29-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.03 1.01-1.03 2.47s1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.75-.72 2-1.41.24-.69.24-1.28.17-1.4-.07-.13-.27-.2-.56-.35Z" />
              </svg>
            </a>
          </div>

          <p className="footer-whatsapp-number">
            WhatsApp:{" "}
            <a
              href="https://wa.me/923007600037"
              target="_blank"
              rel="noopener noreferrer"
            >
              0300 7600037
            </a>
          </p>

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
