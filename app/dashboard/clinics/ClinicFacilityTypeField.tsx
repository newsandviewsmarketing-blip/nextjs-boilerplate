"use client";
import {useState} from "react";
import {CLINIC_FACILITY_TYPES} from "@/lib/clinic-facility-options";

type Props={defaultValue?:string|null;id?:string};
export default function ClinicFacilityTypeField({defaultValue,id="facility_type"}:Props){
 const known=CLINIC_FACILITY_TYPES.some(x=>x===defaultValue);
 const [value,setValue]=useState(defaultValue&&!known?"Other":defaultValue||"Veterinary Clinic");
 return <div className="vcx-facility-type">
  <label htmlFor={id}>Facility / practice type</label>
  <select id={id} name="facility_type" value={value} onChange={setValue}>
   {CLINIC_FACILITY_TYPES.map(x=><option value={x} key={x}>{x}</option>)}
   <option value="Other">Other · specify practice</option>
  </select>
  {value==="Other"&&<div className="vcx-other-practice">
   <label htmlFor={id+"_other"}>Describe your practice type</label>
   <input id={id+"_other"} name="facility_type_other" required maxLength={90}
    defaultValue={defaultValue&&!known?defaultValue:""}
    placeholder="e.g. Equine ambulatory veterinary practice"/>
   <small>Saved as your facility description and reviewed before public publication.</small>
  </div>}
 </div>;
}
