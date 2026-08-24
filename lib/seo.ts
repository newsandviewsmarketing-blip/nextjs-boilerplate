const DEFAULT_SITE_URL = "https://www.vetconnect.com.pk";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

export function seoDescription(value: string | null | undefined, fallback: string) {
  const text = (value || fallback).replace(/\s+/g, " ").trim();
  return text.length > 158 ? `${text.slice(0, 155).trimEnd()}...` : text;
}
