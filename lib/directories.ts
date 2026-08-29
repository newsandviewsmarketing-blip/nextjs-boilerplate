export type PublicVeterinarian = {
  user_id: string;
  full_name: string;
  qualifications: string | null;
  specialization: string | null;
  years_experience: number;
  city: string | null;
  services: string[];
  image_url: string | null;
  profile_verified: boolean;
  pvmc_verified: boolean;
  is_sample?: boolean;
};

export type PublicProfessional = {
  user_id: string | null;
  slug: string;
  full_name: string;
  professional_type: string;
  headline: string | null;
  current_position: string | null;
  organization_name: string | null;
  city: string | null;
  province: string | null;
  district?: string | null;
  tehsil?: string | null;
  public_summary?: string | null;
  years_experience: number;
  skills: string[];
  image_url: string | null;
  profile_verified: boolean;
  is_sample?: boolean;
};

export type PublicClinic = {
  id: string | null;
  slug: string;
  clinic_name: string;
  facility_type: string;
  description: string | null;
  city: string | null;
  province: string | null;
  district?: string | null;
  tehsil?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  address: string | null;
  public_phone: string | null;
  public_email: string | null;
  website: string | null;
  working_hours: string | null;
  emergency_service: boolean;
  services: string[];
  species: string[];
  profile_verified: boolean;
  is_sample?: boolean;
};

export type PublicLaboratory = {
  id: string | null;
  slug: string;
  laboratory_name: string;
  laboratory_type: string;
  description: string | null;
  city: string | null;
  province: string | null;
  address: string | null;
  public_phone: string | null;
  public_email: string | null;
  website: string | null;
  working_hours: string | null;
  emergency_service: boolean;
  species_served: string[];
  tests_offered: string[];
  profile_verified: boolean;
  accreditation_verified: boolean;
  is_sample?: boolean;
};

export const sampleVeterinarians: PublicVeterinarian[] = [
  {
    user_id: "sample-sara-ahmed",
    full_name: "Dr. Sara Ahmed",
    qualifications: "DVM",
    specialization: "Small Animal & Pet Practice",
    years_experience: 6,
    city: "Lahore",
    services: ["Clinic consultation", "Video consultation"],
    image_url: null,
    profile_verified: false,
    pvmc_verified: false,
    is_sample: true,
  },
  {
    user_id: "sample-m-hassan",
    full_name: "Dr. M. Hassan",
    qualifications: "DVM",
    specialization: "Livestock & Herd Health",
    years_experience: 8,
    city: "Faisalabad",
    services: ["Farm visit", "Herd advisory"],
    image_url: null,
    profile_verified: false,
    pvmc_verified: false,
    is_sample: true,
  },
  {
    user_id: "sample-r-khan",
    full_name: "Dr. R. Khan",
    qualifications: "DVM",
    specialization: "Poultry Health",
    years_experience: 5,
    city: "Rawalpindi",
    services: ["On-site advisory", "Biosecurity"],
    image_url: null,
    profile_verified: false,
    pvmc_verified: false,
    is_sample: true,
  },
];

export const sampleProfessionals: PublicProfessional[] = [
  {
    user_id: null,
    slug: "sample-animal-nutritionist",
    full_name: "Ayesha Malik",
    professional_type: "Animal Nutritionist",
    headline: "Ruminant nutrition and dairy advisory",
    current_position: "Technical Nutrition Adviser",
    organization_name: "Sample sector profile",
    city: "Lahore",
    province: "Punjab",
    years_experience: 7,
    skills: ["Ruminant nutrition", "Feed formulation"],
    image_url: null,
    profile_verified: false,
    is_sample: true,
  },
  {
    user_id: null,
    slug: "sample-laboratory-professional",
    full_name: "Usman Ali",
    professional_type: "Laboratory Professional",
    headline: "Veterinary microbiology and diagnostics",
    current_position: "Laboratory Technologist",
    organization_name: "Sample sector profile",
    city: "Faisalabad",
    province: "Punjab",
    years_experience: 4,
    skills: ["Microbiology", "Sample handling"],
    image_url: null,
    profile_verified: false,
    is_sample: true,
  },
  {
    user_id: null,
    slug: "sample-farm-manager",
    full_name: "Hammad Raza",
    professional_type: "Dairy Farm Manager",
    headline: "Herd operations and farm management",
    current_position: "Farm Manager",
    organization_name: "Sample sector profile",
    city: "Multan",
    province: "Punjab",
    years_experience: 9,
    skills: ["Herd management", "Farm records"],
    image_url: null,
    profile_verified: false,
    is_sample: true,
  },
];

export const sampleClinics: PublicClinic[] = [
  {
    id: null,
    slug: "sample-companion-animal-clinic",
    clinic_name: "Companion Animal Clinic",
    facility_type: "Veterinary Clinic",
    description: "Sample profile showing the planned clinic directory format.",
    city: "Lahore",
    province: "Punjab",
    address: null,
    public_phone: null,
    public_email: null,
    website: null,
    working_hours: "Profile-controlled",
    emergency_service: false,
    services: ["Consultation", "Vaccination"],
    species: ["Dogs", "Cats"],
    profile_verified: false,
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-livestock-clinic",
    clinic_name: "Livestock & Farm Care Centre",
    facility_type: "Veterinary Hospital",
    description: "Sample profile for livestock and farm veterinary services.",
    city: "Faisalabad",
    province: "Punjab",
    address: null,
    public_phone: null,
    public_email: null,
    website: null,
    working_hours: "Profile-controlled",
    emergency_service: true,
    services: ["Farm visit", "Herd health"],
    species: ["Cattle", "Buffalo"],
    profile_verified: false,
    is_sample: true,
  },
];

export const sampleLaboratories: PublicLaboratory[] = [
  {
    id: null,
    slug: "sample-veterinary-diagnostic-lab",
    laboratory_name: "Veterinary Diagnostic Laboratory",
    laboratory_type: "Diagnostic Laboratory",
    description: "Sample profile showing the planned verified laboratory directory.",
    city: "Lahore",
    province: "Punjab",
    address: null,
    public_phone: null,
    public_email: null,
    website: null,
    working_hours: "Profile-controlled",
    emergency_service: false,
    species_served: ["Poultry", "Livestock", "Pets"],
    tests_offered: ["PCR", "ELISA", "Microbiology"],
    profile_verified: false,
    accreditation_verified: false,
    is_sample: true,
  },
  {
    id: null,
    slug: "sample-feed-water-lab",
    laboratory_name: "Feed, Milk & Water Testing Laboratory",
    laboratory_type: "Analytical Laboratory",
    description: "Sample profile for food-safety and farm-input testing services.",
    city: "Faisalabad",
    province: "Punjab",
    address: null,
    public_phone: null,
    public_email: null,
    website: null,
    working_hours: "Profile-controlled",
    emergency_service: false,
    species_served: ["Dairy", "Poultry", "Livestock"],
    tests_offered: ["Feed analysis", "Milk testing", "Water testing"],
    profile_verified: false,
    accreditation_verified: false,
    is_sample: true,
  },
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !part.toLowerCase().startsWith("dr"))
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "VC";
}
