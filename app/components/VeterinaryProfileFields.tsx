"use client";

import { useMemo, useState } from "react";

const specializationMap: Record<string, string[]> = {
  Poultry: [
    "Poultry Health & Disease",
    "Poultry Production",
    "Poultry Nutrition",
    "Poultry Pathology",
    "Hatchery & Breeder Management",
    "Poultry Biosecurity",
  ],
  "Dairy / Cattle": [
    "Dairy Herd Health",
    "Bovine Medicine",
    "Dairy Production",
    "Mastitis Control",
    "Reproduction & Theriogenology",
    "Dairy Nutrition",
  ],
  "Livestock / Small Ruminants": [
    "Large Animal Medicine",
    "Small Ruminant Medicine",
    "Livestock Production",
    "Reproduction & Theriogenology",
    "Herd Health",
    "Field Veterinary Practice",
  ],
  "Pets / Companion Animals": [
    "Small Animal Medicine",
    "Small Animal Surgery",
    "Dermatology",
    "Cardiology",
    "Orthopedics",
    "Diagnostic Imaging",
    "Emergency & Critical Care",
  ],
  Equine: [
    "Equine Medicine",
    "Equine Surgery",
    "Equine Reproduction",
    "Sports Medicine",
  ],
  "Aquaculture / Fisheries": [
    "Aquatic Animal Health",
    "Fish Pathology",
    "Aquaculture Production",
    "Aquatic Nutrition",
  ],
  "Public Health / One Health": [
    "Veterinary Public Health",
    "Food Safety",
    "Epidemiology",
    "Zoonoses",
    "One Health",
    "Disease Surveillance",
  ],
  "Diagnostics / Laboratory": [
    "Veterinary Pathology",
    "Microbiology",
    "Parasitology",
    "Virology",
    "Molecular Diagnostics",
    "Clinical Pathology",
  ],
  "Feed / Nutrition": [
    "Animal Nutrition",
    "Feed Formulation",
    "Feed Safety",
    "Mycotoxin Management",
  ],
  "Wildlife / Zoo": [
    "Wildlife Medicine",
    "Zoo Animal Medicine",
    "Conservation Medicine",
  ],
  "Pharmaceutical / Industry": [
    "Technical Services",
    "Regulatory Affairs",
    "Veterinary Pharmaceuticals",
    "Vaccines & Biologics",
    "Sales & Marketing",
  ],
  "Academia / Research": [
    "Teaching",
    "Clinical Research",
    "Animal Health Research",
    "Epidemiological Research",
    "Veterinary Extension",
  ],
};

const serviceOptions = [
  "Clinical consultation",
  "Farm visit",
  "Vaccination",
  "Disease diagnosis",
  "Treatment",
  "Surgery",
  "Reproductive services",
  "Nutrition advisory",
  "Biosecurity audit",
  "Laboratory interpretation",
  "Herd/flock health planning",
  "Tele-consultation",
  "Training",
  "Technical consultancy",
];

export default function VeterinaryProfileFields({
  defaultSector = "",
  defaultSpecialization = "",
  defaultServices = [],
}: {
  defaultSector?: string;
  defaultSpecialization?: string;
  defaultServices?: string[];
}) {
  const [sector, setSector] = useState(defaultSector);
  const [specialization, setSpecialization] = useState(defaultSpecialization);
  const specializations = useMemo(
    () => specializationMap[sector] ?? [],
    [sector],
  );

  return (
    <>
      <div>
        <label htmlFor="veterinary_sector">Primary veterinary sector</label>
        <select
          id="veterinary_sector"
          name="veterinary_sector"
          value={sector}
          onChange={(event) => {
            setSector(event.target.value);
            setSpecialization("");
          }}
          required
        >
          <option value="">Select sector</option>
          {Object.keys(specializationMap).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="specialization">Specialization</label>
        <select
          id="specialization"
          name="specialization"
          value={specialization}
          onChange={(event) => setSpecialization(event.target.value)}
          disabled={!sector}
          required
        >
          <option value="">Select specialization</option>
          {defaultSpecialization && !specializations.includes(defaultSpecialization) && (
            <option value={defaultSpecialization}>{defaultSpecialization}</option>
          )}
          {specializations.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <fieldset className="form-span-2 service-selector-fieldset">
        <legend>Services offered</legend>
        <div className="service-checkbox-grid">
          {serviceOptions.map((item) => (
            <label className="checkbox-line" key={item}>
              <input
                type="checkbox"
                name="services"
                value={item}
                defaultChecked={defaultServices.includes(item)}
              />
              {item}
            </label>
          ))}
        </div>
        <p className="form-help">
          Select every service that can appear on your verified public profile.
        </p>
      </fieldset>
    </>
  );
}
