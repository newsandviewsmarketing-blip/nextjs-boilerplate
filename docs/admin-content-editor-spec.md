# Website content editor

Implementation: /admin/website. Admin > Administration > Website pages.

Editable pages: About Us, Team, Terms, Privacy and Cookies. Fields: page title, introduction, version/date, SEO title/description, ordered sections, paragraphs and public source links. Plain text only; no executable HTML.

Permissions:
- site_content.edit grants private draft editing and history/restore.
- site.manage grants editing and explicit publication. It is already present in the deployed database's super_admin role permissions; the application registry now matches it.
- No actual user permission grants are made. Existing per-user revocations and active-account database checks apply on every action.
- Save and publish are separate server actions. Editors cannot publish through the UI, server action or publication-table RLS.

Persistence uses the existing site_content_drafts, site_content_publications and site_content_history tables and revision-checked RPCs. SQL compatibility upgrade: docs/sql/website-content-editor-upgrade.sql. It extends validation for schemaVersion 2, SEO and safe links, and adds draft-only permissions. Existing publications and history remain untouched. No user data is seeded or republished.

The public page and metadata load only published schema-2 documents. Legacy database snapshots predate the newer reviewed source and do not replace it automatically. In the editor, a legacy draft starts with the current reviewed source; saving explicitly creates the new-format draft. Existing historical documents can be restored into a new-format draft without changing the public page. A changed public document requires a new version. Restore preserves history and creates a new draft; publication remains explicit.

Validation:
- Behavioral tests cover all five source documents, invalid date/schema/slug/HTML, unsafe and signed links, immutable history conversion, unauthenticated/revoked/database-denied actions, draft-only permissions and stale/unreviewed publication.
- Run full repository CI at the final head.
- Verify database schema/document compatibility and anonymous/applicant/editor/publisher RLS using rollback-only checks; do not claim authenticated browser QA without it.
- Browser/mobile QA and a real owner save/preview/publish/restore cycle remain required for complete acceptance.
- No registration, CV, product, medicine or clinical-record workflows are changed.

When backend reads fail, public routes fall back to the reviewed source text. This is not a guarantee to retain every latest database publication through an outage; infrastructure backups and recovery remain separate. Publishing updates the matching public route and metadata; it does not record user agreement to a policy. Drafts and history are never public or included in the sitemap.

## Database attempt
The additive compatibility migration was submitted through the Supabase connector during this task. Its native confirmation expired after two minutes. Follow-up inspection is required; do not claim this upgrade applied or the editor operational. Do not bypass the expired confirmation by issuing the same DDL through execute_sql. Existing published wording was not changed by this attempt.
