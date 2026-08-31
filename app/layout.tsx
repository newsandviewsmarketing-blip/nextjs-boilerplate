import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/seo";

const vetConnectLogo =
  "https://www.vetconnect.com.pk/vetconnect-logo.png";

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
      <body>{children}</body>
    </html>
  );
}
