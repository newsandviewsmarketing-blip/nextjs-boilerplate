import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/seo";

const vetConnectLogo =
  "https://www.vetconnect.com.pk/vetconnect-logo.png";

// Public brand identity for search engines. Only link confirmed official accounts.
const brandStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.vetconnect.com.pk/#organization",
      name: "VetConnect Pakistan",
      alternateName: "Vet-Connect Pakistan",
      url: "https://www.vetconnect.com.pk/",
      logo: vetConnectLogo,
      email: "vetconnect.official@gmail.com",
      sameAs: [
        "https://www.facebook.com/VetConnect.official",
        "https://www.linkedin.com/company/vet-connectofficial/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.vetconnect.com.pk/#website",
      name: "VetConnect Pakistan",
      url: "https://www.vetconnect.com.pk/",
      publisher: { "@id": "https://www.vetconnect.com.pk/#organization" },
      inLanguage: ["en", "ur"],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),

  title: {
    default:
      "VetConnect Pakistan | Vets, Labs, Companies, Products & Careers",
    template: "%s | VetConnect Pakistan",
  },

  description:
    "VetConnect Pakistan connects verified veterinarians, clinics, diagnostic laboratories, animal-health professionals, companies, products, careers and learning through one structured platform.",

  keywords: [
    "VetConnect Pakistan",
    "veterinarian Pakistan",
    "veterinary jobs Pakistan",
    "animal health marketplace",
    "veterinary diagnostic laboratories Pakistan",
    "veterinary companies Pakistan",
    "livestock veterinarian",
    "pet veterinarian",
    "veterinary courses",
  ],

  icons: {
    icon: "/favicon.svg",
    apple: "/vetconnect-logo.png",
  },

  openGraph: {
    title: "VetConnect Pakistan",
    description:
      "Verified veterinary professionals, diagnostics, business information, products and careers in one connected platform.",
    type: "website",
    url: "https://www.vetconnect.com.pk",
    siteName: "VetConnect Pakistan",

    images: [
      {
        url: vetConnectLogo,
        width: 1200,
        height: 630,
        alt: "VetConnect Pakistan",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "VetConnect Pakistan",
    description:
      "Verified veterinary professionals, diagnostics, business information, products and careers in one connected platform.",
    images: [vetConnectLogo],
  },

  robots: {
    index: true,
    follow: true,
  },

  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(brandStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
