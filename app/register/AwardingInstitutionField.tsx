"use client";

import { useState } from "react";
import { DVM_INSTITUTIONS, DVM_INSTITUTIONS_SOURCE, isDvmQualification } from "@/lib/registration-institutions";

export default function AwardingInstitutionField({ id, name, degree }: { id: string; name: string; degree: string }) {
  const [choice, setChoice] = useState("");
  const dvm = isDvmQualification(degree);
  const custom = choice === "__other__" || choice === "__international__";
  const selected = DVM_INSTITUTIONS.find(item => item.id === choice);
  return <div className="vc-institution-field">
    <label htmlFor={id}>Awarding university / institution *</label>
    {dvm ? <>
      <select id={id} name={name + "_choice"} required value={choice} aria-describedby={id + "-help"}
        onChange={event => setChoice(event.target.value)}>
        <option value="" disabled>Select DVM institution</option>
        <optgroup label="Pakistan — PVMC reference list">
          {DVM_INSTITUTIONS.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </optgroup>
        <option value="__international__">International university / institution (specify)</option>
        <option value="__other__">Other / unlisted institution (specify)</option>
      </select>
      {custom && <input id={id + "-custom"} name={name} required maxLength={180}
        aria-label="Full name of other or international institution" placeholder="Enter full university / institution name" />}
      <small id={id + "-help"}>{selected?.reviewNote || "Institution and relevant study batch are reviewed separately."} <a href={DVM_INSTITUTIONS_SOURCE} target="_blank" rel="noreferrer">PVMC source</a></small>
    </> : <input id={id} name={name} required maxLength={180} disabled={!degree}
      placeholder={degree ? "Enter awarding university / institution" : "Select degree first"} />}
  </div>;
}
