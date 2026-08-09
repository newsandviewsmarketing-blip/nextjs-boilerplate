# Deploy VetConnect Frontend to the Existing Vercel Project

## Recommended workflow

Use the existing Git repository connected to the `vet-connectpk` Vercel project. Do not create a second production project and do not change the current domain or DNS.

1. Download and extract the supplied `VetConnect-Pakistan-Complete-Frontend-v3.zip` package.
2. Open the Git repository currently connected to the VetConnect Vercel project.
3. Use the existing `vetconnect-frontend-v2` branch.
4. Back up the current repository before replacing files.
5. Copy the extracted source files into that branch. Do not copy any `.vercel` folder from another project.
6. Commit and push the branch to GitHub, GitLab or Bitbucket.
7. Vercel should automatically create a branch deployment.
8. In Vercel project settings, confirm:
   - Framework Preset: `Next.js`
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: leave blank and use the Next.js default
   - Node.js: `22.x`
9. Test the branch deployment on desktop and mobile.
10. After approval, merge the branch into the production branch already used by Vercel.

## Direct CLI deployment

If the repository is not connected to Git, install the Vercel CLI locally and run the following commands from the extracted project folder:

```bash
npm install
npm run build
npx vercel
```

Select the existing `vet-connectpk` project when prompted. Use `npx vercel --prod` only after the branch deployment has been reviewed.

## Current scope

This package contains the complete public frontend routes, including login and registration interfaces. Authentication, passwords, OTP verification, database records, moderation, bookings, uploads, email notifications and dashboard permissions will be connected during backend development.
