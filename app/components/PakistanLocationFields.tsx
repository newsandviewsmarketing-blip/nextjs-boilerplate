"use client";

import { useEffect, useMemo, useState } from "react";

type Name = { en: string; local?: string };
type Tehsil = { id: string; name: Name };
type District = { id: string; name: Name; tehsil?: Tehsil[] };
type Province = { id: string; name: Name; district?: District[] };
type Hierarchy = { data?: Province[] };
type MasterItem = { id: string; label: string; parent_id: string | null };

const DATA_URL = "https://raw.githubusercontent.com/open-admin-data/pakistan-administrative-divisions/main/data/hierarchy.json";

async function master(category: string): Promise<MasterItem[]> {
  const response = await fetch(`/api/master-data?category=${encodeURIComponent(category)}`, { cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json();
  return payload.items ?? [];
}

export default function PakistanLocationFields({
  defaultProvince = "", defaultDistrict = "", defaultTehsil = "", defaultCity = "", fieldPrefix = "",
}: { defaultProvince?: string; defaultDistrict?: string; defaultTehsil?: string; defaultCity?: string; fieldPrefix?: string }) {
  const field = (name: string) => `${fieldPrefix}${name}`;
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [masterProvinces, setMasterProvinces] = useState<MasterItem[]>([]);
  const [masterDistricts, setMasterDistricts] = useState<MasterItem[]>([]);
  const [masterTehsils, setMasterTehsils] = useState<MasterItem[]>([]);
  const [masterCities, setMasterCities] = useState<MasterItem[]>([]);
  const [province, setProvince] = useState(defaultProvince);
  const [district, setDistrict] = useState(defaultDistrict);
  const [tehsil, setTehsil] = useState(defaultTehsil);
  const [city, setCity] = useState(defaultCity);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(DATA_URL, { cache: "force-cache" }).then((r) => { if (!r.ok) throw new Error("Location data unavailable"); return r.json() as Promise<Hierarchy>; }),
      master("province"), master("district"), master("tehsil"), master("city"),
    ]).then(([payload, p, d, t, c]) => {
      if (!active) return;
      setProvinces(payload.data ?? []); setMasterProvinces(p); setMasterDistricts(d); setMasterTehsils(t); setMasterCities(c);
    }).catch(() => active && setLoadError(true));
    return () => { active = false; };
  }, []);

  const builtDistricts = useMemo(() => provinces.find((item) => item.name.en === province)?.district ?? [], [provinces, province]);
  const masterProvinceId = masterProvinces.find((item) => item.label === province)?.id;
  const dynamicDistricts = useMemo(() => masterDistricts.filter((item) => !item.parent_id || item.parent_id === masterProvinceId), [masterDistricts, masterProvinceId]);
  const districtLabels = [...new Set([...builtDistricts.map((x) => x.name.en), ...dynamicDistricts.map((x) => x.label), ...(defaultDistrict ? [defaultDistrict] : [])])];

  const builtTehsils = useMemo(() => builtDistricts.find((item) => item.name.en === district)?.tehsil ?? [], [builtDistricts, district]);
  const masterDistrictId = masterDistricts.find((item) => item.label === district)?.id;
  const dynamicTehsils = useMemo(() => masterTehsils.filter((item) => !item.parent_id || item.parent_id === masterDistrictId), [masterTehsils, masterDistrictId]);
  const tehsilLabels = [...new Set([...builtTehsils.map((x) => x.name.en), ...dynamicTehsils.map((x) => x.label), ...(defaultTehsil ? [defaultTehsil] : [])])];

  const masterTehsilId = masterTehsils.find((item) => item.label === tehsil)?.id;
  const cityLabels = [...new Set([
    ...tehsilLabels,
    ...masterCities.filter((item) => !item.parent_id || item.parent_id === masterTehsilId || item.parent_id === masterDistrictId).map((item) => item.label),
    ...(defaultCity ? [defaultCity] : []),
  ])];
  const provinceLabels = [...new Set([...provinces.map((x) => x.name.en), ...masterProvinces.map((x) => x.label), ...(defaultProvince ? [defaultProvince] : [])])];

  if (loadError) {
    return <>
      <div><label htmlFor={field("province")}>Province / Territory</label><input id={field("province")} name={field("province")} defaultValue={defaultProvince} required /></div>
      <div><label htmlFor={field("district")}>District</label><input id={field("district")} name={field("district")} defaultValue={defaultDistrict} required /></div>
      <div><label htmlFor={field("tehsil")}>Tehsil / Taluka</label><input id={field("tehsil")} name={field("tehsil")} defaultValue={defaultTehsil} required /></div>
      <div><label htmlFor={field("city")}>City / Town</label><input id={field("city")} name={field("city")} defaultValue={defaultCity} required /><p className="form-help">Administrative lists could not load, so manual entry is temporarily enabled.</p></div>
    </>;
  }

  return <>
    <div><label htmlFor={field("province")}>Province / Territory</label><select id={field("province")} name={field("province")} value={province} onChange={(e) => { setProvince(e.target.value); setDistrict(""); setTehsil(""); setCity(""); }} required><option value="">Select province / territory</option>{provinceLabels.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
    <div><label htmlFor={field("district")}>District</label><select id={field("district")} name={field("district")} value={district} onChange={(e) => { setDistrict(e.target.value); setTehsil(""); setCity(""); }} disabled={!province} required><option value="">Select district</option>{districtLabels.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
    <div><label htmlFor={field("tehsil")}>Tehsil / Taluka</label><select id={field("tehsil")} name={field("tehsil")} value={tehsil} onChange={(e) => { setTehsil(e.target.value); if (!city || city === tehsil) setCity(e.target.value); }} disabled={!district} required><option value="">Select tehsil / taluka</option>{tehsilLabels.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
    <div><label htmlFor={field("city")}>City / Town</label><input id={field("city")} name={field("city")} list={field("pakistan-city-suggestions")} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Select or type city / town" required /><datalist id={field("pakistan-city-suggestions")}>{cityLabels.map((x) => <option key={x} value={x} />)}</datalist><p className="form-help">Built-in Pakistan geography is merged with active locations added in Admin Data Studio.</p></div>
  </>;
}
