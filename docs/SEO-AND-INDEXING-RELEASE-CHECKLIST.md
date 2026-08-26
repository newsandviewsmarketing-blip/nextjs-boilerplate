# SEO and indexing release checklist

This package adds a safer baseline for search discoverability without changing the VetConnect visual identity.

## Included in this release candidate

- `metadataBase` tied to `NEXT_PUBLIC_SITE_URL` with production fallback `https://www.vetconnect.com.pk`
- route-specific titles/descriptions/canonical URLs for primary public directories
- dynamic metadata for veterinarian, professional, clinic, laboratory, company, product and job detail pages
- sample/demo detail pages set to `noindex`
- `robots.ts` blocking admin/auth/dashboard areas
- `sitemap.ts` for primary public directory routes
- PWA `manifest.ts`
- improved alt text plus lazy/async loading for database product/company/profile images without altering the image files

## Before production

- [ ] Confirm `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk` in Vercel Production.
- [ ] Confirm the production domain redirects consistently to one canonical host.
- [ ] Open `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` in Preview.
- [ ] Verify every public detail page returns a unique title and canonical URL.
- [ ] Ensure sample/demo profiles remain `noindex`.
- [ ] Do not index dashboard, admin, login, registration or private-document URLs.
- [ ] Confirm important public pages are server-rendered and accessible without authentication.
- [ ] Confirm internal navigation links to Vets, Clinics, Labs, Companies, Marketplace and Jobs are crawlable.
- [ ] After production, submit/refresh the sitemap in Google Search Console.
- [ ] Monitor Indexing, Core Web Vitals and 404 reports after release.

## Content-quality rule

SEO metadata must be generated only from public, approved fields. Never place private registration numbers, personal phone/email data, CV contents, regulatory evidence paths or internal review notes in metadata or structured-data output.
