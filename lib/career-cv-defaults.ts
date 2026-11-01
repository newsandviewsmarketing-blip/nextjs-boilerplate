/** Prefer a saved CV, including intentionally blank fields, over onboarding defaults. */
export function careerCvDefaults(saved: Record<string, string | null> | null, input: {
 name: string; email: string; phone: string | null;
 headline?: string | null; skills?: string[] | null;
 registration?:Record<string,unknown>;
 education: {degree: string; institution: string | null}[];
 experience: {designation: string; organization_name: string; responsibilities: string | null}[];
}) {
 const text=(key:string)=>typeof input.registration?.[key]==='string'?String(input.registration[key]).slice(0,250):'';
 const previousRole=[text('current_designation'),text('current_workplace')].filter(Boolean).join(' | ');
 return saved ?? {
  full_name: input.name, contact_email: input.email, phone: input.phone,
  headline: input.headline ?? '', skills: (input.skills ?? []).join(', '),
  education: input.education.map(row => [row.degree, row.institution].filter(Boolean).join(' | ')).join('\n'),
  experience: input.experience.map(row => [row.designation, row.organization_name, row.responsibilities].filter(Boolean).join(' | ')).join('\n')||previousRole,
 };
}
