# VetConnect Homepage Master Blueprint: Implementation Contract

**Design reference:** VetConnect annotated homepage blueprint supplied 23 November 2026.  
**Scope:** homepage and public discovery only. No changes to production Supabase tables, RLS, private document storage, authorization or identity.

## Core proposition
**Connecting certified veterinary expertise with farmers, animal owners and industry.**

Explain in one paragraph: VetConnect connects registered veterinarians, industry professionals, clinics, farms, animal owners, companies, jobs and verified published product information across Pakistan. VetConnect profile approval and PVMC credential verification are distinct; not all veterinarians offer clinical appointments.

## Desktop information architecture (top to bottom)
1. **Header:** one compact branded navigation with Vet, Clinics, Labs, Marketplace, Jobs, Companies, Professionals, learning and account access. Do not duplicate sticky navigation in content.
2. **Hero:** proposition + supporting text + Find a Vet and Browse Jobs links. A documentary-style illustrative portrait can show a Pakistani female veterinary professional with cow, chicken and optionally a cat/dog. Label such creative imagery as illustration; don't impersonate registered doctors or use generated faces as profile records. Use the user's actual VetConnect logo unchanged.
3. **One Quick Search:** 5 tabs in one accessible horizontal row (Find a Vet, Clinics, Professionals, Marketplace, Jobs). Fields swap with selection. Location, sector/specialization and keyword route to supported public directories, not private records.
4. **Connected services:** four tidy visual tiles for veterinary expertise, professional consultants, clinics, and diagnostics. Real approved public profile photos/logos are permitted; don't invent lab records or online availability. Labs link to directory if empty.
5. **Jobs:** latest genuinely published current opportunities, compact 3 cards on desktop, horizontal swipe on mobile, followed by CV / vacancy action panel. No empty repeated sector widgets.
6. **Companies & Marketplace:** authentic published company logos. A visual category strip for Vaccines, Medicines, Feed & Nutrition, Supplements, Equipment. Categories are navigation, not proof of in-stock approved products. Separate approved published product cards and honest empty state. Product photos only from genuine approved listings.
7. **Explore VetConnect:** compact eight destination tiles (Vets, Clinics, Labs, Professionals, Companies, Marketplace, Jobs, Vets Guide). Avoid duplicating the hero calls to action.
8. **AdSense placement:** one labeled, nonintrusive responsive reserved area before footer, adhering to site approval and publisher rules. No fake live ads and never obscure CTAs/navigation.
9. **Footer:** one consolidated copyright, help/policies, contact and social links.

## Mobile
- Widths 320, 375, 412px must not cause page-wide horizontal overflow.
- Header readable, mobile menu accessible, no overlap with Hero/Quick Search.
- Quick Search categories remain a single horizontally scrollable row.
- Main hero concise; selected search fields stack as necessary, with tap sizes >= 40px.
- Services grid 2 columns or single column at 320px, always without truncating labels.
- Jobs scroll horizontally with snap, with keyboard-accessible controls and reduced-motion support.
- Marketplace categories and directory tiles horizontal scroll, without forcing the document width.
- Avoid oversized vertical gaps or duplicate sections.

## User roles and data integrity
- **Practising Vets:** clinical service/search eligibility comes from actual listed services; never infer booking status from vet credentials.
- **Professional Vets:** industry, research, academia, pharmacy, poultry/dairy and consultancy expertise without automatic clinical-booking badges.
- **Consultants:** public availability only when a separately backed service explicitly supports it; never call all profiles “online now”.
- **Clinics:** public approved clinic profiles; photos or logos only when authorized/published.
- **Labs:** directory entry point if no public approved records, not invented laboratory photos/names.
- **Companies:** public approved company directory; no unapproved businesses.
- **Products:** only approved+published product listings. Empty data means show categories and an accurate notice.
- **Jobs:** use published current jobs and explicit job-seeker / employer routing.
- **Alumni:** future opt-in module, not represented as launched.

## Visuals & brand
- Palette: navy #0B1E38, orange #FF8A00, pale blue #F5F7FB, white #FFFFFF.
- Typography: clean accessible Sans; consistent hierarchy and 16px-ish readable body on desktop.
- Real Pakistani people in generated *illustrations* only, not substituted identity photos. Any actual professional photograph must remain unchanged and follow permission/publication controls.
- Include cow + chicken/poultry in illustrative creative asset; optional cat and dog where visually appropriate. No generative face transformation of a real uploaded person's portrait.
- Prefer purposeful illustrations/real owner-approved thumbnails to decorative stock filler.

## QA/release
- Run GitHub CI and Vercel Preview checks and visually inspect 320/375/412 mobile and desktop before merge.
- Verify tab forms go to effective filters; no user auth regression, no private document exposure, no invented verification.
- Check image licensing and safe treatment of user-supplied photographs.
- Verify accessible headings, keyboard scroll, responsive tap targets, alt text and empty states.
- Verify ads.txt and AdSense publisher tag unchanged. Do not infer that monetization is approved merely because an ad slot exists.
- Keep this PR as draft until review and verification; do not deploy unstable modifications directly to production.

## Future improvements after this PR
- Improve directory results filters, practising-vs-professional services, consultation/contact flows and institution/alumni directory in separate safe changes.
- Replace decorative category emojis with branded photographs/icons after asset approval, and add the specifically requested Pakistani professional/cow/chicken illustrations as vetted media assets.
