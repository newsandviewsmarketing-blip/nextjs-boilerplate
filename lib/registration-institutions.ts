import reference from "../public/data/pvmc-dvm-institutions.json";

export const DVM_INSTITUTIONS = reference.institutions;
export const DVM_INSTITUTIONS_SOURCE = reference.sourceUrl;
export const DVM_INSTITUTIONS_CHECKED_ON = reference.checkedOn;
export function isDvmQualification(value: string): boolean {
  return /\bD\.?\s*V\.?\s*M\.?\b|Doctor of Veterinary Medicine/i.test(value);
}
export function registrationInstitution(form: FormData, key: string, degree: string): {
  institution?: string; source?: string; error?: string;
} {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const valid = (value: string) => value.length > 0 && value.length <= 180 && !/[<>\u0000-\u001f]/.test(value);
  if (!isDvmQualification(degree)) {
    const institution = text(key);
    return valid(institution) ? { institution, source: "open" } : { error: "Enter the awarding university or institution." };
  }
  const choice = text(key + "_choice");
  const listed = DVM_INSTITUTIONS.find(item => item.id === choice);
  if (listed) return { institution: listed.name, source: "pvmc:" + listed.id };
  if (["__international__", "__other__"].includes(choice)) {
    const institution = text(key);
    return valid(institution) ? { institution, source: choice === "__international__" ? "international" : "other" }
      : { error: "Enter the full name of your other or international institution." };
  }
  return { error: "Choose a DVM institution, or select Other / International and enter its name." };
}
