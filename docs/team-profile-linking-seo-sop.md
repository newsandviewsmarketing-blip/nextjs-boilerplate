# Vet-Connect Team Profile Linking & SEO SOP

## Editorial verification
1. Match the exact member name and claimed role with the source. Treat outdated job titles as historical. Never claim an organisation endorses Vet-Connect because it is linked.
2. Prefer the person's official faculty/staff page, their own confirmed professional profile, or a first-party report mentioning their exact name and role. A homepage alone is not proof of a role.
3. Confirm a direct HTTPS destination, relevance, live response and absence of redirects to unrelated pages. Archive/record source title, URL, reviewer and review date in the editorial issue/PR.
4. Do not add fabricated credentials, unconfirmed appointments, family details, or personal identifiers. Obtain the person's approval for new professional roles, portrait and sensitive details.
5. Use consistent brand spelling: **Vet-Connect**. Keep the public website domain and existing route slugs unchanged.

## Link types
- Internal: every public team card links to its own profile. Profile pages may link to up to three published colleagues in the same group; no drafts.
- External references: use short descriptive labels and links specifically supporting professional background, never misleading generic "Official" text.
- Social: display a LinkedIn link only when it belongs to that person; use `sameAs` only for identity profiles, not organisation homepages or third-party articles.
- Sponsored/paid links: use `rel="sponsored"`; user-generated links: use `rel="ugc"` when applicable. Do not sell or exchange ranking links.
- Do not add a blanket `nofollow` to normal editorial references.

## Structured data and SEO
- Use unique page titles, readable biographical summaries, a canonical self URL, accurate Person/ProfilePage JSON-LD and suitable accessible portraits.
- Keep one canonical profile per person, do not expose unpublished drafts, and do not add duplicate public profiles.
- Do not add structured-data fields unsupported by the visible page.
- External references may improve fact checking and navigation; no guaranteed ranking improvement.

## Release checklist
1. Review proposed diff and ensure image paths, membership data and authentication have not changed.
2. Run typecheck/build and inspect both desktop and mobile team pages.
3. Inspect one published profile with LinkedIn, one with no LinkedIn and one with verified reference links.
4. Validate structured data with Schema Markup Validator / Google Rich Results Test, without promising rich results.
5. Merge and deploy only after required CI checks succeed, then verify the public URL and response.
6. Review internal-link clicks and organic landing pages in analytics/Search Console after publishing; compare against baseline without claiming causality.
7. Recheck external references every 90 days, and immediately when a member reports changed affiliations or roles.
