# Registration Category Onboarding - VetConnect (Draft)

## Registration steps
- The seven public category cards keep the veterinarian path separate; no category is preselected.
- Email confirmation is followed by a required identity and evidence step. Until it is completed, users are redirected to `/register/complete` from their dashboard.
- Every account submits a CNIC number plus front and back images.
- Veterinarian: DVM or applicable PVMC-recognized BVSc qualification, PVMC practitioner number, degree certificate and PVMC registration proof; multiple practice areas/specializations remain supported.
- Student: university/college registration details and current student card or enrollment letter. Job seeker: highest degree/qualification certificate. An optional PVMC student reference is not an RVMP licence.
- Allied professional: highest qualification/degree evidence.
- Company/employer: company registration or NTN evidence.
- Clinic/hospital: clinic/business evidence and responsible veterinarian's PVMC proof.
- Laboratory: registration, licence or accreditation evidence.
- Animal owner/customer: CNIC identity evidence.
- Files accept PDF, JPG, PNG or WebP, up to 8 MB each. The server validates required files, declared type and file signature before storing them in the private `registration-evidence` bucket. Evidence rows are owner-only; the files are not exposed on public profiles.
- The database migration is additive and must be applied to an isolated staging project before exercising the upload flow. It has not been applied to production.
- Category data is persisted only after the required evidence is submitted. Uploaded records start with `pending` verification status; upload does not grant a licence, approval or publication.
- Student references remain owner-only pending `professional_credentials` and are never treated as practitioner licences. Admin-assisted student identifiers remain private audit evidence.
- Member veterinarians still need a PVMC number to save their profile. Multiple practice areas remain in the existing `services[]` structure using `Practice area:` prefixes for compatibility.

## Product, privacy and release limits
- The registration form does not connect to PVMC. Official registry checks remain manual. Do not guess the format of PVMC student references.
- CNIC and evidence are sensitive personal information. Keep the storage bucket private and do not put CNIC values, document URLs, or file contents in auth metadata or public profiles.
- The current draft stores CNIC number and document metadata in `registration_evidence`; RLS permits the account owner to read its own records and upload pending records. A dedicated admin evidence review UI and retention policy are still required before production.
- Degree equivalencies and recognized veterinary qualifications must be confirmed with PVMC before production.
- Use an isolated Supabase staging project to test OTP confirmation, password confirmation, file signatures and size limits, upload failure cleanup, category persistence, and RLS. Do not use real CNICs or credentials in development screenshots.
- The existing public veterinary verification state still requires the separate PVMC integrity release gates. This draft does not change current approval or publication status.
- No live database edit, production merge, production deployment, DNS change, or live user data change is included.
