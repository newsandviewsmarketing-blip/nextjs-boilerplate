# Professional workspace template

The workspace has one shared tool navigation, one active tool and a profile builder with one visible section at a time. Existing save/add/upload actions remain explicit. No new backend tables or permissions are introduced by this template upgrade.

## Add a tool or link

Edit WORKSPACE_LINKS in lib/professional-workspace.ts. Give each tool a stable ID, a clear label and one canonical internal route. Set requiresApproval for tools behind profile approval. Build the destination before exposing its link. Avoid adding aliases as extra tabs; the existing /dashboard/career/cv alias is presented as the canonical /career/cv tool. The active destination receives aria-current. Pending candidates see only available tools; an already open tool remains visible.

## Add a profile section

Add its ID, label and short hint to PROFILE_SECTIONS in the same file, then supply its panel in the typed panels object on app/dashboard/professional/page.tsx. Supply its saved-information status by ID. TypeScript requires content for every configured section, preventing an empty tab from being silently added. Route that section's form success/error message back using sectionMessage in the actions module.

Section links use /dashboard/professional?step=education, for example. Changing sections replaces the query value rather than adding a new browser history entry. Arrow navigation stops at the first/last section rather than wrapping; Home and End remain available. Existing DOM panels stay mounted while switching so in-page edits are retained. Save before submitting a different section, leaving or reloading: unsaved input is not persisted to browser storage.

## Responsive behavior

Desktop uses a sidebar and one form column. Tablet moves the section navigation above the form. Mobile uses a compact section selector and single-column form fields, with 44-pixel controls and 16-pixel field text. Reduced-motion preferences disable smooth scroll. Save instructions are collapsed behind an accessible disclosure.

Publication of this template is separate from local code completion. Authenticated browser checks at phone, tablet and desktop widths remain required before claiming that the production dashboard has been visually verified.

## One individual, several professional relationships

The /career entry is a personal profile card with three task choices: career/CV, personal professional information, and organization connections. Each reveals only its own next actions. A collapsed workspace menu is available within tools. The person is still keyed to the same authenticated user ID; the CV is a private document projection, not a second person or organization account.

The /career/connections page reads the existing company_members and clinic_members relationships through the signed-in user's access controls. It displays recorded role and status, including inactive or ended links, without converting employment text into organization permissions. Company workspace links appear only for recorded active workspace access. It does not implement new ownership claims, invitation approval or multi-company switching.

CV creation has two paths. An existing uploaded file remains private and unchanged, with links to saved originals. It is not automatically parsed into profile fields. The manual composer prefills existing account information, then shows personal details, experience, education, expertise and review one at a time. Students can omit experience; empty sections are omitted from the document. Review uses current unsaved entries; the print page uses saved entries. The common VetConnectCvSheet provides the same branded document structure for preview and printing, with a side photograph, profile location and a provenance footer. Branding is not a professional verification endorsement. No arbitrary uploaded CV text, employment or qualifications are fabricated.

Browser Print / Save as PDF is the generated-file path. Downloading a PDF automatically without a print dialog and automatic text extraction from uploaded PDFs/Word files are not implemented by this upgrade. Authenticated mobile testing, photographic rendering and printed page-break QA are still required before a production release.

## Cover letters and internships

The optional /career/cover-letter tool saves a private editable letter, with an optional non-factual starter draft. The applicant explicitly selects it on a job application; only then is a copy placed in the application's existing cover_note. Review the recipient and role before reuse. Internship/trainee/placement search is a separate optional opportunity focus. An optional guidance-interest flag is recorded without promising an appointment. These fields are persisted in the existing candidate preference record. Migration 20261101083011_private_career_cover_letter was applied and verified with RLS and no anonymous letter access. Email delivery still depends on the configuration documented in career-alert-deployment.md.
