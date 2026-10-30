export const REGISTRATION_EVIDENCE_BUCKET = "registration-evidence";
export const MAX_REGISTRATION_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const MAX_REGISTRATION_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_REGISTRATION_EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_REGISTRATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type EvidenceRequirement = {
  type: string;
  label: string;
  imageOnly?: boolean;
};

const personPhoto: EvidenceRequirement = {
  type: "profile_photo",
  label: "Your profile photo",
  imageOnly: true,
};
const organizationLogo: EvidenceRequirement = {
  type: "company_logo",
  label: "Company / organization logo",
  imageOnly: true,
};

export function registrationEvidenceRequirements(
  role: string,
  intent = "",
  studentTrack = "",
): EvidenceRequirement[] {
  if (role === "veterinarian") return [
    personPhoto,
    { type: "degree_certificate", label: "DVM / PVMC-recognized veterinary degree certificate" },
    { type: "pvmc_registration", label: "PVMC practitioner registration proof" },
  ];
  if (role === "candidate") return studentTrack === "job_seeker"
    ? [personPhoto, { type: "qualification_certificate", label: "Highest degree / qualification certificate" }]
    : [personPhoto, { type: "student_enrollment", label: "Current student card or enrollment letter" }];
  if (role === "professional") return [
    personPhoto,
    { type: "qualification_certificate", label: "Highest qualification / degree certificate" },
  ];
  if (role === "company") return intent === "clinic"
    ? [
      organizationLogo,
      { type: "clinic_registration", label: "Clinic / hospital registration or business evidence" },
      { type: "pvmc_registration", label: "Responsible veterinarian's PVMC registration proof" },
    ]
    : [
      organizationLogo,
      { type: "business_registration", label: "Company registration / NTN evidence" },
    ];
  if (role === "laboratory") return [
    organizationLogo,
    { type: "laboratory_registration", label: "Laboratory registration, licence or accreditation evidence" },
  ];
  if (role === "user") return [personPhoto];
  return [];
}

export function isValidPakistaniCnic(value: string): boolean {
  return /^\d{5}-?\d{7}-?\d$/.test(value.trim());
}

export function isAcceptedEvidenceFile(
  mimeType: string,
  size: number,
  imageOnly = false,
): boolean {
  if (imageOnly) {
    return (ACCEPTED_REGISTRATION_IMAGE_TYPES as readonly string[]).includes(mimeType) &&
      size > 0 && size <= MAX_REGISTRATION_IMAGE_BYTES;
  }
  return (ACCEPTED_REGISTRATION_EVIDENCE_TYPES as readonly string[]).includes(mimeType) &&
    size > 0 && size <= MAX_REGISTRATION_EVIDENCE_BYTES;
}
