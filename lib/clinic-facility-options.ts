/**
 * Shared, display-friendly clinic practice types. Existing facility_type values
 * remain untouched; other descriptors are saved only on private clinic drafts.
 * This is a UI vocabulary, not automatic veterinary licence verification.
 */
export const CLINIC_FACILITY_TYPES = [
  "Veterinary Clinic",
  "Veterinary Hospital",
  "Pet Clinic",
  "Cat / Feline Clinic",
  "Livestock Clinic",
  "Poultry Veterinary Clinic",
  "Poultry Farm Veterinary Service",
  "Farm Veterinary Service",
  "Mobile Veterinary Service",
  "Veterinary Consultancy",
  "Poultry Veterinary Consultancy",
  "Livestock Veterinary Consultancy",
  "Aquaculture Veterinary Service",
] as const;

export const CLINIC_SERVICES = [
  "Consultation", "Vaccination", "Diagnostics", "Surgery",
  "Preventive Care", "Emergency Care", "Poultry Health",
  "Poultry Farm Consultancy", "Flock Health Monitoring",
  "Biosecurity", "Farm Visits", "Pet Medicine", "Cat Medicine",
  "Livestock Herd Health", "Nutrition & Feed Advice",
  "Reproductive Services", "Aquaculture Health", "Laboratory Referral",
  "Wellness Examination", "Deworming & Parasite Control", "Pet Dermatology",
  "Pet Dentistry", "Small Animal Internal Medicine", "Diagnostic Imaging / Ultrasound",
  "Pet Surgical Consultation", "Behaviour & Welfare Advice", "Bird & Exotic Pet Care",
  "Poultry Vaccination Planning", "Poultry Disease Investigation",
  "Feed & Flock Performance Review", "Mastitis & Udder Health",
  "Herd Reproductive Health", "Farm Biosecurity Audit",
] as const;

export const CLINIC_SPECIES = [
  "Dogs", "Cats", "Poultry", "Cattle", "Buffalo",
  "Sheep", "Goats", "Equine", "Fish / Aquaculture",
  "Companion Animals", "Wildlife", "Rabbits", "Pet Birds", "Exotic Pets", "Camelids",
] as const;

const facilitySet = new Set<string>(CLINIC_FACILITY_TYPES);

export function resolveClinicFacilityType(
  formData: FormData,
): {value:string;error?:string} {
  const chosen = String(formData.get("facility_type") ?? "").trim();
  const other = String(formData.get("facility_type_other") ?? "").trim().replace(/\s+/g," ");
  if (facilitySet.has(chosen)) return {value:chosen};
  // Existing custom facility types are reselected as Other in the form.
  if (chosen !== "Other") return {value:"",error:"Choose an available facility type."};
  if (other.length < 4 || other.length > 90 || /[<>]/.test(other))
    return {value:"",error:"Describe the other practice type in 4 to 90 plain-text characters."};
  return {value:other};
}

export function clinicFocusEntries(formData:FormData,kind:"services"|"species"):string[] {
  const allowed = new Set<string>(kind === "services" ? CLINIC_SERVICES : CLINIC_SPECIES);
  // Backwards-compatible with old forms or stale browser tabs while users update.
  if(!formData.has(kind+"_extra")&&!formData.has(kind+"_selected"))
    return String(formData.get(kind)??"").split(",")
      .map(x=>x.trim()).filter(Boolean).slice(0,35);
  const submitted = formData.getAll(kind + "_selected").map(x=>String(x).trim());
  const extra = String(formData.get(kind + "_extra")??"")
    .split(",").map(x=>x.trim().replace(/\s+/g," ")).filter(Boolean);
  const result=[...submitted.filter(x=>allowed.has(x)),...extra.filter(x=>x.length <= 80 && !/[<>]/.test(x))];
  return [...new Map(result.map(x=>[x.toLocaleLowerCase("en"),x])).values()].slice(0,35);
}
