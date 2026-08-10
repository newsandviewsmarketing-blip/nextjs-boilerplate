# VetConnect Backend Phase 2 Setup

Phase 2 adds passwordless email OTP and the complete company marketplace workflow: company product submissions, administrator approval, public approved listings, product saving and information or quotation requests.

## 1. Run the Phase 2 database migration

In the existing VetConnect Supabase project open **SQL Editor** and run the complete file:

`supabase/migrations/202608090002_backend_phase2.sql`

Run it after `202608090001_backend_phase1.sql`. A successful query may report **Success. No rows returned**. Confirm these new tables appear:

- `products`
- `product_compliance`
- `product_inquiries`
- `saved_products`

Do not manually disable Row Level Security.

## 2. Configure the email OTP template

In Supabase open **Authentication → Emails → Templates** and edit the **Magic Link / OTP** template. The template must contain `{{ .Token }}`. If it only contains `{{ .ConfirmationURL }}`, Supabase sends a magic link instead of the code expected by the VetConnect screen.

Suggested subject:

`Your VetConnect Pakistan verification code`

Suggested HTML:

```html
<h2>VetConnect Pakistan verification</h2>
<p>Use this code to continue:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px">{{ .Token }}</p>
<p>This code is for your account only. Do not share it.</p>
```

## 3. Configure Gmail custom SMTP

The temporary Phase 2 sender is the Gmail account `vetconnect.official@gmail.com`.

1. Enable Google **2-Step Verification** on that account.
2. Open Google Account **App Passwords** and create an app password named `VetConnect Supabase SMTP`.
3. Copy the generated 16-character App Password once. Do not use the normal Gmail password.
4. In Supabase open **Authentication → Emails → SMTP Settings** and enable custom SMTP.
5. Enter:

| Field | Value |
| --- | --- |
| Sender name | `VetConnect Pakistan` |
| Sender email | `vetconnect.official@gmail.com` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `vetconnect.official@gmail.com` |
| Password | Google App Password, not the Gmail password |

If the dashboard/provider rejects port `465`, use port `587` with STARTTLS. Never put the App Password in GitHub, Vercel public variables or this source package.

Important: a personal Gmail SMTP account should send as `vetconnect.official@gmail.com`. Do not enter `no-reply@vetconnect.com.pk` as the sender until that address is a verified Google Workspace sender/alias or is verified with a transactional email provider. Otherwise Gmail may reject or rewrite the sender.

Official references:

- <https://supabase.com/docs/guides/auth/auth-smtp>
- <https://supabase.com/docs/guides/auth/auth-email-templates>
- <https://support.google.com/mail/answer/185833>

## 4. Authentication URL configuration

In Supabase **Authentication → URL Configuration** set:

- Site URL: `https://www.vetconnect.com.pk`
- Redirect URL: `https://www.vetconnect.com.pk/auth/confirm`
- Local redirect URL: `http://localhost:3000/auth/confirm`

## 5. Vercel variables

In the existing Vercel `vetconnect` project add or confirm these for **Production, Preview and Development**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk`

The Supabase publishable key is intended for browser use and is protected by database Row Level Security. Never add a service-role key to the browser or source.

After changing variables, redeploy without using the old build cache.

## 6. Product workflow test

1. Register a company account with a real email.
2. Enter the emailed code and open `/dashboard`.
3. Complete the company profile.
4. Sign in as the trusted administrator and approve the company in `/admin`.
5. Sign in as the company and open `/dashboard/company`.
6. Submit a product. It should show `pending` and remain absent from the public marketplace.
7. Approve and publish the product from `/admin`.
8. Confirm it appears in `/marketplace`, its detail page opens and its company profile is linked.
9. Sign in as another user, save the product and send an information or quotation request.
10. Sign in as the company and confirm the request appears in `/dashboard/company`.

## 7. Production safety

- Configure CAPTCHA before larger public traffic.
- Keep OTP request rate limits conservative.
- Do not collect payment or checkout data in this phase.
- Do not expose private compliance data, administrator credentials or service-role keys.
- Move from personal Gmail to a domain-authenticated transactional provider before high-volume production email.
