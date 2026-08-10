import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:
      "VetConnect Pakistan | Veterinarians, Marketplace, Jobs & Learning",
    template: "%s | VetConnect Pakistan",
  },
  description:
    "VetConnect Pakistan connects veterinary professionals, farmers, pet owners, companies, employers and students through verified profiles, appointments, marketplace listings, jobs and learning.",
  keywords: [
    "VetConnect Pakistan",
    "veterinarian Pakistan",
    "veterinary jobs Pakistan",
    "animal health marketplace",
    "livestock veterinarian",
    "pet veterinarian",
    "veterinary courses",
  ],
  openGraph: {
    title: "VetConnect Pakistan",
    description:
      "One connected platform for veterinary care, products, careers and learning.",
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
