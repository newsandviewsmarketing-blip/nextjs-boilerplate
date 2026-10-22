"use client";
import { useState } from "react";

const scopes = [
  ["nationwide", "Nationwide"], ["province", "Province-wide"],
  ["region", "Company region / zone"], ["district", "Districts"],
  ["city", "Cities"], ["multiple", "Multiple locations"], ["flexible", "Flexible / not specified"],
] as const;
export default function JobTerritoryFields() {
  const [scope, setScope] = useState("province");
  const [province, setProvince] = useState("");
  const [areas, setAreas] = useState("");
  const [region, setRegion] = useState("");
  return <>
    <div><label htmlFor="coverage_scope">Recruitment coverage *</label>
      <select id="coverage_scope" name="coverage_scope" value={scope} onChange={e=>setScope(e.target.value)} required>
        {scopes.map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
    </div>
    {scope!=="nationwide"&&scope!=="flexible"&&<div>
      <label htmlFor="province">Province / territory</label>
      <select id="province" name="province" value={province} onChange={e=>setProvince(e.target.value)} required>
        <option value="">Select province / territory</option>
        {["Punjab","Sindh","Khyber Pakhtunkhwa","Balochistan","Islamabad Capital Territory","Gilgit-Baltistan","Azad Jammu and Kashmir"].map(p=><option key={p}>{p}</option>)}
      </select>
    </div>}
    {scope==="region"&&<div>
      <label htmlFor="region_name">Company-specific region name *</label>
      <input id="region_name" name="region_name" value={region} onChange={e=>setRegion(e.target.value)} placeholder="Region 1 / South Zone" required/>
    </div>}
    {["district","city","multiple","region"].includes(scope)&&<div className="form-span-2">
      <label htmlFor="covered_areas">Covered districts / cities (comma separated)</label>
      <input id="covered_areas" name="covered_areas" value={areas} onChange={e=>setAreas(e.target.value)} placeholder="Lahore, Faisalabad, Multan" required={scope==="city"||scope==="district"}/>
      <p className="form-help">Add only locations confirmed by the employer. Region labels belong to the selected company.</p>
    </div>}
    <div className="form-span-2">
      <label htmlFor="coverage_display">Location as stated in job advertisement *</label>
      <input id="coverage_display" name="coverage_display" placeholder="All major cities of Punjab" required/>
      <p className="form-help">Unspecified cities are not automatically treated as confirmed vacancies.</p>
    </div>
  </>;
}
