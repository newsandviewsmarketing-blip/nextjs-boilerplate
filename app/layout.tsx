import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
  openGraph: {
    title: "VetConnect Pakistan",
    description:
      "Verified veterinary professionals, diagnostics, business information, products and careers in one connected platform.",
    type: "website",
    url: "https://www.vetconnect.com.pk",
    siteName: "VetConnect Pakistan",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
