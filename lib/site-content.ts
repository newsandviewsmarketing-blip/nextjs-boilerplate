import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sourceSiteDocument, validateSiteDocument } from "./site-content-document";
import { publicInformationMetadata, type PublicInformationSlug } from "./public-information";

export const getPublishedSiteDocument = cache(async (slug: PublicInformationSlug) => {
  const fallback = sourceSiteDocument(slug);
  try {
    const db = await createClient();
    const {data,error} = await db.from("site_content_publications").select("document").eq("slug",slug).maybeSingle();
    // Existing legacy snapshots predate the current reviewed website source.
    // Only an explicit publication through this editor activates a schema-2 document.
    return !error && data?.document?.schemaVersion === 2 ? validateSiteDocument(data.document,slug) : fallback;
  } catch { return fallback; }
});
export async function siteContentMetadata(slug: PublicInformationSlug) {
  const doc = await getPublishedSiteDocument(slug);
  const base = publicInformationMetadata(slug);
  return {...base,title:doc.seoTitle,description:doc.seoDescription,
    openGraph:{...base.openGraph,title:doc.seoTitle,description:doc.seoDescription},
    twitter:{...base.twitter,title:doc.seoTitle,description:doc.seoDescription}};
}
