import {
 CLINIC_SERVICES,CLINIC_SPECIES,
} from "@/lib/clinic-facility-options";
type Props={services?:string[];species?:string[]};
function OptionGroup({kind,items,existing}:{
 kind:"services"|"species";items:readonly string[];existing:string[]
}){
 const known=new Set(items);
 const extra=existing.filter(x=>!known.has(x)).join(", ");
 return <fieldset className="vcx-clinic-focus">
   <legend>{kind==="services"?"Areas of expertise & intended services":"Animal groups / species served"}</legend>
   <p className="form-help">{kind==="services"
    ?"Select your focus. Actual bookable services, consultation fees and duration are managed in the next step."
    :"Select all relevant species. These details remain separate from a veterinarian's licence verification."}</p>
   <div className="vcx-clinic-focus-grid">{items.map(label=><label className="vcx-clinic-focus-pill" key={label}>
    <input type="checkbox" name={kind+"_selected"} value={label} defaultChecked={existing.includes(label)} />
    <span>{label}</span>
   </label>)}</div>
   <label htmlFor={"clinic_"+kind+"_extra"}>Other (optional, separate with commas)</label>
   <input id={"clinic_"+kind+"_extra"} name={kind+"_extra"} defaultValue={extra}
     maxLength={350} placeholder={kind==="services"?"e.g. Equine field consultancy":"e.g. Camel, exotic pets"}/>
 </fieldset>;
}
export default function ClinicFocusFields({services=[],species=[]}:Props){
 return <div className="form-span-2 vcx-focus-sections">
  <OptionGroup kind="services" items={CLINIC_SERVICES} existing={services}/>
  <OptionGroup kind="species" items={CLINIC_SPECIES} existing={species}/>
 </div>;
}
