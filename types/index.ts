export type AccountRole =
  | "super_admin"
  | "career_admin"
  | "user"
  | "veterinarian"
  | "company"
  | "candidate";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VeterinarianProfile {
  id: string;
  name: string;
  role: string;
  city: string;
  species: string[];
  serviceModes: string[];
  imageUrl: string | null;
  verificationStatus: VerificationStatus;
}

export interface CompanyProfile {
  id: string;
  name: string;
  businessType: string;
  city: string;
  verificationStatus: VerificationStatus;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  city: string;
  employmentType: string;
  sector: string;
}

export interface CourseListing {
  id: string;
  title: string;
  provider: string;
  deliveryMode: "online" | "onsite" | "hybrid";
}

export interface ProductListing {
  id: string;
  name: string;
  company: string;
  category: string;
  informationOnly: true;
}
