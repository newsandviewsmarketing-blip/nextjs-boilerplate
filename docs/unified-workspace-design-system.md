# VetConnect Workspace Design System: one layout, independent entity permissions

Status: review implementation, 1 November 2026.

## Visual foundation
- Public VetConnect navigation belongs on public site pages only.
- Authenticated pages share one sidebar, breadcrumb/topbar, page heading, relevant identity card, and at most one context summary rail.
- Use navy/orange/white tokens, consistent cards and typography. Desktop sidebar 218–250px, mobile collapsible menu, one-column narrow forms.
- Local sections use step-tabs or anchors, not another global sidebar. Avoid duplicate CV actions.
- Canonical navigation IDs and routes live in lib/professional-workspace.ts.
- Admin navigation uses the same visual tokens, but retains permission-filtered sections and backend authorization.

## Identity and review boundaries
- Person: stable user, contact, CV, skills, education, experience, optional public profile. Self-managed, no Admin approval required to save.
- Veterinary licence: entered PVMC shows blue 'Number provided · verification pending'. Only a documented approved reviewer status may show 'PVMC credential reviewed'. A number alone is not proof.
- Clinic: separate facility ID and owner, responsible veterinarian, services/fees, hours, appointment queue and team, with separate publication review.
- Company: separate organization entity and permission-scoped members. Jobs and products never overwrite the person's profile.
- Customer/pet (future): owner consent, animal identity, clinician attribution, private medical history and access/audit controls. Appointment enquiries are not patient charts.
- Accounting (future): invoice and payment ledgers, refund records, gateway integration and reconciliation separate from service price labels.

## Canonical routes
- /dashboard: identity, phone and Pakistan location fields; role-specific information collapsible; existing server action retained.
- /career: profile and career overview; CV, job interests, cover letter, applications and organization relationships.
- /dashboard/professional: one builder with focused steps and no conflicting completion percentage.
- /career/connections: personal relationship directory to distinct clinics and companies.
- /dashboard/clinics and /dashboard/clinics/[id]: clinic ownership, services, time slots, staff and appointments with a dedicated context sidebar entry.
- /dashboard/company: authorized company context and its permissions with a separate identity card.
- /admin: restricted management with same design language, not shared permissions.

## Security principles
- Navigation visibility is never an authorization decision. Check all actions, ownership and Supabase RLS.
- Core personal completion is not veterinary registration verification or clinic readiness.
- No public clinic publication before separate Admin review; preserve all existing records until staging security tests pass.
- Use canonical master data for professions, education institutions, locations and services; ambiguous fuzzy results must never silently merge distinct records.

## Release QA
- Exact-head automated lint, source tests, TypeScript and production build.
- Authenticated owner/staff/admin and non-DVM journeys, including collapsed form required-field validation.
- 360px, tablet and desktop visual/keyboard reviews with no double header, broken sidebars or horizontal overflow.
- Clinic publication database-migration and RLS gate review is a separate blocker; do not deploy dependent clinic logic without it.