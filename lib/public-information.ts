import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const PUBLIC_INFORMATION_VERSION = "2026-11-01.4";
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
    "description": "A veterinary and animal-health network connecting qualified professionals, farmers, pet owners, businesses, product information, careers and learning across Pakistan.",
    "sections": [
      {
        "title": "Our purpose",
        "body": "VetConnect Pakistan connects veterinary expertise with the people, animals and businesses that need it. Built around PVMC-registered veterinarians, the platform brings farmers, livestock keepers, pet owners, allied professionals, clinics, diagnostic laboratories, companies and employers into a shared veterinary and animal-health network. It helps participants present their expertise, discover relevant services, build professional relationships and find reliable sector information.",
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
        "title": "Our communications heritage",
        "body": "VetConnect builds on The Veterinary News & Views (VNV), established in 1987, and its nearly four decades of veterinary and animal-sector communications, publishing and professional relationships. The project carries that experience into a digital environment, combining sector knowledge, information and professional connectivity with tools for discovery, collaboration and growth.",
        "links": [
          {
            "label": "The Veterinary News & Views",
            "href": "https://vetnewsandviews.com"
          }
        ]
      },
      {
        "title": "A founder-led platform for Pakistan",
        "body": "Muhammad Atif Naseem, Founder of VetConnect, identifies the project as Pakistan’s first integrated platform combining verified veterinary and animal-health communications with verified professional and business connections. This positioning reflects the founder’s stated vision and assessment of the platform’s combined scope."
      },
      {
        "title": "Our mission",
        "body": "To make qualified veterinary care, professional expertise and relevant opportunities easier to find and connect. We help people and organisations present their qualifications, experience, skills, laboratory capabilities and services clearly, and connect with the clients, colleagues, employers and partners relevant to their work. Our focus spans livestock, poultry, dairy, companion animals, fisheries and allied animal-health disciplines."
      },
      {
        "title": "Veterinary professionals and allied expertise",
        "body": "Professional identity is central to VetConnect. Profiles bring together education, institutions, experience, specialisations, skills, services and selected public contact details. Veterinarians, allied specialists, researchers, students and laboratory professionals can use their profiles to establish visibility, share relevant expertise and pursue career or business relationships. Qualification review, professional registration and the scope of services offered are assessed separately.",
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
        "body": "Relevant connections depend on both expertise and location. VetConnect’s geographic structure supports discovery by province, district, tehsil and city or locality, alongside animal sector and service requirements. This helps farmers and pet owners find appropriate practitioners and facilities, while helping professionals reach the communities they serve. More detailed geographic matching and location-based services form part of the platform’s continuing development. Planned appointment requests will bring together the practitioner’s expertise, animal species and stated availability; a request becomes a booking only after confirmation by the provider.",
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
        "body": "VetConnect gives animal-health businesses a structured way to present their identity, services and products and connect with relevant professionals and customers. Its product-reference framework covers brand and generic names, active ingredients or salts, strength, formulation, pack size, manufacturer, authorised supplier and available regulatory information, supported by identifiable sources. The aim is to help veterinarians, students, professionals and buyers understand and compare product information. Each review label applies to its stated scope; clinical use follows the current approved label and the treating practitioner’s judgement. Companies and authorised representatives can submit their profiles and product information for the applicable review and publication approval. Submission alone does not make a listing public.",
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
        "body": "The careers network connects candidates with relevant employers, vacancies and professional opportunities. Job information is organised around the employer, source, qualifications, experience, location and application requirements. Candidates can build their professional identity, explore suitable work and connect with businesses seeking relevant skills. Employers remain responsible for their advertisements, selection decisions and employment arrangements. The careers programme also includes CV support and the development of job preferences, relevant vacancy matching and optional email alerts. Preference-based automation and alerts will be described as available only after the relevant account workflow is enabled and verified.",
        "links": [
          {
            "label": "Jobs and careers",
            "href": "/jobs"
          }
        ]
      },
      {
        "title": "Learning, skills and knowledge sharing",
        "body": "VetConnect supports professional growth through sector information, knowledge sharing, training opportunities and connections between academia and industry. Its learning programme encompasses courses, webinars, workshops and practical skill development for veterinarians, students, farm teams and animal-health businesses. Online enrolment, assessments and completion records are being developed as part of this programme; each opportunity states the services currently available.",
        "links": [
          {
            "label": "Learning hub",
            "href": "/learn"
          }
        ]
      },
      {
        "title": "Animal records and continuity of care",
        "body": "VetConnect’s development programme extends these connections into individual-animal, herd and poultry-flock management: identification, clinical history, veterinarian-authored prescriptions, treatment, vaccination and follow-up records. Owner-reported symptoms and observations will be distinguished from the treating veterinarian’s clinical findings and decisions. The objective is a continuous record that supports informed care and communication between owners and authorised professionals. These record-management capabilities are under development and will be introduced with defined access permissions, clinical responsibilities and privacy controls."
      },
      {
        "title": "Our startup journey",
        "body": "VetConnect is part of Cohort 3 at the National Incubation Center Faisalabad, which lists Muhammad Atif Naseem as Founder. We acknowledge NIC Faisalabad’s role in the startup’s incubation and development journey. The centre is supported through the Ministry of IT & Telecom and Ignite National Technology Fund.",
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
        "body": "VetConnect is an independent online digital platform. Links with regulators, institutions and professional organisations support access to relevant information and sector connections.",
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
        "body": "Practitioners, professionals, laboratories, employers and suppliers are responsible for their qualifications, authority, services and representations. Clinical decisions and prescriptions belong to the treating veterinarian; laboratory findings belong to the issuing laboratory; hiring decisions belong to the employer; product claims and supply obligations belong to the responsible business. VetConnect provides the platform services described for each feature and remains accountable for its own conduct and applicable obligations. Product information should be checked against the identified source and current approved label."
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
      },
      {
        "title": "Review labels and information sources",
        "body": "Review labels identify a defined check, such as profile information, professional registration details, business identity or product-source information. They do not guarantee clinical outcomes, employment, commercial performance or the continuing accuracy of every third-party statement. Users must keep their details current. Report a material error or changed credential promptly so the relevant record can be reviewed."
      },
      {
        "title": "Direct arrangements and transactions",
        "body": "Before engaging a practitioner, laboratory, employer or supplier, confirm the service, responsible provider, availability, price, payment arrangements and any cancellation or complaint terms directly. Any ordering, paid consultation or transaction service introduced within VetConnect will state the platform’s role and the applicable transaction terms before acceptance. A directory profile alone does not create such an agreement."
      },
      {
        "title": "Company and product submissions",
        "body": "Submit company information only with authority to represent the business. The submitting provider is responsible for the accuracy and lawful use of descriptions, photographs, product composition, price, currency, availability, documents and regulatory claims. Publication is subject to the applicable review and approval; submission is not approval. Company identity review does not establish the clinical or regulatory status of every product. Identify relevant sources and keep material changes current."
      },
      {
        "title": "Product enquiries, quotations and fulfilment",
        "body": "The current marketplace presents product information and supplier connections; this service does not itself process medicine checkout, payment or delivery. A product enquiry or request for quotation is not an accepted order. Confirm the seller, applicable approvals, current price, taxes, stock, delivery conditions and any product-specific handling requirements directly. The seller’s delivery, cancellation, return and refund terms must be provided before a direct purchase. If an in-platform ordering service is introduced, it will identify the responsible seller and present transaction-specific terms before purchase."
      },
      {
        "title": "Appointment requests and confirmation",
        "body": "Appointment and availability services are under development. Where a request feature is enabled, submitting a request does not confirm a booking. The provider must confirm the practitioner, species or service, location or consultation method, date, time and applicable fee. Rescheduling, cancellation, refunds and any non-attendance charge must be disclosed before acceptance. Do not assume a fee or penalty that was not stated. Unconfirmed requests are not a substitute for arranging urgent care directly."
      },
      {
        "title": "CVs, profile visibility and job alerts",
        "body": "Candidates must provide honest qualifications, experience and preferences and have authority to upload any CV or photograph. A private CV or application does not become a public profile merely because it is uploaded. Public profile information requires a separate publication choice and the applicable review. Optional job alerts, when enabled, must explain the matching preferences and provide a way to stop the alerts; registration is not automatic consent to promotional email. Contact support for privacy or visibility changes where a self-service control is not available. Job matching, notifications and reviewed listings do not guarantee an interview or employment."
      },
      {
        "title": "Animal, herd and flock records",
        "body": "Record-management services are under development. Owners and farm representatives must have authority to provide information about the animals, herd or poultry flock concerned. Owner observations and reported symptoms are distinct from professional diagnoses, treatment decisions and prescriptions. Clinical entries must identify the responsible practitioner. Viewing or sharing private records requires the relevant authority and purpose. Corrections to professional records should preserve authorship and an amendment history rather than silently replace a practitioner’s original entry. Feature-specific controls will explain access, sharing and correction when these services launch."
      },
      {
        "title": "Ratings and feedback",
        "body": "Where reviews or ratings are enabled, submissions must reflect a genuine relevant experience and distinguish fact from opinion. Do not publish fabricated reviews, undisclosed paid endorsements, harassment, confidential patient information or another person’s identity documents. Report disputed, abusive or misleading feedback through vetconnect.official@gmail.com with the relevant page link. We may seek clarification, invite a response and restrict content during review. A rating is user feedback, not a clinical finding or regulatory decision. Review moderation does not remove rights that apply under law."
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
        "title": "Geographic information and location choices",
        "body": "Province, district, tehsil, city and service-area information can support relevant local discovery. Public location details are limited to the fields selected and approved for display. If a feature requests precise coordinates or device location, it will explain the purpose and sharing choices before collection. Do not place private home or farm coordinates in a public profile unless you intend to disclose them. A precise-location feature must provide a separate, explicit choice; general registration is not blanket permission for location tracking."
      },
      {
        "title": "Public and private information",
        "body": "Profile and business information approved for directory display can be public. Review the fields and visibility offered by the feature before submission. Certificates, CNIC scans, internal review notes and CV files are not intended for public-directory display. Report any unexpected exposure immediately. Do not include identity numbers or private documents in a public biography."
      },
      {
        "title": "Recruitment",
        "body": "A CV submitted for a particular job is for that application and the authorised receiving employer, with necessary platform-support access. Employers must not sell it, publish it or reuse it for unrelated marketing. A future talent-pool or marketing choice must be separate from the application itself. Job-preference and alert features, when enabled, may use the sectors, roles, locations and other preferences you choose. Optional alerts and public-profile visibility must be presented separately from a specific job application. Use the available preference controls or contact support to stop optional alerts or request a visibility change."
      },
      {
        "title": "Appointment requests and feedback",
        "body": "If appointment or feedback features are enabled, the workflow will explain which contact, animal/service, availability and experience details are needed and who receives them. Keep private clinical details and identity documents out of public reviews. A request may be shared with the intended provider to arrange care; it is not permission to distribute your details to unrelated suppliers or marketers."
      },
      {
        "title": "Animal and farm records: planned services",
        "body": "Individual-animal, herd and poultry-flock record services are under development. Their intended information includes identity, owner or farm links, owner-reported symptoms, professional clinical findings, treatment, prescriptions, vaccination and follow-up records. Owner observations will be distinguished from practitioner-authored clinical entries. As each service becomes available, its notice will explain the responsible record author, authorised viewers, sharing choices and retention arrangements. Animal and farm information can identify people, reveal a business’s operations or disclose a sensitive location, and will be handled accordingly."
      },
      {
        "title": "Care-team access and sharing",
        "body": "The planned animal-record service is designed for access by the owner or authorised farm representative, treating veterinarian and explicitly authorised care-team members. Public-directory participation does not authorise access to private records. Sharing for another clinic, research, supplier access or optional marketing must have a separately explained and appropriate basis. Feature-specific access arrangements will be presented when these services launch."
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
        "body": "Read this notice with the Terms of Use and Cookies Notice. Any service-specific notice supplements this explanation for the feature concerned. Material changes to data use, sharing or visibility will be explained through the affected service, with a separate choice where required."
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
