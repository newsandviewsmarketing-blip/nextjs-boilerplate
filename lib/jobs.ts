export type PublicJob = {
  id: string | null;
  slug: string;
  title: string;
  description: string;
  sector: string | null;
  city: string | null;
  province: string | null;
  employment_type: string;
  minimum_qualification: string | null;
  minimum_experience: number;
  deadline: string | null;
  company_user_id: string | null;
  company_name: string;
  is_sample?: boolean;
};

export const sampleJobs: PublicJob[] = [
  ["Veterinary Officer", "Animal Health Company", "Lahore", "Livestock", "Full-time"],
  ["Technical Sales Executive", "Veterinary Nutrition Company", "Faisalabad", "Feed & Nutrition", "Full-time"],
  ["Poultry Veterinarian", "Poultry Company", "Lahore", "Poultry", "Full-time"],
  ["Veterinary Intern", "Clinical Practice", "Islamabad", "Pets", "Internship"],
  ["Quality Assurance Officer", "Animal Health Manufacturer", "Karachi", "Pharmaceutical", "Full-time"],
  ["Research Assistant", "Veterinary Research Project", "Multan", "Research", "Contract"],
].map(([title, company_name, city, sector, employment_type], index) => ({
  id: null,
  slug: `sample-job-${index + 1}`,
  title,
  description: "Sample opportunity showing the planned structured VetConnect job format.",
  sector,
  city,
  province: null,
  employment_type,
  minimum_qualification: null,
  minimum_experience: 0,
  deadline: null,
  company_user_id: null,
  company_name,
  is_sample: true,
}));
