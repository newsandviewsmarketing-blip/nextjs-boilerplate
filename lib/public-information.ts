import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const PUBLIC_INFORMATION_VERSION = "2026-11-01.1";
export const PUBLIC_INFORMATION_UPDATED = "2026-11-01";
export const PUBLIC_INFORMATION_LINKS = [
  {
    "slug": "about",
    "label": "About Us"
  },
  {
    "slug": "team",
    "label": "Our Team"
  },
  {
    "slug": "terms",
    "label": "Terms of Use"
  },
  {
    "slug": "privacy",
    "label": "Privacy Notice"
  },
  {
    "slug": "cookies",
    "label": "Cookies & Storage"
  }
] as const;

export const PUBLIC_INFORMATION = {
  "about": {
    "title": "About VetConnect",
    "description": "Connecting people, information and opportunities across Pakistan’s veterinary and animal sectors.",
    "sections": [
      {
        "title": "Our purpose",
        "body": "VetConnect Pakistan brings together veterinary professionals, students, allied professionals, animal owners, farmers, clinics, laboratories, companies and employers. The platform provides directory information, career opportunities, learning resources and relevant business listings."
      },
      {
        "title": "Mission and objectives",
        "body": "Our mission is to make relevant information easier to find and help people present their qualifications and services accurately. Our objectives are to support responsible professional connections, education, careers and business information, while respecting personal information and providing a clear correction route."
      },
      {
        "title": "Independence",
        "body": "VetConnect is an independent platform. It is not PVMC, a university or a government authority. Links to regulators and institutions do not imply their endorsement or a partnership. A profile, company or product label refers only to its stated review scope."
      },
      {
        "title": "Contact",
        "body": "For platform information, corrections or a request for operator and formal-notice details, contact vetconnect.official@gmail.com. This website uses the service name VetConnect Pakistan. No company registration or government affiliation is implied by that name."
      },
      {
        "title": "Animal emergencies",
        "body": "A directory or educational article is not a clinical consultation. Contact an appropriately qualified veterinary practitioner directly for an animal emergency. Platform messages are not an emergency response service."
      }
    ]
  },
  "terms": {
    "title": "Terms of Use",
    "description": "Responsibilities for accounts, submissions and use of VetConnect.",
    "sections": [
      {
        "title": "Using the platform",
        "body": "These terms apply to www.vetconnect.com.pk, referred to as VetConnect Pakistan. Read them with the Privacy Notice and any policy presented for the feature you use. Contact vetconnect.official@gmail.com for questions or formal-notice arrangements. Mandatory legal rights and remedies remain available."
      },
      {
        "title": "Accounts and accuracy",
        "body": "Provide accurate details, use only accounts and organisations you are authorised to represent, and protect your login codes. Do not impersonate others, upload forged evidence, publish unlawful or misleading content, scrape private information, misuse CVs or interfere with the service. If you cannot lawfully agree to these terms yourself, contact support before creating an account."
      },
      {
        "title": "Professional and commercial activities",
        "body": "Users are responsible for relevant professional registrations and business authorisations. VetConnect does not confer permission to practise. Independent practitioners, employers and suppliers are responsible for their own services and claims; VetConnect remains responsible for its own conduct and applicable obligations. A listing is not a guarantee of treatment, employment, product safety or commercial performance."
      },
      {
        "title": "Content rights",
        "body": "You retain ownership of your submissions. For material you request us to publish, you grant a non-exclusive licence to host, format and display it for that purpose. You must have authority for third-party content and personal information. This public-content licence does not make private evidence or CVs public. Publication-removal requests remain subject to legitimate preservation of records and applicable requirements."
      },
      {
        "title": "Moderation and complaints",
        "body": "We may restrict content or access reasonably necessary for suspected fraud, safety, credible rights complaints, legal obligations or breaches of these terms. Where appropriate, we will explain the decision and consider a review request; urgent restrictions may precede notice. Email vetconnect.official@gmail.com with the page URL and a concise explanation to request a correction or review."
      },
      {
        "title": "Fees and payments",
        "body": "Registration and verification are currently PKR 0, free of cost. Any future paid service must present its price, scope, cancellation and refund terms before purchase. Do not pay an undisclosed registration fee to someone claiming to represent VetConnect."
      },
      {
        "title": "Availability, liability and disputes",
        "body": "We do not guarantee uninterrupted service or the accuracy of every third-party submission. Nothing in these terms excludes responsibility that cannot lawfully be excluded, or prevents access to a competent court or authority. Pakistani law applies, subject to mandatory applicable protections. Informal resolution is encouraged but is not a precondition that removes legal remedies."
      },
      {
        "title": "Changes",
        "body": "The version and date on this page identify this text. Material changes should be communicated through the affected service and renewed agreement obtained where required. Changes do not retrospectively remove accrued rights."
      }
    ]
  },
  "privacy": {
    "title": "Privacy Notice",
    "description": "How account, profile, verification and recruitment information is handled.",
    "sections": [
      {
        "title": "Scope and contact",
        "body": "This notice covers information used through VetConnect Pakistan. Contact vetconnect.official@gmail.com for access, correction, deletion, publication choices or a privacy concern. We may ask for proportionate information to verify a request. Do not send passwords, OTPs or full identity-document scans by ordinary email."
      },
      {
        "title": "Information and purposes",
        "body": "Information may include your name, email, telephone, location, account type, education, institution, experience and selected profile details. The features you use may request professional-registration evidence, business details, documents, CVs or job applications. These support authentication, requested profiles and applications, verification, communications, moderation and abuse prevention."
      },
      {
        "title": "Public and private information",
        "body": "Profile and business information approved for directory display can be public. Review the fields and visibility offered by the feature before submission. Certificates, CNIC scans, internal review notes and CV files are not intended for public-directory display. Report any unexpected exposure immediately. Do not include identity numbers or private documents in a public biography."
      },
      {
        "title": "Recruitment",
        "body": "A CV submitted for a particular job is for that application and the authorised receiving employer, with necessary platform-support access. Employers must not sell it, publish it or reuse it for unrelated marketing. A future talent-pool or marketing choice must be separate from the application itself."
      },
      {
        "title": "Providers and disclosures",
        "body": "The platform uses hosting and database/authentication services, including Vercel and Supabase. Email features may use an email-delivery provider when configured. Service-provider processing can involve locations outside Pakistan. Contact us for information about the providers relevant to your request. We may make proportionate disclosures for applicable legal requirements or substantiated security matters."
      },
      {
        "title": "Choices and retention",
        "body": "Registration is not blanket permission to sell personal data, publish every field or send optional marketing. Request correction, removal from public display, cessation of optional communications or deletion through support. Retention depends on the purpose, account status, security needs, applicable duties and documented disputes. Deletion from live systems may precede expiry from protected backups. We explain limitations where a request cannot be fully met."
      },
      {
        "title": "Security and younger users",
        "body": "No online service can guarantee absolute security. Report suspected misuse promptly. Do not upload unnecessary sensitive information or another person’s records without authority. Parents or guardians should contact us about suspected unauthorised accounts involving younger users. We will assess appropriate restrictions or removal."
      },
      {
        "title": "Related notices",
        "body": "The Cookies Notice describes authentication storage and browser drafts. Selecting a qualification or institution does not automatically verify professional registration or permission to practise. This notice does not claim certification under a privacy standard or a universal breach-notification deadline."
      }
    ]
  },
  "cookies": {
    "title": "Cookies and Browser Storage",
    "description": "Sign-in storage, form drafts and browser controls.",
    "sections": [
      {
        "title": "Sign-in storage",
        "body": "VetConnect uses Supabase authentication cookies to maintain and refresh signed-in sessions. Restricting or deleting these cookies can sign you out or prevent account features from working. Browser controls let you inspect and delete cookies. Cookie names and session lifetimes can vary with the authentication configuration."
      },
      {
        "title": "Draft storage",
        "body": "Some assisted-entry forms save draft fields in browser local storage so work can be resumed. Local storage remains on that browser until cleared by the form or browser controls. It is not a substitute for a server-saved application. On shared devices, sign out and clear stored drafts after use."
      },
      {
        "title": "Optional tracking",
        "body": "The application source reviewed for this notice does not include an optional advertising-pixel or analytics integration. Hosting-level configuration and external websites can have separate practices. If optional tracking is introduced, this notice and relevant controls must be updated before activation, with consent where required."
      },
      {
        "title": "Your controls",
        "body": "Manage cookies and site storage through your browser’s privacy settings. This website does not offer a separate optional-tracking preference switch while no such integration is enabled. Contact vetconnect.official@gmail.com if you need help identifying storage used by a VetConnect feature."
      }
    ]
  },
  "team": {
    "title": "Our Team",
    "description": "Team profiles will be added after names, roles and biographies are confirmed.",
    "sections": [
      {
        "title": "Team profiles",
        "body": "We are preparing this page. Confirmed team profiles will be published after the relevant details and permissions have been reviewed. For platform enquiries, contact vetconnect.official@gmail.com."
      }
    ]
  }
} as const;
export type PublicInformationSlug = keyof typeof PUBLIC_INFORMATION;

export function publicInformationMetadata(slug: PublicInformationSlug): Metadata {
  const { title, description } = PUBLIC_INFORMATION[slug];
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/" + slug) },
    openGraph: {
      title: title + " | VetConnect Pakistan",
      description,
      url: absoluteUrl("/" + slug),
      siteName: "VetConnect Pakistan",
      type: "website",
    },
    twitter: { card: "summary", title: title + " | VetConnect Pakistan", description },
  };
}
