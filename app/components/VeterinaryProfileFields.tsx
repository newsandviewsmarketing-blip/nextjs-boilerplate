"use client";

import { useEffect, useMemo, useState } from "react";

type MasterItem = { id: string; label: string; parent_id?: string | null };

const fallbackMap: Record<string, string[]> = {
  Poultry: ["Poultry Health & Disease", "Poultry Production", "Poultry Nutrition", "Poultry Pathology", "Hatchery & Breeder Management", "Poultry Biosecurity"],
  "Dairy / Cattle": ["Dairy Herd Health", "Bovine Medicine", "Dairy Production", "Mastitis Control", "Reproduction & Theriogenology", "Dairy Nutrition"],
  "Livestock / Small Ruminants": ["Large Animal Medicine", "Small Ruminant Medicine", "Livestock Production", "Reproduction & Theriogenology", "Herd Health", "Field Veterinary Practice"],
  "Pets / Companion Animals": ["Small Animal Medicine", "Small Animal Surgery", "Dermatology", "Cardiology", "Orthopedics", "Diagnostic Imaging", "Emergency & Critical Care"],
  Equine: ["Equine Medicine", "Equine Surgery", "Equine Reproduction", "Sports Medicine"],
  "Aquaculture / Fisheries": ["Aquatic Animal Health", "Fish Pathology", "Aquaculture Production", "Aquatic Nutrition"],
  "Public Health / One Health": ["Veterinary Public Health", "Food Safety", "Epidemiology", "Zoonoses", "One Health", "Disease Surveillance"],
  "Diagnostics / Laboratory": ["Veterinary Pathology", "Microbiology", "Parasitology", "Virology", "Molecular Diagnostics", "Clinical Pathology"],
  "Feed / Nutrition": ["Animal Nutrition", "Feed Formulation", "Feed Safety", "Mycotoxin Management"],
  "Wildlife / Zoo": ["Wildlife Medicine", "Zoo Animal Medicine", "Conservation Medicine"],
  "Pharmaceutical / Industry": ["Technical Services", "Regulatory Affairs", "Veterinary Pharmaceuticals", "Vaccines & Biologics", "Sales & Marketing"],
  "Academia / Research": ["Teaching", "Clinical Research", "Animal Health Research", "Epidemiological Research", "Veterinary Extension"],
};

const fallbackServices = ["Clinical consultation", "Farm visit", "Vaccination", "Disease diagnosis", "Treatment", "Surgery", "Reproductive services", "Nutrition advisory", "Biosecurity audit", "Laboratory interpretation", "Herd/flock health planning", "Tele-consultation", "Training", "Technical consultancy"];

async function fetchItems(category: string, parentId?: string) {
  const params = new URLSearchParams({ category });
  if (parentId) params.set("parent_id", parentId);
  const response = await fetch(`/api/master-data?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return [] as MasterItem[];
  const payload = await response.json();
  return (payload.items ?? []) as MasterItem[];
}

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
  const [sectors, setSectors] = useState<MasterItem[]>([]);
  const [dynamicSpecializations, setDynamicSpecializations] = useState<MasterItem[]>([]);
  const [services, setServices] = useState<MasterItem[]>([]);

  useEffect(() => {
    Promise.all([fetchItems("veterinary_sector"), fetchItems("veterinary_service")])
      .then(([sectorRows, serviceRows]) => {
        setSectors(sectorRows);
        setServices(serviceRows);
      })
      .catch(() => undefined);
  }, []);

  const selectedSectorId = sectors.find((item) => item.label === sector)?.id;
  useEffect(() => {
    if (!selectedSectorId) {
      setDynamicSpecializations([]);
      return;
    }
    fetchItems("veterinary_specialization", selectedSectorId)
      .then(setDynamicSpecializations)
      .catch(() => setDynamicSpecializations([]));
  }, [selectedSectorId]);

  const sectorLabels = useMemo(() => {
    const dynamic = sectors.map((item) => item.label);
    return [...new Set([...dynamic, ...Object.keys(fallbackMap), ...(defaultSector ? [defaultSector] : [])])];
  }, [sectors, defaultSector]);
  const specializationLabels = useMemo(() => {
    const dynamic = dynamicSpecializations.map((item) => item.label);
    return [...new Set([...dynamic, ...(fallbackMap[sector] ?? []), ...(defaultSpecialization ? [defaultSpecialization] : [])])];
  }, [dynamicSpecializations, sector, defaultSpecialization]);
  const serviceLabels = useMemo(() => [...new Set([...services.map((item) => item.label), ...fallbackServices, ...defaultServices])], [services, defaultServices]);

  return (
    <>
      <div>
        <label htmlFor="veterinary_sector">Primary veterinary sector</label>
        <select id="veterinary_sector" name="veterinary_sector" value={sector} onChange={(event) => { setSector(event.target.value); setSpecialization(""); }} required>
          <option value="">Select sector</option>
          {sectorLabels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="specialization">Specialization</label>
        <select id="specialization" name="specialization" value={specialization} onChange={(event) => setSpecialization(event.target.value)} disabled={!sector} required>
          <option value="">Select specialization</option>
          {specializationLabels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <fieldset className="form-span-2 service-selector-fieldset">
        <legend>Services offered</legend>
        <div className="service-checkbox-grid">
          {serviceLabels.map((item) => (
            <label className="checkbox-line" key={item}>
              <input type="checkbox" name="services" value={item} defaultChecked={defaultServices.includes(item)} />
              {item}
            </label>
          ))}
        </div>
        <p className="form-help">This vocabulary is database-driven. New active services added by an authorized administrator appear automatically.</p>
      </fieldset>
    </>
  );
}
