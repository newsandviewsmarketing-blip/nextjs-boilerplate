"use client";
import { useState } from "react";
import { COMPANY_CLASSIFICATION, COMPANY_ACTIVITIES, type CompanySector, type CompanyClassification } from "@/lib/company-classification";

export default function CompanyClassificationFields({ initial = [] }: { initial?: CompanyClassification[] }) {
  const [rows, setRows] = useState<CompanyClassification[]>(initial);
  const toggle = (sector: CompanySector, field: "subsectors" | "activities", value: string, checked: boolean) =>
    setRows(current => current.map(row => row.sector !== sector ? row : {
      ...row, [field]: checked ? [...new Set([...row[field], value])] : row[field].filter(item => item !== value)
    }));
  return <fieldset className="form-span-2 service-selector-fieldset">
    <legend>Business sectors and activities</legend>
    <p className="form-help">Select all relevant sectors, then choose their subsectors and activities.</p>
    {Object.entries(COMPANY_CLASSIFICATION).map(([key, options]) => {
      const sector = key as CompanySector;
      const row = rows.find(item => item.sector === sector);
      return <div key={sector}>
        <label className="checkbox-line"><input type="checkbox" checked={!!row}
          onChange={event => {
            const checked = event.target.checked;
            if (!checked && row && (row.subsectors.length || row.activities.length) &&
                !window.confirm("Remove this sector and its selected subsectors and activities?")) return;
            setRows(current => checked
              ? [...current, {sector, subsectors: [], activities: []}]
              : current.filter(item => item.sector !== sector));
          }}/>{sector.replaceAll("_", " ")}</label>
        {row && <div>
          <p>Subsectors</p><div className="service-checkbox-grid">{options.map(value =>
            <label className="checkbox-line" key={value}><input type="checkbox" checked={row.subsectors.includes(value)}
              onChange={event => toggle(sector, "subsectors", value, event.target.checked)}/>{value}</label>)}</div>
          <p>Business activities</p><div className="service-checkbox-grid">{COMPANY_ACTIVITIES.map(value =>
            <label className="checkbox-line" key={value}><input type="checkbox" checked={row.activities.includes(value)}
              onChange={event => toggle(sector, "activities", value, event.target.checked)}/>{value.replaceAll("_", " ")}</label>)}</div>
        </div>}
      </div>;
    })}
    <input type="hidden" name="company_classification" value={rows.length ? JSON.stringify(rows) : ""}/>
  </fieldset>;
}
