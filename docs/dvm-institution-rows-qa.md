# Qualification and institution rows

Each primary/current qualification is immediately followed by its own awarding institution. Additional completed degrees use the same pair of fields and a small remove control. Native selects and a two-column layout collapse to a single column at 640px, with touch-sized actions. The institution is no longer separated from the primary degree by the additional-degree section or PVMC number.

## Institution reference
`public/data/pvmc-dvm-institutions.json` contains all 20 numbered DVM institution/campus entries on the user's supplied PVMC page, checked 31 October 2026. Central IDs/names/source row/checked date and review notes can be updated in that file without changing the UI component. It is a reviewed reference snapshot, not an automatically synchronized accreditation service or a new admin CRUD screen.

The PVMC list applies only when the row is a DVM (including the full title/custom D.V.M spelling). MPhil, PhD, animal husbandry, poultry science, diplomas and other qualifications retain a free-text institution. DVM has both International and Other/unlisted selections, each revealing one required full-name field. These choices describe the institution, not the applicant's nationality. Campus entries remain distinct. Three source-listed fall-2025 admissions restriction notes and Swat's listed DVM start date are retained as reviewer context; listed, international and unlisted selections never approve an applicant or admission cohort.

Server validation converts institution IDs to canonical names, rejects forged IDs, requires custom institution names, and retains source markers with correctly paired degree/institution arrays. Existing authenticated drafts remain readable.

## PVMC pending-number route
A completed veterinary-degree applicant can explicitly mark the practitioner number not yet available to save education as a private draft. This does not confer registration or a practice badge. A veterinarian cannot finally submit through the completion action without a number and still needs the existing private credential evidence and administrator review. The completion draft supports adding the number later. Current DVM students do not need a practitioner number for their ongoing program; a separate completed DVM does require a number or the explicit pending-number declaration. Non-veterinary education does not acquire a PVMC requirement.

## Validation and boundaries
Behavioral tests cover all reference selections, DVM-only dropdown validation, custom/international institutions, non-DVM open fields, degree/source alignment, a pending-number draft and refusal to finally submit it. Keep the existing security, resume and privacy tests. Run final-head CI/build, and inspect actual desktop/tablet/mobile rendering before release. Local automated browser installation was blocked by a truncated browser download, and the cloud browser cannot reach the local development server; do not claim viewport QA from source/CSS checks alone.

No database schema, stored user records, domain routing, recognition status or live practitioner approvals are changed by this branch. Existing registration database setup remains a separate deployment prerequisite.
