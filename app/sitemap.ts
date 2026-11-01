import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_INFORMATION_LINKS } from "@/lib/public-information";

const publicRoutes = [
  "/",
  "/vets",
  "/professionals",
  "/clinics",
  "/labs",
  "/companies",
  "/marketplace",
  "/jobs",
  "/learn",
  ...PUBLIC_INFORMATION_LINKS.map(item => "/" + item.slug),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicRoutes.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
