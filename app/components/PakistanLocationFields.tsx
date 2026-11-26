"use client";

import { useMemo, useState } from "react";

import { PAKISTAN_LOCATION_OPTIONS } from "@/lib/pakistan-locations";
import hierarchy from "@/public/data/pakistan-administrative-hierarchy.json";

const provinces = hierarchy.data;

export default function PakistanLocationFields({
  fieldPrefix = "",
  defaultProvince = "",
  defaultDistrict = "",
  defaultTehsil = "",
  defaultCity = "",
}: {
  fieldPrefix?: string;
  defaultProvince?: string;
  defaultDistrict?: string;
  defaultTehsil?: string;
  defaultCity?: string;
}) {
  const [province, setProvince] = useState(defaultProvince);
  const [district, setDistrict] = useState(defaultDistrict);
  const [tehsil, setTehsil] = useState(defaultTehsil);
  const [city, setCity] = useState(defaultCity);

  const provinceField = `${fieldPrefix}province`;
  const districtField = `${fieldPrefix}district`;
  const tehsilField = `${fieldPrefix}tehsil`;
  const cityField = `${fieldPrefix}city`;
  const cityListId = fieldPrefix
    ? `${fieldPrefix}city-suggestions`
    : "pakistan-city-suggestions";

  const districts = useMemo(
    () => provinces.find((item) => item.name.en === province)?.district ?? [],
    [province],
  );
  const tehsils = useMemo(
    () => districts.find((item) => item.name.en === district)?.tehsil ?? [],
    [districts, district],
  );

  return (
    <>
      <div>
        <label htmlFor={provinceField}>Province / Territory</label>
        <select
          id={provinceField}
          name={provinceField}
          value={province}
          onChange={(event) => {
            setProvince(event.target.value);
            setDistrict("");
            setTehsil("");
            setCity("");
          }}
          required
        >
          <option value="">Select province / territory</option>
          {provinces.map((item) => (
            <option key={item.id} value={item.name.en}>
              {item.name.en}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={cityField}>City / Town</label>
        <input
          id={cityField}
          name={cityField}
          list={cityListId}
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Select or type city / town"
          required
        />
        <datalist id={cityListId}>
          {Array.from(new Set(PAKISTAN_LOCATION_OPTIONS.filter(item=>item.province===province).map(item=>item.value))).sort().map(value=><option key={value} value={value}/>)}
        </datalist>
        <p className="form-help">
          Choose your main city, such as Karachi. District and tehsil are optional. Enter the area, industrial estate or road in the address field.
        </p>
      </div>
      <div>
        <label htmlFor={districtField}>District (optional)</label>
        <select
          id={districtField}
          name={districtField}
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value);
            setTehsil("");
          }}
          disabled={!province}
        >
          <option value="">Select district</option>
          {districts.map((item) => (
            <option key={item.id} value={item.name.en}>
              {item.name.en}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={tehsilField}>Tehsil / Taluka (optional)</label>
        <select
          id={tehsilField}
          name={tehsilField}
          value={tehsil}
          onChange={(event) => {
            const nextTehsil = event.target.value;
            setTehsil(nextTehsil);

          }}
          disabled={!district}
        >
          <option value="">Select tehsil / taluka</option>
          {tehsils.map((item) => (
            <option key={item.id} value={item.name.en}>
              {item.name.en}
            </option>
          ))}
        </select>
      </div>

    </>
  );
}
