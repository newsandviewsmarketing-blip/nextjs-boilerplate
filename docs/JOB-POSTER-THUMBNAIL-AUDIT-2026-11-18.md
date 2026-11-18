# Job thumbnails and sector audit — 18 November 2026

## Scope and design
- Home page Latest Openings: display the actual approved job artwork in a unified 4:5 thumbnail beside each job's own title, employer, sector, location and destination.
- Jobs & Careers listing: replace numbered squares with a consistent, clickable thumbnail. Preserve the original individual job ID and slug.
- Images of any portrait/square resolution are rendered using `object-fit: contain` and `object-position: center`. No crop, stretch, recolor, compression of originals, or migration of existing media.
- A neutral fallback is shown when there is no approved poster or when the image request fails.
- Existing image storage, permissions, 5 MB upload validation, admin review and detail-page original-poster display remain unchanged.
- The public `/api/jobs/[id]/advertisement` endpoint remains the only source for poster bytes; it checks public visibility, approval, publication, MIME type and deadline.

## Sector data caveat
The home page and Jobs listing currently classify a job as "Sector pending classification" unless its `sector` exactly matches an active `master_data_items` label in category `job_sector` (case-insensitive). This branch also trims whitespace in matching. It does **not** guess a sector from a job title, reassign unpublished data, or modify existing sector masters. Admin must verify/migrate the existing 3 unclassified job sectors to canonical approved labels before Poultry or Marketing filter counts can become nonzero. Sectors remain independent of job identity.

## Safety and side effects to review
1. New media metadata query reads only IDs returned from public_jobs. Public image links still use the existing approval-gated endpoint. No private supporting documents are exposed.
2. The home page image metadata query is capped by the existing ten-current-jobs view; Jobs listing currently reads poster metadata for all open jobs. Revisit pagination at larger scale to limit DB/media reads.
3. Additional thumbnail requests add network demand: monitor response time, signed URL expiry/cache and bandwidth for high-volume pages.
4. Next/Image uses `unoptimized` to avoid transforming the original advertisement. Browser rendering scales the image within a 4:5 frame but leaves the source intact.
5. Images lacking approved media are rendered with a neutral per-job placeholder; a failed image request also falls back without showing a broken icon.
6. Existing forms, jobs, applications, PVMC data, storage tables and permissions are unchanged. No SQL migration is needed.
7. The source file upload limit remains 5 MB. Not every image format is accepted; currently JPG/PNG/WebP only.

## QA acceptance checklist (requires preview environment and test data)
- Homepage: latest 1–10 approved jobs, correct date ordering, unique titles, company names, IDs, destinations and image/fallback.
- Jobs listing: desktop/mobile/tablet alignment, search/filter/pagination, job link accuracy, and no numbering squares.
- Images: JPG/PNG/WebP with 1080x1080, 1080x1320, 1080x1350 and tall/small source sizes; verify no crop and fully legible original artwork on detail page.
- Access: rejected, expired, unpublished jobs and private supporting files must not show through poster endpoint.
- Failures: missing asset, invalid MIME, denied storage or network failure must display placeholder without breaking the card.
- Filters: after admin approval of real sector data, all related sector counts and job selections match across home and Jobs pages.
- Run repository lint, typecheck, unit/source tests and preview build; inspect Vercel preview before production merge.

## Deployment
Draft PR only. No production deployment, database changes, or automatic merge. Review existing jobs that say "Sector pending classification" in admin panel as a separate audited data step.
