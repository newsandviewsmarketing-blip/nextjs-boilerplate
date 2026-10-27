export const REGISTRATION_EVIDENCE_BUCKET = "registration-evidence";
export const MAX_REGISTRATION_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_REGISTRATION_EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export type RegistrationRole =
  | "veterinarian"
  | "candidate"
  | "professional"
  | "company"
  | "laboratory"
  | "user";

export type EvidenceRequirement = { type: string; label: string };

export function registrationEvidenceRequirements(
  role: string,
  intent = "",
  studentTrack = "",
): EvidenceRequirement[] {
  if (role === "veterinarian") return [
    { type: "degree_certificate", label: "DVM / recognized veterinary degree certificate" },
    { type: "pvmc_registration", label: "PVMC practitioner registration proof" },
  ];
  if (role === "candidate") return studentTrack === "job_seeker"
    ? [{ type: "qualification_certificate", label: "Highest degree or qualification certificate" }]
    : [{ type: "student_enrollment", label: "Current student card or enrollment letter" }];
  if (role === "professional") return [
    { type: "qualification_certificate", label: "Highest qualification / degree certificate" },
  ];
  if (role === "company") return intent === "clinic"
    ? [
      { type: "clinic_registration", label: "Clinic / hospital registration or business evidence" },
      { type: "pvmc_registration", label: "Responsible veterinarian's PVMC registration proof" },
    ]
    : [{ type: "business_registration", label: "Company registration / NTN evidence" }];
  if (role === "laboratory") return [
    { type: "laboratory_registration", label: "Laboratory registration, licence or accreditation evidence" },
  ];
  return [];
}

export function isValidPakistaniCnic(value: string): boolean {
  return /^\\d{5}-?\\d{7}-?\\d$/.test(value.trim());
}
