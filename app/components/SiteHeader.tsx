import Link from "next/link";
import Image from "next/image";
import MobileNav from "./MobileNav";

const navItems = [
  ["Find a Vet", "/vets"],
  ["Clinics", "/clinics"],
  ["Diagnostic Labs", "/labs"],
  ["Marketplace", "/marketplace"],
  ["Jobs", "/jobs"],
  ["Learn", "/learn"],
  ["Companies", "/companies"],
  ["Professionals", "/professionals"],
] as const;

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-row">
        <Link className="brand" href="/" aria-label="VetConnect home">
          <Image
            src="/vetconnect-logo.png"
            alt="VetConnect"
            width={831}
            height={274}
            priority
            unoptimized
          />
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <a
            href="https://vetnewsandviews.com"
            target="_blank"
            rel="noreferrer"
          >
            VNV News
          </a>
        </nav>

        <div className="header-actions">
          <Link className="text-link" href="/login">
            Sign in
          </Link>
          <Link className="button button-small button-primary" href="/register">
            Join VetConnect
          </Link>
        </div>

        <MobileNav items={navItems} />
      </div>
    </header>
  );
}
