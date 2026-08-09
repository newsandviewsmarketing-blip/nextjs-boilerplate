# VetConnect Pakistan Complete Frontend V3

Audited, Vercel-ready Next.js source for the VetConnect Pakistan public frontend.

## Included routes

- `/` — homepage and platform overview
- `/vets` — veterinarian directory
- `/companies` — company directory
- `/marketplace` — product and marketplace interface
- `/jobs` — jobs, employers and candidate profiles
- `/learn` — learning hub and courses
- `/login` — login interface
- `/register` — role-based registration interface

Shared navigation and footer components are stored in `app/components`.

## Local setup

```bash
npm install
npm run audit
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Vercel

Use the existing Git repository and existing VetConnect Vercel project. Follow `docs/VERCEL-DEPLOYMENT.md`. Do not upload this ZIP itself to GitHub; extract it and upload the files and folders inside it.

## Scope and authentication status

This package contains the complete public frontend and all listed page routes. The login and registration screens are included as frontend interfaces. Secure account creation, passwords, OTP verification, sessions, databases, uploads, moderation and role-based dashboards still require backend integration. Never store passwords, API keys or `.env` files in GitHub.

## Audit record

See `docs/FRONTEND-AUDIT.md`. The package includes `npm run audit` to check the required structure before deployment.
