# VetConnect Team Management: editorial release acceptance

## Scope
This is a separate content management workflow for public team portfolios, not administrative login roles. Never infer a real person's role or fabricate their biography or portrait.

## Confirmed in code
- Admin sidebar: Governance & data → Team Management; link from Website Pages → Our Team.
- Admin team workspace: member list, published/draft metrics, edit, unpublish, department and hierarchy sort.
- Profile editor: original portrait upload (JPG/PNG/WebP, up to 5 MB), local preview, crop focus value, name, title, slug, display priority, biography, qualifications and responsibilities.
- Public page: category sections in order Chairman, Founder, Leadership, Management, Our Team, Advisors; uniform cards with short intro and separate profile route.
- Per-person SEO metadata and public website/LinkedIn/Facebook links.
- Admin layout: non-sticky public navigation, collapsed publishing and history panels, compact footer, only current admin navigation group expanded.

## Database migrations
- public_team_profiles_20261120 (table, policies and photo bucket)
- team_access_privileges_20261120 (anonymous records read-only at SQL grant level)
- team_profile_design_seo_20261120 (hierarchy/SEO/profile links/photo focal point)
- website editor compatibility and schema v2 repairs previously applied

## Mandatory real-session release checks
1. Log in as the actual Super Administrator. Open /admin/team and verify unauthorized users cannot access or modify it.
2. Add an approved real team member as PRIVATE DRAFT; verify the exact saved database row and that /team does not display it.
3. Upload an approved JPG, PNG and WebP on separate test drafts, ensure the image preview works, each file is under 5 MB, and no facial features are altered.
4. Edit the draft, change portrait focus, category and order, then reload and verify persistence.
5. Publish only with authorized consent and full biography, verify public page card, link and full biography.
6. Verify public meta title/description, canonical, Open Graph portrait and professional external links; check SEO indexing only for approved profiles.
7. Unpublish and verify the public /team and /team/[slug] no longer show the profile; ensure URL does not leak a draft.
8. Review desktop, tablet and mobile layouts for horizontal overflow, duplicate sticky bars, inaccessible actions or overlong cards.
9. Verify About/Terms/Privacy/Cookies website editor still saves and publishes only reviewed revisions, preserving history.
10. Run the exact-head GitHub checks and inspect Vercel preview logs. Do not merge when any check is pending/failing.

## Release position
Preview readiness or a prior-commit CI pass is not evidence that authenticated create/edit/upload/publish works. No member is to be invented or published merely to fill the design. Production merge remains blocked until the real-session workflow above passes.
