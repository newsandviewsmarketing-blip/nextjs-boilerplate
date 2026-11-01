"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentIdentity } from "@/lib/auth";
import { getEffectiveAdminPermissions } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { isSiteSlug, validateSiteDocument, historySiteDocument } from "@/lib/site-content-document";

async function access(publish = false) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login?next=/admin/website");
  const rights = await getEffectiveAdminPermissions(identity);
  if (!rights.has("site.manage") && (publish || !rights.has("site_content.edit"))) throw new Error("You do not have permission for website content.");
  const db = await createClient();
  const {data,error} = await db.rpc(publish ? "site_content_can_manage" : "site_content_can_edit");
  if (error || data !== true) throw new Error("Website editing is unavailable or permission was denied.");
  return db;
}
function target(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const revision = Number(form.get("revision"));
  if (!isSiteSlug(slug) || !Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid page or revision.");
  return {slug,revision};
}
function errorMessage(error: {code?: string;message?: string} | null) {
  if (error?.code === "40001" || error?.code === "23505") return "The page changed. Reload it before trying again.";
  return "The change could not be saved. Check your permission and try again.";
}
export async function saveWebsiteDraftAction(form: FormData) {
  const db = await access();
  const {slug,revision} = target(form);
  const input = String(form.get("document") ?? "");
  if (input.length > 100000) throw new Error("Page is too large.");
  const document = validateSiteDocument(JSON.parse(input),slug);
  const {error} = await db.rpc("save_site_content_drafts",{entries:[{document,expected_revision:revision}]});
  if (error) throw new Error(errorMessage(error));
  revalidatePath("/admin/website");
  redirect("/admin/website?slug=" + slug + "&message=Draft%20saved.%20The%20public%20page%20has%20not%20changed.");
}
export async function publishWebsiteDraftAction(form: FormData) {
  const db = await access(true);
  const {slug,revision} = target(form);
  if (form.get("confirm") !== "publish") throw new Error("Confirm the reviewed revision before publishing.");
  const {data,error:readError} = await db.from("site_content_drafts").select("document,revision").eq("slug",slug).maybeSingle();
  if (readError || !data || data.revision !== revision) throw new Error("The draft changed. Reload before publishing.");
  validateSiteDocument(data.document,slug);
  const {error} = await db.rpc("publish_site_content",{page_slug:slug,expected_revision:revision});
  if (error) throw new Error(errorMessage(error));
  revalidatePath("/" + slug);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/website");
  redirect("/admin/website?slug=" + slug + "&message=Reviewed%20revision%20published.");
}
export async function restoreWebsiteDraftAction(form: FormData) {
  const db = await access();
  const {slug,revision} = target(form);
  const id = String(form.get("history_id") ?? "");
  if (!/^[0-9]{1,19}$/.test(id)) throw new Error("Invalid history revision.");
  const {data,error:readError} = await db.from("site_content_history").select("document").eq("id",id).eq("slug",slug).maybeSingle();
  if (readError || !data) throw new Error("That revision is unavailable.");
  const document = historySiteDocument(data.document,slug);
  // A restored draft gets a new version, preserving the original history.
  document.version = document.version.slice(0,45) + "-restored-" + Date.now();
  const {error} = await db.rpc("save_site_content_drafts",{entries:[{document,expected_revision:revision}]});
  if (error) throw new Error(errorMessage(error));
  revalidatePath("/admin/website");
  redirect("/admin/website?slug=" + slug + "&message=Previous%20text%20restored%20as%20a%20new%20draft.%20Review%20before%20publishing.");
}
