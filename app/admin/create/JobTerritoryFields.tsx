"use client";

import { useEffect, useMemo, useState } from "react";

type AreaName = { en: string; local?: string };
type Tehsil = { id: string; name: AreaName };
type District = { id: string; name: AreaName; tehsil?: Tehsil[] };
type Province = { id: string; name: AreaName; district?: District[] };
type Hierarchy = { data?: Province[] };

const DATA_URL = "https://raw.githubusercontent.com/open-admin-data/pakistan-administrative-divisions/main/data/hierarchy.json";
const PROVINCES = [
  "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan",
  "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu and Kashmir",
];
const SCOPES = [
  ["nationwide", "Nationwide (all Pakistan)"],
  ["province", "Province / territory"],
  ["region", "Company region / sales zone"],
  ["territory", "Company sales territory"],
  ["area", "Company sales area"],
  ["district", "One or more districts"],
  ["city", "One or more cities / towns"],
  ["multiple", "Selected locations"],
  ["flexible", "Location not specified / flexible"],
] as const;
const unique = (values: string[]) => [...new Set(values.map(v => v.trim()).filter(Boolean))];
export default function JobTerritoryFields() {
  const [scope, setScope] = useState("province");
  const [province, setProvince] = useState("");
  const [region, setRegion] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityText, setCityText] = useState("");
  const [tehsil, setTehsil] = useState("");
  const [showTehsil, setShowTehsil] = useState(false);
  const [hierarchy, setHierarchy] = useState<Province[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [manualDistrict, setManualDistrict] = useState("");

  useEffect(() => {
    let active = true;
    fetch(DATA_URL, {cache: "force-cache"})
      .then(res => {
        if (!res.ok) throw new Error("Location list unavailable");
        return res.json() as Promise<Hierarchy>;
      })
      .then(res => { if (active) setHierarchy(res.data ?? []); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, []);

  const choices = useMemo(
    () => hierarchy.find(p => p.name.en === province)?.district ?? [],
    [hierarchy, province],
  );
  const townSuggestions = useMemo(
    () => unique(choices.filter(d => districts.length === 0 || districts.includes(d.name.en))
      .flatMap(d => (d.tehsil ?? []).map(t => t.name.en))),
    [choices, districts],
  );
  const asksProvince = !["nationwide", "flexible"].includes(scope);
  const hasSubareas = asksProvince;
  const hasRegion = ["region","territory","area"].includes(scope);

  const toggleDistrict = (name: string) => {
    setDistricts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };
  const addCity = () => {
    const name = cityText.trim();
    if (name) setCities(prev => unique([...prev, name]));
    setCityText("");
  };
  const derivedDisplay = scope === "nationwide" ? "Across Pakistan"
    : scope === "flexible" ? "Location not specified"
    : hasRegion ? [region, province, ...districts, ...cities].filter(Boolean).join(" · ")
    : [province, ...districts, ...cities].filter(Boolean).join(" · ");

  return <>
    <div>
      <label htmlFor="coverage_scope">Recruitment coverage *</label>
      <select id="coverage_scope" name="coverage_scope" value={scope} onChange={e => {
        setScope(e.target.value); setDistricts([]); setCities([]); setRegion(""); setTehsil("");
      }} required>
        {SCOPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </div>
    {asksProvince && <div>
      <label htmlFor="province">Province / territory *</label>
      <select id="province" name="province" value={province} onChange={e => {
        setProvince(e.target.value); setDistricts([]); setCities([]); setTehsil("");
      }} required>
        <option value="">Select province</option>
        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>}
    {hasRegion && <div className="form-span-2">
      <label htmlFor="region_name">{scope === "region" ? "Region / zone" : scope === "territory" ? "Territory name" : "Area name"} *</label>
      <input id="region_name" name="region_name" value={region}
        onChange={e => setRegion(e.target.value)} placeholder="Region 1 / South Zone / Faisalabad Territory" required />
      <p className="form-help">This name belongs to the selected employer; it is not an official administrative district.</p>
    </div>}
    {hasSubareas && province && <div className="form-span-2">
      <label>Districts (select one, several, or leave blank)</label>
      {choices.length > 0 ? <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:"8px",padding:"12px",border:"1px solid #d8e0eb",borderRadius:"9px",
        maxHeight:"220px",overflowY:"auto"
      }}>
        {choices.map(d => <label key={d.id} style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"13px"}}>
          <input type="checkbox" checked={districts.includes(d.name.en)} onChange={() => toggleDistrict(d.name.en)}/>
          {d.name.en}
        </label>)}
      </div> : <div>
        <input value={manualDistrict} onChange={e=>setManualDistrict(e.target.value)}
          placeholder="Enter district (when suggestions are unavailable)"/>
        <button type="button" className="button button-secondary" onClick={()=>{
          if(manualDistrict.trim()) setDistricts(prev=>unique([...prev, manualDistrict]));
          setManualDistrict("");
        }}>Add district</button>
        {loadFailed && <p className="form-help">The geographic list could not load. Manual district entry is available.</p>}
      </div>}
      {districts.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"}}>
        {districts.map(d => <button type="button" className="button button-secondary" key={d}
          onClick={()=>toggleDistrict(d)}>{d} ×</button>)}
      </div>}
      <input type="hidden" name="coverage_districts" value={districts.join(",")} />
      <p className="form-help">Select only districts named in the advertisement. Tehsil is not required.</p>
    </div>}
    {hasSubareas && province && <div className="form-span-2">
      <label htmlFor="city_to_add">Cities / towns (optional, multiple)</label>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <input id="city_to_add" style={{flex:"1 1 220px"}} value={cityText} list="job-town-suggestions"
          onChange={e=>setCityText(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();addCity();}}}
          placeholder="Select or type city, then Add" />
        <button type="button" className="button button-secondary" onClick={addCity}>Add city</button>
      </div>
      <datalist id="job-town-suggestions">
        {townSuggestions.map(name=><option key={name} value={name}/>)}
      </datalist>
      {cities.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"}}>
        {cities.map(c=><button type="button" className="button button-secondary" key={c}
          onClick={()=>setCities(prev=>prev.filter(x=>x!==c))}>{c} ×</button>)}
      </div>}
      <input type="hidden" name="coverage_cities" value={cities.join(",")} />
      <p className="form-help">Town suggestions follow the available administrative dataset; other cities may be typed. Leaving this blank does not create a city record.</p>
    </div>}
    {hasSubareas && province && <div className="form-span-2">
      <label style={{display:"flex",gap:"8px",alignItems:"center"}}>
        <input type="checkbox" checked={showTehsil} onChange={e=>{setShowTehsil(e.target.checked);if(!e.target.checked)setTehsil("");}}/>
        Add tehsil / taluka (only when supplied in the advertisement)
      </label>
      {showTehsil && <input name="tehsil" value={tehsil} onChange={e=>setTehsil(e.target.value)}
        placeholder="Optional tehsil or taluka"/>}
    </div>}
    <div className="form-span-2">
      <label htmlFor="coverage_display">Advertised location text (optional)</label>
      <input id="coverage_display" name="coverage_display" placeholder="All major cities of Punjab"/>
      <p className="form-help">If left blank, VetConnect derives a display label only from selected values. Unselected city/district/tehsil fields are hidden from the public job listing.</p>
    </div>
    <div className="form-span-2">
      <p className="form-help"><strong>Location preview:</strong> {derivedDisplay || "Choose province or territory"}</p>
    </div>
  </>;
}
