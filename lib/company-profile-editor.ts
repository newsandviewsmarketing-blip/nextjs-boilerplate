import type { SupabaseClient } from "@supabase/supabase-js";

export type ManagementContact = {
  full_name: string;
  designation: string;
  department: string;
  office_phone: string;
  mobile_phone: string;
  email: string;
  reports_to: string;
  notes: string;
};

export type CompanyPresentation = {
  tagline: string;
  year_established: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
  other_url: string;
  profile_tone: "navy" | "orange" | "slate";
};

const URL_FIELDS = ["facebook_url","instagram_url","linkedin_url","youtube_url","other_url"] as const;
const CONTACT_FIELDS = ["full_name","designation","department","office_phone","mobile_phone","email","reports_to","notes"] as const;

function field(form: FormData, key: string, max = 240) {
  const result = String(form.get(key) ?? "").trim();
  if (result.length > max) throw new Error(key.replaceAll("_"," ") + " exceeds the allowed length.");
  return result;
}

export function safeWebsite(form: FormData, key: string) {
  const value = field(form,key,512);
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid http(s) link for " + key.replaceAll("_"," ") + "."); }
  if (!["http:","https:"].includes(url.protocol) || !url.hostname) {
    throw new Error("Only http(s) website and social links are allowed.");
  }
  return url.toString();
}

export function companyPresentationFromForm(form: FormData): CompanyPresentation {
  const year = field(form,"year_established",4);
  if (year && (!/^[0-9]{4}$/.test(year) || Number(year) < 1800 || Number(year) > new Date().getFullYear())) {
    throw new Error("Enter a valid company founding year.");
  }
  const tone = field(form,"profile_tone",15);
  const result: CompanyPresentation = {
    tagline: field(form,"tagline",240),
    year_established: year,
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
    youtube_url: "",
    other_url: "",
    profile_tone: tone === "orange" || tone === "slate" ? tone : "navy",
  };
  for (const name of URL_FIELDS) result[name] = safeWebsite(form,name) ?? "";
  return result;
}

export function companyContactsFromForm(form: FormData): ManagementContact[] {
  const raw = field(form,"private_contacts_json",35000) || "[]";
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Internal contacts could not be read."); }
  if (!Array.isArray(parsed) || parsed.length > 30) throw new Error("You may add up to 30 internal contacts.");
  const contacts: ManagementContact[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid internal contact.");
    const row = item as Record<string,unknown>;
    const contact = {} as ManagementContact;
    for (const key of CONTACT_FIELDS) {
      const rawValue = row[key];
      if (rawValue !== undefined && typeof rawValue !== "string") throw new Error("Invalid contact field.");
      const value = String(rawValue ?? "").trim();
      const max = key === "notes" ? 1500 : key === "email" ? 240 : 150;
      if (value.length > max) throw new Error("A contact field is too long.");
      contact[key] = value;
    }
    if (!contact.full_name) {
      if (CONTACT_FIELDS.some(key => contact[key] !== "")) throw new Error("Enter a name for every internal contact.");
      continue;
    }
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error("Enter a valid management contact email.");
    contacts.push(contact);
  }
  return contacts;
}

export async function saveCompanySupplement(
  supabase: SupabaseClient,
  companyId: string,
  form: FormData,
) {
  // There is deliberately no public contact endpoint for this private hierarchy.
  const presentation = companyPresentationFromForm(form);
  const contacts = companyContactsFromForm(form);
  const { error } = await supabase.rpc("save_company_profile_supplement", {
    p_company_id: companyId,
    p_public: presentation,
    p_contacts: contacts,
  });
  if (error) throw new Error("Company profile details could not be saved: " + error.message);
}

export function companyDescriptionFromForm(form: FormData) {
  return field(form,"description",6000);
}


export function companyCoreFromForm(form: FormData, nameField: "company_name" | "canonical_name", uploadedLogo?: string | null) {
  const companyName = field(form,nameField,180);
  if (!companyName) throw new Error("Company name is required.");
  const emailField = nameField === "company_name" ? "contact_email" : "public_email";
  const publicEmail = field(form,emailField,240);
  if (publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) throw new Error("Enter a valid public email.");
  return {
    canonical_name: companyName,
    legal_name: field(form,"legal_name",180),
    trade_name: field(form,"trade_name",180),
    business_type: field(form,"business_type",150),
    registration_number: field(form,"registration_number",100),
    public_phone: field(form,"public_phone",60),
    public_email: publicEmail,
    province: field(form,"province",120),
    district: field(form,"district",150),
    tehsil: field(form,"tehsil",150),
    city: field(form,"city",150),
    address: field(form,"address",600),
    description: companyDescriptionFromForm(form),
    website: safeWebsite(form,"website") ?? "",
    google_maps_url: safeWebsite(form,"google_maps_url") ?? "",
    logo_url: uploadedLogo || safeWebsite(form,"logo_url") || "",
    cover_image_url: safeWebsite(form,"cover_image_url") ?? "",
  };
}

export async function saveCompleteCompanyProfile(
  supabase: SupabaseClient,
  companyId: string,
  form: FormData,
  nameField: "company_name" | "canonical_name",
  uploadedLogo?: string | null,
) {
  const presentation = companyPresentationFromForm(form);
  const contacts = companyContactsFromForm(form);
  const core = companyCoreFromForm(form,nameField,uploadedLogo);
  const { error } = await supabase.rpc("save_company_profile_supplement", {
    p_company_id: companyId,
    p_public: presentation,
    p_contacts: contacts,
    p_core: core,
  });
  if (error) throw new Error("Company profile could not be updated: "+error.message);
}
