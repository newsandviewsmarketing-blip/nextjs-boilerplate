"use client";

import { useMemo, useState } from "react";

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
        <label htmlFor={districtField}>District</label>
        <select
          id={districtField}
          name={districtField}
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value);
            setTehsil("");
            setCity("");
          }}
          disabled={!province}
          required
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
        <label htmlFor={tehsilField}>Tehsil / Taluka</label>
        <select
          id={tehsilField}
          name={tehsilField}
          value={tehsil}
          onChange={(event) => {
            const nextTehsil = event.target.value;
            setTehsil(nextTehsil);
            if (!city || city === tehsil) setCity(nextTehsil);
          }}
          disabled={!district}
          required
        >
          <option value="">Select tehsil / taluka</option>
          {tehsils.map((item) => (
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
          {tehsils.map((item) => (
            <option key={item.id} value={item.name.en} />
          ))}
        </datalist>
        <p className="form-help">
          Province, district and tehsil are standardized. City/town accepts the selected administrative centre or a local town name.
        </p>
      </div>
    </>
  );
}
