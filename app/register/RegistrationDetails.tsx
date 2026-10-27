"use client";
import { useState } from "react";
import { PRACTICE_AREAS, SPECIALIZATIONS, PROFESSIONAL_CATEGORIES, VETERINARY_QUALIFICATIONS, ACADEMIC_QUALIFICATIONS, STUDENT_PROGRAMS_BY_TRACK } from "@/lib/registration-categories";
import { PAKISTAN_LOCATION_OPTIONS } from "@/lib/pakistan-locations";

function visibleLocations(query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return PAKISTAN_LOCATION_OPTIONS.filter(option =>
    option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term)
  ).slice(0, 60);
}

export function PakistanCityField({ id, name, label, required = false }: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  const matches = visibleLocations(query);
  const selected = PAKISTAN_LOCATION_OPTIONS.find(option => option.value === value);
  const choices = selected && !matches.some(option => option.value === selected.value && option.label === selected.label)
    ? [selected, ...matches]
    : matches;
  const groups = [...new Set(choices.map(option => option.province))];

  return <div>
    <label htmlFor={id}>{label}</label>
    <input type="search" aria-label={"Search " + label} autoComplete="off"
      placeholder="Search city, town or district"
      value={query} onChange={event => setQuery(event.target.value)} />
    <select id={id} name={name} required={required} value={value}
      aria-describedby={id + "-help"}
      onChange={event => { setValue(event.target.value); setQuery(""); }}>
      <option value="" disabled>{query ? "Choose a location from the results" : "Search above to choose a location"}</option>
      {groups.map(province => <optgroup label={province} key={province}>
        {choices.filter(option => option.province === province).map(option =>
          <option value={option.value} key={option.label}>{option.label}</option>
        )}
      </optgroup>)}
    </select>
    <small id={id + "-help"}>Select a listed Pakistan city, town or district. If your locality is missing, contact support; free-text locations are not accepted.</small>
  </div>;
}

function QualificationField({ id, name, label, options }: {
  id: string;
  name: string;
  label: string;
  options: readonly string[];
}) {
  const [choice, setChoice] = useState("");
  return <div>
    <label htmlFor={id}>{label}</label>
    <select id={id} name={name + "_choice"} required value={choice} onChange={event => setChoice(event.target.value)}>
      <option value="" disabled>Select qualification</option>
      {options.map(option => <option value={option} key={option}>{option}</option>)}
      <option value="__other__">Other qualification (specify; admin verification required)</option>
    </select>
    {choice === "__other__" && <input name={name + "_other"} maxLength={180} required
      aria-label="Specify qualification title" placeholder="Enter the exact qualification title" />}
  </div>;
}

function ClinicCityField() {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const matches = visibleLocations(query);
  const groups = [...new Set(matches.map(option => option.province))];
  const addCity = (city: string) => {
    if (city && cities.length < 20 && !cities.some(item => item.toLowerCase() === city.toLowerCase())) {
      setCities(previous => [...previous, city]);
    }
    setQuery("");
  };

  return <div className="form-span-2">
    <label htmlFor="clinic-city-search">Additional service cities</label>
    <input id="clinic-city-search" type="search" autoComplete="off"
      placeholder="Search a Pakistan city, town or district"
      value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label="Choose an additional clinic service city" value=""
      disabled={!query.trim() || cities.length >= 20}
      onChange={event => addCity(event.target.value)}>
      <option value="">{query ? "Choose a location from the results" : "Search above to add a city"}</option>
      {groups.map(province => <optgroup label={province} key={province}>
        {matches.filter(option => option.province === province).map(option =>
          <option value={option.value} key={option.label}>{option.label}</option>
        )}
      </optgroup>)}
    </select>
    {cities.length > 0 && <div className="service-checkbox-grid" aria-label="Additional clinic cities">
      {cities.map(city => <span className="checkbox-line" key={city}>
        {city}
        <button type="button" aria-label={"Remove " + city} onClick={() => setCities(previous => previous.filter(item => item !== city))}>×</button>
        <input type="hidden" name="clinic_cities" value={city} />
      </span>)}
    </div>}
    <small>Choose each additional city from the list. You can remove locations before submitting.</small>
  </div>;
}

export default function RegistrationDetails({ role, clinic = false }: { role: string; clinic?: boolean }) {
  const [track, setTrack] = useState("");
  if (role === "veterinarian") return <>
    <QualificationField id="vet-degree" name="qualifications" label="Veterinary qualification *" options={VETERINARY_QUALIFICATIONS} />
    <div><label htmlFor="vet-institution">Awarding university / institution *</label><input id="vet-institution" name="institution" maxLength={180} required /></div>
    <div><label htmlFor="vet-pvmc">PVMC registration number *</label><input id="vet-pvmc" name="pvmc_number" maxLength={70} autoComplete="off" required /><small>Your profile remains private until the submitted number and documents are reviewed.</small></div>
    <fieldset className="form-span-2 service-selector-fieldset"><legend>Practice areas / animal sectors * (select several)</legend><div className="service-checkbox-grid">{PRACTICE_AREAS.map(x => <label className="checkbox-line" key={x}><input type="checkbox" name="practice_areas" value={x} />{x}</label>)}</div></fieldset>
    <fieldset className="form-span-2 service-selector-fieldset"><legend>Specializations (select several)</legend><div className="service-checkbox-grid">{SPECIALIZATIONS.map(x => <label className="checkbox-line" key={x}><input type="checkbox" name="specializations" value={x} />{x}</label>)}</div></fieldset>
    <div className="form-span-2"><label htmlFor="vet-other-specialization">Additional specialization (optional)</label><input id="vet-other-specialization" name="specialization_other" maxLength={120} placeholder="Specify another area of expertise" /></div>
    <p className="form-help form-span-2">Practice rights are not granted until the administrator verifies your qualification and PVMC status.</p>
  </>;
  if (role === "candidate") return <>
    <div><label htmlFor="student-track">Career status *</label><select name="student_track" id="student-track" required value={track} onChange={event => setTrack(event.target.value)}><option value="" disabled>Select status</option><option value="dvm_student">DVM student</option><option value="postgraduate_student">Postgraduate student (MPhil / MSc)</option><option value="phd_student">PhD student</option><option value="job_seeker">Graduate / job seeker</option></select></div>
    {track === "job_seeker" ? <>
      <QualificationField id="job-qualification" name="highest_qualification" label="Highest qualification *" options={ACADEMIC_QUALIFICATIONS} />
      <div><label htmlFor="job-institution">Awarding institution *</label><input name="institution" id="job-institution" maxLength={180} required /></div>
      <div><label htmlFor="career-interest">Career interests / desired role</label><input name="career_interest" id="career-interest" maxLength={180} placeholder="Internships, animal health, nutrition, research" /></div>
    </> : track ? <>
      <div><label htmlFor="student-institution">College / university *</label><input name="institution" id="student-institution" maxLength={180} required /></div>
      <QualificationField id="student-program" name="study_program" label="Program / field *" options={STUDENT_PROGRAMS_BY_TRACK[track as keyof typeof STUDENT_PROGRAMS_BY_TRACK]} />
      <div><label htmlFor="college-reg">College / university registration number *</label><input name="student_college_registration_number" id="college-reg" maxLength={75} required /></div>
      <div><label htmlFor="pvmc-student">PVMC student reference (if issued)</label><input name="pvmc_student_reference" id="pvmc-student" maxLength={75} /><small>This is not an RVMP practitioner licence.</small></div>
      <div><label htmlFor="student-year">Academic year / semester</label><input name="academic_year" id="student-year" maxLength={180} /></div>
    </> : <p className="form-help form-span-2">Select a career status to see the information required for your pathway.</p>}
    <p className="form-help form-span-2">Students submit current institutional evidence. Graduates and job seekers submit their highest qualification. Neither pathway authorizes veterinary practice.</p>
  </>;
  if (role === "professional") return <>
    <details className="form-span-2 service-selector-fieldset">
      <summary>Professional categories * <span>(choose all that apply)</span></summary>
      <div className="service-checkbox-grid">{PROFESSIONAL_CATEGORIES.map((x, i) => <label className="checkbox-line" key={x}><input type="checkbox" name="professional_types" value={x} id={"allied-role-" + i} />{x}</label>)}</div>
    </details>
    <QualificationField id="allied-qualification" name="highest_qualification" label="Highest qualification *" options={ACADEMIC_QUALIFICATIONS} />
    <div><label htmlFor="allied-institution">Awarding university / institution *</label><input id="allied-institution" name="institution" maxLength={180} required /></div>
    <details className="form-span-2 service-selector-fieldset">
      <summary>Industry sectors * <span>(choose all that apply)</span></summary>
      <div className="service-checkbox-grid">{PRACTICE_AREAS.map((x, i) => <label className="checkbox-line" key={x}><input type="checkbox" name="industry_sectors" value={x} id={"allied-sector-" + i} />{x}</label>)}</div>
    </details>
    <div><label htmlFor="allied-org">Organization / employer</label><input name="organization_name" id="allied-org" maxLength={180} /></div>
    <div className="form-span-2"><label htmlFor="allied-spec">Area of expertise *</label><input id="allied-spec" name="specialization_other" maxLength={120} required /></div>
    <p className="form-help form-span-2">Select every relevant category and sector. Your profile will use the first selected category as its main heading and retain the full list for search and profile display.</p>
    <p className="form-help form-span-2">Upload evidence for your education and credentials. Allied-professional registration does not authorize veterinary practice.</p>
  </>;
  if (role === "company" && clinic) return <>
    <div><label htmlFor="clinic-name">Clinic / veterinary hospital name *</label><input name="organization_name" id="clinic-name" required maxLength={180} /></div>
    <div><label htmlFor="facility-type">Facility type *</label><select name="facility_type" id="facility-type" required><option>Veterinary Clinic</option><option>Pet Clinic</option><option>Veterinary Hospital</option><option>Mobile Veterinary Service</option><option>Farm Veterinary Clinic</option></select></div>
    <div><label htmlFor="company-reg-clinic">Business registration / NTN *</label><input name="company_registration_number" id="company-reg-clinic" maxLength={180} required /></div>
    <div><label htmlFor="clinic-address">Primary facility address *</label><input name="facility_address" id="clinic-address" maxLength={250} required /></div>
    <ClinicCityField />
    <div><label htmlFor="clinic-vet">Responsible veterinarian full name *</label><input name="responsible_veterinarian" id="clinic-vet" maxLength={180} required /></div>
    <div><label htmlFor="clinic-pvmc">Responsible veterinarian PVMC registration number *</label><input name="pvmc_number" id="clinic-pvmc" required maxLength={70} /></div>
  </>;
  if (role === "company") return <>
    <div><label htmlFor="company-name">Company / employer registered name *</label><input name="organization_name" id="company-name" required maxLength={180} /></div>
    <div><label htmlFor="company-type">Organization type *</label><select id="company-type" name="company_type" required><option>Veterinary Pharmaceuticals</option><option>Feed / Nutrition</option><option>Livestock / Dairy</option><option>Poultry</option><option>Distribution / Retail</option><option>Farm / Producer</option><option>Recruitment / HR</option><option>Other</option></select></div>
    <div><label htmlFor="company-reg">Company registration / NTN *</label><input name="company_registration_number" id="company-reg" maxLength={180} required /></div>
    <div><label htmlFor="company-sector">Business sector *</label><input name="industry_sector" id="company-sector" maxLength={180} required /></div>
    <p className="form-help form-span-2">Job providers register their business once. After approval, the same company account can manage job listings without re-entering its business credentials.</p>
  </>;
  if (role === "laboratory") return <>
    <div><label htmlFor="lab-name">Diagnostic laboratory name *</label><input name="organization_name" id="lab-name" required maxLength={180} /></div>
    <div><label htmlFor="lab-type">Laboratory type *</label><select id="lab-type" name="laboratory_type" required><option>Veterinary Diagnostic Laboratory</option><option>Poultry Diagnostic Laboratory</option><option>Animal Health / Research Laboratory</option><option>Other</option></select></div>
    <div><label htmlFor="lab-registration">Laboratory registration / licence number *</label><input id="lab-registration" name="laboratory_registration_number" maxLength={120} required /></div>
    <div><label htmlFor="lab-tests">Tests / services offered *</label><input id="lab-tests" name="tests_offered" maxLength={250} required /></div>
    <div><label htmlFor="lab-location">Laboratory street address *</label><input id="lab-location" name="lab_location" maxLength={250} required /></div>
  </>;
  return <>
    <div><label htmlFor="customer-type">Customer profile *</label><select id="customer-type" name="customer_type" required><option>Pet Owner</option><option>Farmer / Livestock Owner</option><option>Poultry Farmer</option><option>Shopkeeper / Retailer</option><option>Other Animal Owner</option></select></div>
    <div><label htmlFor="animal-interest">Animal species / service interests</label><input name="animal_interest" id="animal-interest" maxLength={180} /></div>
  </>;
}
