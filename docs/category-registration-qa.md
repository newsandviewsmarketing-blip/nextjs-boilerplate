# Registration Category Onboarding - VetConnect (Draft)

## Scope
- Do not choose `veterinarian` by default. The seven self-registration category cards render distinct registration fields after selection.
- Vet: DVM or PVMC-recognized BVSc text, required PVMC practitioner registration number before OTP/account profile creation, multiple animal/practice sectors and multiple specializations.
- Student/job seeker: track (DVM, MPhil/postgraduate, PhD, job seeker), institution, college/university number, optional PVMC **student** reference. Do not treat any student number as RVMP licence.
- Allied Professionals: occupation, highest qualification, employer, sector and specialty without any presumption of veterinary practice rights.
- Clinics: facility name/type and responsible practitioner PVMC number (not auto-verified).
- Company, laboratory and animal owner: contextual fields.
- Server-side validation on OTP and password signup; after verified authentication save member practice details in existing vet/professional tables, student registration numbers in owner-only pending professional_credentials. Admin assisted student identifiers stored as private audit evidence rather than published skills.
- Member veterinarians cannot save profile without PVMC number; multiple current practice areas are kept as existing services array entries prefixed `Practice area:` (compatibility mechanism; normalized tables recommended later).

## Product & compliance limits
- Published form is not linked directly to PVMC; official registry checks remain manual. PVMC forms distinguish RVMP from college/university registration and post-graduate qualifications. No arbitrary assumed R-prefix.
- Degree selector is provisional; confirm PVMC-equivalent qualifications and recognized practitioner classes before production.
- Current form uses server URL navigation on card selection. It is not a client-side instant widget; card click selects the correct route and renders the proper form.
- OTP metadata is profile data, not an authorization source. Do not use JWT user_metadata to confer verified status or roles.
- University and student PVMC identifiers are private. A future first-class student enrolment module is recommended for edits, eligibility and retention.
- Practice areas currently use existing services[] storage, preserving backward compatibility. A future schema and filtering migration should normalize multi-sector coverage.
- Account sign-up triggers create base profiles. Post-verified OTP/email-callback persistence must be tested with an isolated Supabase staging project, including RLS and failure handling.
- No live database edit, production merge, DNS change, public veterinary verification status change, or private source exposure has been made.
