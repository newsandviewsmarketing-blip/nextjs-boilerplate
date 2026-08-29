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
  defaultProvince = "",
  defaultDistrict = "",
  defaultTehsil = "",
  defaultCity = "",
}: {
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
          <label htmlFor="province">Province / Territory</label>
          <input id="province" name="province" defaultValue={defaultProvince} required />
        </div>
        <div>
          <label htmlFor="district">District</label>
          <input id="district" name="district" defaultValue={defaultDistrict} required />
        </div>
        <div>
          <label htmlFor="tehsil">Tehsil / Taluka</label>
          <input id="tehsil" name="tehsil" defaultValue={defaultTehsil} required />
        </div>
        <div>
          <label htmlFor="city">City / Town</label>
          <input id="city" name="city" defaultValue={defaultCity} required />
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
        <label htmlFor="province">Province / Territory</label>
        <select
          id="province"
          name="province"
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
        <label htmlFor="district">District</label>
        <select
          id="district"
          name="district"
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
        <label htmlFor="tehsil">Tehsil / Taluka</label>
        <select
          id="tehsil"
          name="tehsil"
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
        <label htmlFor="city">City / Town</label>
        <input
          id="city"
          name="city"
          list="pakistan-city-suggestions"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Select or type city / town"
          required
        />
        <datalist id="pakistan-city-suggestions">
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
