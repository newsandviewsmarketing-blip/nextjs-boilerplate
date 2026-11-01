import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const PUBLIC_INFORMATION_VERSION = "2026-11-01.2";
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

export type PublicInformationContent = {
  title: string;
  description: string;
  sections: readonly {
    title: string;
    body: string;
    links?: readonly { label: string; href: string }[];
  }[];
};

export const PUBLIC_INFORMATION = {
  "about": {
    "title": "About VetConnect Pakistan",
    "description": "Connecting farmers and pet owners with PVMC-registered veterinarians, animal-health professionals, companies, product information, careers and learning.",
    "sections": [
      {
        "title": "Our purpose",
        "body": "VetConnect Pakistan is a digital initiative of The Veterinary News & Views (VNV), developed to connect Pakistan’s veterinary and animal-health community. At its centre is a clear purpose: help farmers, livestock keepers and pet owners find veterinary practitioners whose qualifications and PVMC registration can be checked. Around that connection, the platform brings together allied professionals, clinics, laboratories, companies, product information, career opportunities and learning.",
        "links": [
          {
            "label": "The Veterinary News & Views",
            "href": "https://vetnewsandviews.com"
          },
          {
            "label": "Find a veterinarian",
            "href": "/vets"
          }
        ]
      },
      {
        "title": "Our mission",
        "body": "Our mission is to improve access to qualified veterinary care, reliable sector information and professional opportunities through responsible digital connections. We aim to help people present their qualifications accurately, find appropriate expertise, exchange knowledge and work together across livestock, poultry, dairy, companion-animal care, fisheries and related animal-health services."
      },
      {
        "title": "Veterinary professionals and allied expertise",
        "body": "Veterinary practitioners are the core of the platform. Professional profiles bring qualifications, institutions, experience, areas of practice and public contact choices into one place. Allied professionals, students, researchers and industry specialists also have a place to establish their professional identity. Veterinary clinical practice requires the relevant professional registration; an allied-professional profile or academic qualification does not itself confer practice rights.",
        "links": [
          {
            "label": "Professional directory",
            "href": "/professionals"
          },
          {
            "label": "Create a profile",
            "href": "/register"
          }
        ]
      },
      {
        "title": "Connecting farmers, pet owners and care providers",
        "body": "We aim to make it easier to find practitioners, clinics and diagnostic services by location, animal sector and expertise, including for underserved farming communities. VetConnect supports discovery and communication; availability, consultation arrangements and clinical decisions remain with the relevant care provider.",
        "links": [
          {
            "label": "Clinics and hospitals",
            "href": "/clinics"
          },
          {
            "label": "Diagnostic laboratories",
            "href": "/labs"
          }
        ]
      },
      {
        "title": "Companies, services and product information",
        "body": "The business network connects relevant companies and service providers with professionals, farmers and other sector participants. Our product-information objective is to organise brand and generic names, active ingredients or salts, strength, dosage form, pack size, manufacturer or authorised supplier, and source-supported regulatory information where available. Review of a company or one product field does not approve every product claim. Product references help users check information; they do not replace approved labelling, professional judgement or a veterinary consultation.",
        "links": [
          {
            "label": "Company directory",
            "href": "/companies"
          },
          {
            "label": "Product information",
            "href": "/marketplace"
          }
        ]
      },
      {
        "title": "Jobs and professional opportunities",
        "body": "VetConnect connects job seekers with employers and relevant veterinary and animal-health vacancies. We aim to make the employer, source, eligibility, location and application deadline easier to check. A reviewed listing is not a guarantee of employment or an endorsement of every employer claim. Applicants should confirm the current advertisement and application instructions.",
        "links": [
          {
            "label": "Jobs and careers",
            "href": "/jobs"
          }
        ]
      },
      {
        "title": "Learning, skills and knowledge sharing",
        "body": "Knowledge sharing and skill development are part of the project’s purpose. The learning direction includes professional courses, workshops, webinars, practical training and sector resources for veterinarians, students, farm teams and industry professionals. VNV supports the project through sector information, professional networks and outreach. Course enrolment, assessments and completion records should be described as available only when the relevant service is active.",
        "links": [
          {
            "label": "Learning hub",
            "href": "/learn"
          }
        ]
      },
      {
        "title": "Animal records and continuity of care",
        "body": "Our development roadmap includes animal and herd records, veterinarian-authored prescriptions, treatment history, vaccination and follow-up information, and communication between authorised care teams and owners. These are planned capabilities, not a claim that a complete clinical-record or prescription service is currently available. Each such service needs its own access controls, owner authorisation, clinical responsibilities and record-handling notice before launch."
      },
      {
        "title": "Our startup journey",
        "body": "The National Incubation Center Faisalabad lists Vet-Connect in Cohort 3, with Muhammad Atif Naseem as Founder. NIC Faisalabad is funded through the Ministry of IT & Telecom and Ignite National Technology Fund. Incubation support describes the startup’s development journey; it does not mean that a government body, NICF or Ignite approves individual practitioners, products or services on VetConnect.",
        "links": [
          {
            "label": "Vet-Connect in the NIC Faisalabad startup directory",
            "href": "https://www.nicfaisalabad.com/startup/vet-connect/"
          },
          {
            "label": "About NIC Faisalabad",
            "href": "https://www.nicfaisalabad.com/about-us/"
          }
        ]
      },
      {
        "title": "Verification, independence and trust",
        "body": "VetConnect is not PVMC or a licensing authority. Email confirmation, profile review, PVMC registration checks, company identity and product-information review have different scopes. A listed institution, uploaded document or profile label does not automatically establish current permission to practise, product approval or a guaranteed outcome. Regulatory and institutional links do not imply endorsement.",
        "links": [
          {
            "label": "Pakistan Veterinary Medical Council",
            "href": "https://pvmc.gov.pk/"
          }
        ]
      },
      {
        "title": "Contact and corrections",
        "body": "For platform enquiries, incorrect information, privacy requests or operator and formal-notice details, contact vetconnect.official@gmail.com. Include the relevant page link and a concise explanation. Do not send passwords, OTPs or complete identity documents by ordinary email.",
        "links": [
          {
            "label": "Privacy Notice",
            "href": "/privacy"
          },
          {
            "label": "Terms of Use",
            "href": "/terms"
          }
        ]
      },
      {
        "title": "Animal emergencies",
        "body": "A directory, educational resource or product-information page is not a clinical consultation. Contact an appropriately qualified veterinary practitioner directly for an animal emergency. VetConnect messages are not an emergency response service."
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
        "body": "Users are responsible for relevant professional registrations and business authorisations. VetConnect does not confer permission to practise. Independent practitioners, employers and suppliers are responsible for their own services and claims; VetConnect remains responsible for its own conduct and applicable obligations. A listing is not a guarantee of treatment, employment, product safety or commercial performance. Product composition, packaging and regulatory information should be checked against the identified source and current approved label. VetConnect does not issue prescriptions or grant regulatory approval by displaying a listing."
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
      },
      {
        "title": "Future clinical records and learning services",
        "body": "Animal-care records, prescription workflows, course enrolment and completion records form part of the development roadmap. Before any such service is activated, its specific responsibilities, access arrangements and applicable terms must be presented. Mention of a planned capability is not a commitment that it is currently available."
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
        "body": "Information may include your name, email, telephone, location, account type, education, institution, experience and selected profile details. The features you use may request professional-registration evidence, business details, documents, CVs or job applications. These support authentication, requested profiles and applications, verification, communications, moderation and abuse prevention. Product and company submissions can include representative details, source documents and information used to assess authority to publish. Learning or event features may request enrolment and participation information when those services become available."
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
        "title": "Animal and farm records: planned services",
        "body": "The roadmap includes animal identification, owner or farm links, treatment and vaccination history, prescriptions and follow-up records. These features are not represented as a complete live service by this notice. Before activation, the relevant workflow must explain the information collected, the responsible record author, authorised viewers, sharing choices and retention arrangements. Farm location and commercial records can identify or affect people and businesses even when the subject is an animal."
      },
      {
        "title": "Care-team access and sharing",
        "body": "For a future animal-record service, access is intended to be limited to the owner or authorised farm representative, the treating practitioner and explicitly authorised care-team members. A directory listing or company account must not provide access to private clinical records. Research, optional marketing, supplier access or sharing with another clinic requires a separately explained and appropriate basis. These are service-design requirements, not a claim that the access system has already been deployed."
      },
      {
        "title": "Professional documents and public search",
        "body": "A professional biography, qualification summary or experience description selected and approved for publication may appear in public search results. Private identity evidence, full registration documents, contact details designated private, CV files and animal-care records are not intended to be indexed or included in public profiles. Removing a public page may not immediately remove copies held by search engines."
      },
      {
        "title": "VNV, incubation and partner boundaries",
        "body": "VNV supports VetConnect through information, networks and outreach. NIC Faisalabad incubation or a link to a training partner does not, by itself, authorise access to user accounts, CVs, identity evidence or future animal-care records. Any operational sharing between VetConnect, VNV or other partners must be explained for the relevant purpose and limited to the information needed."
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
} as const satisfies Record<string, PublicInformationContent>;
export type PublicInformationSlug = keyof typeof PUBLIC_INFORMATION;

export function publicInformationMetadata(slug: PublicInformationSlug): Metadata {
  const { title, description } = PUBLIC_INFORMATION[slug];
  return {
    title,
    description,
    keywords: slug === "about" ? ["VetConnect Pakistan", "PVMC-registered veterinarians", "veterinary jobs Pakistan", "animal-health product information", "livestock farmers", "pet owners", "veterinary learning"] : undefined,
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
