"use client";

import { useEffect, useMemo, useState } from "react";

type Name = { en: string; local?: string };
type Tehsil = { id: string; name: Name };
type District = { id: string; name: Name; tehsil?: Tehsil[] };
type Province = { id: string; name: Name; district?: District[] };
type Hierarchy = { data?: Province[] };

const DATA_URL =
  "https://raw.githubusercontent.com/open-admin-data/pakistan-administrative-divisions/main/data/hierarchy.json";

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
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [province, setProvince] = useState(defaultProvince);
  const [district, setDistrict] = useState(defaultDistrict);
  const [tehsil, setTehsil] = useState(defaultTehsil);
  const [city, setCity] = useState(defaultCity);
  const [loadError, setLoadError] = useState(false);

  const provinceField = `${fieldPrefix}province`;
  const districtField = `${fieldPrefix}district`;
  const tehsilField = `${fieldPrefix}tehsil`;
  const cityField = `${fieldPrefix}city`;
  const cityListId = fieldPrefix
    ? `${fieldPrefix}city-suggestions`
    : "pakistan-city-suggestions";

  useEffect(() => {
    let active = true;
    fetch(DATA_URL, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("Location data unavailable");
        return response.json() as Promise<Hierarchy>;
      })
      .then((payload) => {
        if (active) setProvinces(payload.data ?? []);
      })
      .catch(() => active && setLoadError(true));

    return () => {
      active = false;
    };
  }, []);

  const districts = useMemo(
    () => provinces.find((item) => item.name.en === province)?.district ?? [],
    [provinces, province],
  );
  const tehsils = useMemo(
    () => districts.find((item) => item.name.en === district)?.tehsil ?? [],
    [districts, district],
  );

  if (loadError) {
    return (
      <>
        <div>
          <label htmlFor={provinceField}>Province / Territory</label>
          <input id={provinceField} name={provinceField} defaultValue={defaultProvince} required />
        </div>
        <div>
          <label htmlFor={districtField}>District</label>
          <input id={districtField} name={districtField} defaultValue={defaultDistrict} required />
        </div>
        <div>
          <label htmlFor={tehsilField}>Tehsil / Taluka</label>
          <input id={tehsilField} name={tehsilField} defaultValue={defaultTehsil} required />
        </div>
        <div>
          <label htmlFor={cityField}>City / Town</label>
          <input id={cityField} name={cityField} defaultValue={defaultCity} required />
          <p className="form-help">
            The Pakistan administrative list could not load, so manual entry is temporarily enabled.
          </p>
        </div>
      </>
    );
  }

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
