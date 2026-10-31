# Registration corrections, 31 October 2026

## Changes
- Registration separates province/territory from city/town. Cities are filtered to the selected province, province changes clear the city, and server validation rejects mismatched pairs.
- Dashboard and assisted-entry administrative fields use the bundled hierarchy instead of an external runtime fetch, so a network failure cannot remove their standardized dropdowns.
- Registration supports a primary qualification plus up to ten additional completed degrees, each with its awarding institution and a remove control. Qualifications persist in private registration details. Candidate/allied additional degrees also save as private education records; veterinarian qualification summaries retain additional titles.
- A completed DVM/recognized veterinary qualification requires a practitioner PVMC number, including when submitted as an additional degree on candidate/allied pathways. A current student program alone does not require a practitioner number. Non-veterinary MPhil/PhD holders do not need one. A student who separately declares a completed DVM does need one. A student's institutional registration remains required; an optional PVMC student reference is distinct from a practitioner number.
- Fixed the PVMC validation character class, which could reject hyphenated numbers. Fixed an overescaped control-character filter affecting saved clinic cities.
- Fixed the assisted veterinarian form/validator mismatch: it previously submitted `qualifications` while the validator expected `qualifications_choice`, and had no awarding-institution field. It now shares the qualification component and stores validated degree titles.
- Missing registration records/storage query failures suppress draft/upload controls and display a support message. A registration-completion error boundary provides a retry/sign-in path for unexpected rendering failures. This is error handling, not a database deployment.

## Verification
Actual production-module tests cover every reference province/locality pair, invalid pairs, completed DVM across categories, non-veterinary qualifications, current students, additional-degree requirements, custom veterinary degree text, missing institutions, row bounds, removal and veterinarian persistence. The existing security and source tests remain included.

## Current release blockers
A read-only check of Supabase project `oflwhfptrorsjvhlofrn` on 31 October found no `registration_profile_details`, `registration_completion_gate`, `registration_evidence`, private `registration-evidence` bucket, or `complete_registration_submission`/`review_registration_submission` functions. The existing registration migrations still need review/application and isolated authenticated tests. No production database writes are included in this change.

Vercel reports PR #46's production deployment READY at commit `6f64cf49dbacf785c74ec085384be25be75516fc`. The queried 24-hour runtime-error window returned no errors for `/register/complete` and `/verify-email`. That does not establish the cause of the supplied browser error. The connector could not fetch `https://www.vetconnect.com.pk/register/complete`, so the user's authenticated path has not been reproduced.

Before release, verify the exact final-head CI/preview, correct project/domain/database mapping, then test OTP, same-email resume, private evidence/RLS, submit, rejection/resubmit, approval, public listings and company job/product gates in isolated staging. Approval remains manual; no input or extra degree confers a verified practitioner badge. Existing records are not deleted or reclassified.
