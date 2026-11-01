import { PUBLIC_INFORMATION, PUBLIC_INFORMATION_VERSION, PUBLIC_INFORMATION_UPDATED, type PublicInformationSlug, type PublicInformationContent } from "./public-information";

export type SiteDocument = {
  schemaVersion: 2; slug: PublicInformationSlug; title: string; summary: string;
  version: string; effectiveDate: string; seoTitle: string; seoDescription: string;
  sections: { heading: string; paragraphs: string[]; links?: { label: string; href: string }[] }[];
};
export function isSiteSlug(value: unknown): value is PublicInformationSlug {
  return typeof value === "string" && Object.hasOwn(PUBLIC_INFORMATION, value);
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max && !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
export function safeContentLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000 || /[\s\\<>]/.test(value)) return false;
  if (/[?&](token|signature|key|x-amz-[^=]*|x-goog-[^=]*)=/i.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return !/^\/(admin|dashboard|api|auth)(\/|\?|$)/.test(value);
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export function validateSiteDocument(value: unknown, slug: PublicInformationSlug): SiteDocument {
  if (!record(value) || JSON.stringify(value).length > 100000 ||
      Object.keys(value).some(key => !["schemaVersion","slug","title","summary","version","effectiveDate","seoTitle","seoDescription","sections"].includes(key)) ||
      value.schemaVersion !== 2 || value.slug !== slug || !isSiteSlug(slug)) throw new Error("Invalid page document.");
  for (const [key, limit] of [["title",200],["summary",1000],["version",80],["seoTitle",160],["seoDescription",300]] as const)
    if (!text(value[key], limit)) throw new Error("Check the " + key + " field.");
  if (typeof value.effectiveDate !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value.effectiveDate) ||
      !Number.isFinite(Date.parse(value.effectiveDate + "T12:00:00Z")) ||
      new Date(value.effectiveDate + "T12:00:00Z").toISOString().slice(0,10) !== value.effectiveDate) throw new Error("Enter a valid date.");
  if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 40) throw new Error("Use between 1 and 40 sections.");
  for (const section of value.sections) {
    if (!record(section) || Object.keys(section).some(key => !["heading","paragraphs","links"].includes(key)) ||
        !text(section.heading,200) || !Array.isArray(section.paragraphs) || section.paragraphs.length < 1 ||
        section.paragraphs.length > 20 || !section.paragraphs.every(p => text(p,6000))) throw new Error("Check each section heading and paragraph.");
    if (section.links !== undefined && (!Array.isArray(section.links) || section.links.length > 10 ||
        !section.links.every(link => record(link) && Object.keys(link).every(k => ["label","href"].includes(k)) && text(link.label,160) && safeContentLink(link.href))))
      throw new Error("Use valid public HTTPS or website links.");
  }
  return value as SiteDocument;
}
export function sourceSiteDocument(slug: PublicInformationSlug): SiteDocument {
  const p: PublicInformationContent = PUBLIC_INFORMATION[slug];
  return {schemaVersion:2,slug,title:p.title,summary:p.description,version:PUBLIC_INFORMATION_VERSION,
    effectiveDate:PUBLIC_INFORMATION_UPDATED,seoTitle:p.title,seoDescription:p.description,
    sections:p.sections.map(s=>({heading:s.title,paragraphs:[s.body],...(s.links ? {links:s.links.map(l=>({...l}))} : {})}))};
}
export function historySiteDocument(value: unknown, slug: PublicInformationSlug): SiteDocument {
  if (!record(value)) throw new Error("Invalid saved document.");
  return validateSiteDocument({...value,schemaVersion:2,seoTitle:value.seoTitle ?? value.title,seoDescription:value.seoDescription ?? value.summary},slug);
}
export function publicPageFromDocument(d: SiteDocument): PublicInformationContent {
  return { title:d.title,description:d.summary,sections:d.sections.map(s=>({title:s.heading,body:s.paragraphs.join("\n\n"),links:s.links})) };
}
