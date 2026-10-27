import { PRACTICE_AREAS, SPECIALIZATIONS } from "@/lib/registration-categories";

export default function RegistrationDetails({ role, clinic = false }: { role: string; clinic?: boolean }) {
  if (role === "veterinarian") return <>
    <div><label htmlFor="vet-degree">Veterinary qualification *</label><select id="vet-degree" name="qualifications" required defaultValue=""><option value="" disabled>Select degree</option><option value="DVM">DVM</option><option value="BVSc">BVSc (where PVMC-recognized)</option></select></div>
    <div><label htmlFor="vet-institution">Awarding university / institution *</label><input id="vet-institution" name="institution" maxLength={180} required/></div>
    <div><label htmlFor="vet-pvmc">PVMC registration number *</label><input id="vet-pvmc" name="pvmc_number" maxLength={70} autoComplete="off" required/><small>Your profile remains private until the submitted number and documents are reviewed.</small></div>
    <fieldset className="form-span-2 service-selector-fieldset"><legend>Practice areas / animal sectors * (select several)</legend><div className="service-checkbox-grid">{PRACTICE_AREAS.map(x=><label className="checkbox-line" key={x}><input type="checkbox" name="practice_areas" value={x}/>{x}</label>)}</div></fieldset>
    <fieldset className="form-span-2 service-selector-fieldset"><legend>Specializations (select several)</legend><div className="service-checkbox-grid">{SPECIALIZATIONS.map(x=><label className="checkbox-line" key={x}><input type="checkbox" name="specializations" value={x}/>{x}</label>)}</div></fieldset>
    <div className="form-span-2"><label htmlFor="vet-other-specialization">Additional specialization (optional)</label><input id="vet-other-specialization" name="specialization_other" maxLength={120} placeholder="Specify another area of expertise"/></div>
    <p className="form-help form-span-2">You may work across pets, dairy, livestock and poultry. Practice rights are not granted until the administrator verifies your qualifications and PVMC status.</p>
  </>;
  if (role === "candidate") return <>
    <div><label htmlFor="student-track">Career status *</label><select name="student_track" id="student-track" required defaultValue=""><option value="" disabled>Select status</option><option value="dvm_student">DVM student</option><option value="postgraduate_student">Postgraduate student (MPhil / MSc)</option><option value="phd_student">PhD student</option><option value="job_seeker">Graduate / job seeker</option></select></div>
    <div><label htmlFor="student-institution">College / university *</label><input name="institution" id="student-institution" maxLength={180} required/></div>
    <div><label htmlFor="student-program">Program / field *</label><input name="study_program" id="student-program" placeholder="DVM, MPhil, PhD, Animal Nutrition" maxLength={180} required/></div>
    <div><label htmlFor="college-reg">College / university registration number *</label><input name="student_college_registration_number" id="college-reg" maxLength={75} required/></div>
    <div><label htmlFor="student-qualification">Highest qualification (for graduates)</label><input name="highest_qualification" id="student-qualification" maxLength={180} placeholder="DVM, BSc, MSc, MPhil, PhD"/></div>
    <div><label htmlFor="pvmc-student">PVMC student reference (if issued)</label><input name="pvmc_student_reference" id="pvmc-student" maxLength={75}/><small>This is not an RVMP practitioner licence.</small></div>
    <div><label htmlFor="student-year">Academic year / semester</label><input name="academic_year" id="student-year" maxLength={180}/></div>
    <div><label htmlFor="career-interest">Career interests / desired role</label><input name="career_interest" id="career-interest" maxLength={180} placeholder="Internships, animal health, nutrition, research"/></div>
    <p className="form-help form-span-2">Student registration does not authorize veterinary practice. Students submit institutional evidence; job seekers submit their highest qualification.</p>
  </>;
  if (role === "professional") return <>
    <div><label htmlFor="allied-role">Industry professional category *</label><select id="allied-role" name="professional_type" required defaultValue=""><option value="" disabled>Select role</option>{["Animal Nutritionist","Dairy Nutritionist","Farm Manager","Livestock Production Specialist","Poultry Professional","Veterinary Sales / Marketing","Laboratory Technologist","Researcher / Academic","Feed Formulation Specialist","Other Allied Professional"].map(x=><option key={x}>{x}</option>)}</select></div>
    <div><label htmlFor="allied-qualification">Highest qualification *</label><input id="allied-qualification" name="highest_qualification" placeholder="BSc, MSc, MPhil, PhD, diploma" maxLength={180} required/></div>
    <div><label htmlFor="allied-sector">Sector *</label><select name="industry_sector" id="allied-sector" required defaultValue=""><option value="" disabled>Select sector</option>{PRACTICE_AREAS.map(x=><option key={x}>{x}</option>)}</select></div>
    <div><label htmlFor="allied-org">Organization / employer</label><input name="organization_name" id="allied-org" maxLength={180}/></div>
    <div className="form-span-2"><label htmlFor="allied-spec">Area of expertise *</label><input id="allied-spec" name="specialization_other" maxLength={120} required/></div>
    <p className="form-help form-span-2">Veterinary, nutrition, poultry, dairy, livestock and allied professionals submit proof of their listed education and credentials.</p>
  </>;
  if (role === "company" && clinic) return <>
    <div><label htmlFor="clinic-name">Clinic / veterinary hospital name *</label><input name="organization_name" id="clinic-name" required maxLength={180}/></div>
    <div><label htmlFor="facility-type">Facility type *</label><select name="facility_type" id="facility-type" required><option>Veterinary Clinic</option><option>Pet Clinic</option><option>Veterinary Hospital</option><option>Mobile Veterinary Service</option><option>Farm Veterinary Clinic</option></select></div>
    <div><label htmlFor="company-reg-clinic">Business registration / NTN *</label><input name="company_registration_number" id="company-reg-clinic" maxLength={180} required/></div>
    <div><label htmlFor="clinic-address">Facility address *</label><input name="facility_address" id="clinic-address" maxLength={250} required/></div>
    <div><label htmlFor="clinic-vet">Responsible veterinarian full name *</label><input name="responsible_veterinarian" id="clinic-vet" maxLength={180} required/></div>
    <div><label htmlFor="clinic-pvmc">Responsible veterinarian PVMC registration number *</label><input name="pvmc_number" id="clinic-pvmc" required maxLength={70}/></div>
  </>;
  if (role === "company") return <>
    <div><label htmlFor="company-name">Company / employer registered name *</label><input name="organization_name" id="company-name" required maxLength={180}/></div>
    <div><label htmlFor="company-type">Organization type *</label><select id="company-type" name="company_type" required><option>Veterinary Pharmaceuticals</option><option>Feed / Nutrition</option><option>Livestock / Dairy</option><option>Poultry</option><option>Distribution / Retail</option><option>Farm / Producer</option><option>Recruitment / HR</option><option>Other</option></select></div>
    <div><label htmlFor="company-reg">Company registration / NTN *</label><input name="company_registration_number" id="company-reg" maxLength={180} required/></div>
    <div><label htmlFor="company-sector">Business sector *</label><input name="industry_sector" id="company-sector" maxLength={180} required/></div>
    <p className="form-help form-span-2">Job providers register their business once. After approval, the same company account can manage job listings without re-entering its business credentials.</p>
  </>;
  if (role === "laboratory") return <>
    <div><label htmlFor="lab-name">Diagnostic laboratory name *</label><input name="organization_name" id="lab-name" required maxLength={180}/></div>
    <div><label htmlFor="lab-type">Laboratory type *</label><select id="lab-type" name="laboratory_type" required><option>Veterinary Diagnostic Laboratory</option><option>Poultry Diagnostic Laboratory</option><option>Animal Health / Research Laboratory</option><option>Other</option></select></div>
    <div><label htmlFor="lab-registration">Laboratory registration / licence number *</label><input id="lab-registration" name="laboratory_registration_number" maxLength={120} required/></div>
    <div><label htmlFor="lab-tests">Tests / services offered *</label><input id="lab-tests" name="tests_offered" maxLength={250} required/></div>
    <div><label htmlFor="lab-location">Laboratory address / city *</label><input id="lab-location" name="lab_location" maxLength={250} required/></div>
  </>;
  return <>
    <div><label htmlFor="customer-type">Customer profile *</label><select id="customer-type" name="customer_type" required><option>Pet Owner</option><option>Farmer / Livestock Owner</option><option>Poultry Farmer</option><option>Shopkeeper / Retailer</option><option>Other Animal Owner</option></select></div>
    <div><label htmlFor="animal-interest">Animal species / service interests</label><input name="animal_interest" id="animal-interest" maxLength={180}/></div>
  </>;
}
