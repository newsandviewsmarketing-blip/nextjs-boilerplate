import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import {
  PUBLIC_INFORMATION, PUBLIC_INFORMATION_LINKS, PUBLIC_INFORMATION_UPDATED,
  PUBLIC_INFORMATION_VERSION, type PublicInformationSlug, type PublicInformationContent,
} from "@/lib/public-information";
import styles from "./PublicInformation.module.css";

const contact = "vetconnect.official@gmail.com";

function Paragraph({ text }: { text: string }) {
  return <p>{text.split(contact).map((part, index) => <span key={index}>
    {index > 0 ? <a href={"mailto:" + contact}>{contact}</a> : null}{part}
  </span>)}</p>;
}

export default function PublicInformationPage({ slug }: { slug: PublicInformationSlug }) {
  const page: PublicInformationContent = PUBLIC_INFORMATION[slug];
  return <>
    <SiteHeader />
    <main id="public-information" className={styles.main}>
      <div className="shell">
        <Link href="/" className={styles.homeLink}>Back to VetConnect</Link>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>VETCONNECT PAKISTAN</p>
          <h1>{page.title}</h1>
          <p className={styles.description}>{page.description}</p>
          <p className={styles.version}>Last updated <time dateTime={PUBLIC_INFORMATION_UPDATED}>1 November 2026</time> · Version {PUBLIC_INFORMATION_VERSION}</p>
        </header>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="About and policies">
              {PUBLIC_INFORMATION_LINKS.map(item => <Link key={item.slug} href={"/" + item.slug}
                aria-current={item.slug === slug ? "page" : undefined}>{item.label}</Link>)}
            </nav>
            <div className={styles.contact}>
              <h2>Questions or corrections?</h2>
              <p>Contact the VetConnect team.</p>
              <a href={"mailto:" + contact}>{contact}</a>
            </div>
          </aside>
          <article className={styles.article} aria-label={page.title}>
            {page.sections.map((section, index) => <section key={section.title} aria-labelledby={"information-section-" + index}>
              <h2 id={"information-section-" + index}>{section.title}</h2>
              <Paragraph text={section.body} />
              {section.links ? <ul className={styles.sectionLinks}>{section.links.map(link => <li key={link.href}>
                {link.href.startsWith("/") ? <Link href={link.href}>{link.label}</Link> :
                  <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>}
              </li>)}</ul> : null}
            </section>)}
            <nav className={styles.related} aria-label="Related information">
              <h2>Related information</h2>
              <div>{PUBLIC_INFORMATION_LINKS.filter(item => item.slug !== slug).map(item =>
                <Link key={item.slug} href={"/" + item.slug}>{item.label}</Link>)}</div>
            </nav>
          </article>
        </div>
      </div>
    </main>
    <SiteFooter />
  </>;
}
