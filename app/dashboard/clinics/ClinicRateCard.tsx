import type {ReactNode} from "react";

type CatalogueItem={id:string;service_name:string;category:string};
type Offering={id:string;service_id:string;description:string|null;fee_min:number|null;fee_max:number|null;currency:string;duration_minutes:number|null;is_public:boolean;is_active:boolean;booking_enabled:boolean};
type Action=(formData:FormData)=>void|Promise<void>;
type Props={clinicId:string;catalogue:CatalogueItem[];offerings:Offering[];addAction:Action;removeAction:Action;submitButton:ReactNode};

const categoryLabels:Record<string,string>={
 consultation:"Consultation fees",preventive_care:"Preventive care",
 vaccination:"Vaccinations",diagnostics:"Diagnostic services",laboratory:"Laboratory",
 procedure:"Procedures",surgery:"Surgery",emergency:"Emergency",
 farm_service:"Farm visits & consultancy",telemedicine:"Online consultations",
 grooming:"Pet care",other:"Other veterinary services"
};
const feeLabel=(row:Offering)=>{
 if(row.fee_min===null&&row.fee_max===null)return "Fee on request";
 if(row.fee_min!==null&&row.fee_max!==null&&row.fee_min!==row.fee_max)
  return `PKR ${row.fee_min.toLocaleString("en-PK")}–${row.fee_max.toLocaleString("en-PK")}`;
 const fee=row.fee_min??row.fee_max;
 return `PKR ${fee?.toLocaleString("en-PK")}`;
};

function FeeFields({row}:{row?:Offering}){
 return <>
  <div className="vcx-rate-fields">
   <label>Base / minimum fee (PKR)<input name="fee_min" type="number" min="0" step="0.01" defaultValue={row?.fee_min??""} placeholder="e.g. 500"/></label>
   <label>Maximum fee (optional)<input name="fee_max" type="number" min="0" step="0.01" defaultValue={row?.fee_max??""} placeholder="For a variable price"/></label>
   <label>Typical duration (minutes)<input name="duration_minutes" type="number" min="1" max="1440" defaultValue={row?.duration_minutes??""} placeholder="e.g. 20"/></label>
  </div>
  <label className="vcx-rate-description">Description / what&apos;s included<textarea name="description" defaultValue={row?.description??""} rows={2} placeholder="Describe the visit, treatment or included tests"/></label>
  <div className="vcx-rate-options">
   <label className="checkbox-line"><input type="checkbox" name="is_public" defaultChecked={row?.is_public??true}/>Show on public rate card</label>
   <label className="checkbox-line"><input type="checkbox" name="booking_enabled" defaultChecked={row?.booking_enabled??false}/>Allow appointment requests</label>
  </div>
 </>;
}

export default function ClinicRateCard({clinicId,catalogue,offerings,addAction,removeAction,submitButton}:Props){
 const byId=new Map(catalogue.map(item=>[item.id,item]));
 const grouped=new Map<string,CatalogueItem[]>();
 for(const item of catalogue){
  const group=grouped.get(item.category)??[];
  group.push(item);grouped.set(item.category,group);
 }
 const consultationModes=[
  {key:"clinic",title:"At-clinic consultation",detail:"Physical examination at the clinic",category:"consultation"},
  {key:"remote",title:"Remote / video consultation",detail:"Advice by call or video. No physical examination",category:"telemedicine"},
  {key:"visit",title:"Home / farm visit",detail:"Field visits and travel charges may apply",category:"farm_service"}
 ];
 const offeringsByService=new Map(offerings.map(row=>[row.service_id,row]));
 const consultationCards=consultationModes.map(mode=>{
  const catalogueRow=catalogue.find(item=>item.category===mode.category);
  return {...mode,offering:catalogueRow?offeringsByService.get(catalogueRow.id):undefined};
 });
 const sorted=[...offerings].sort((a,b)=>{
  const aCategory=byId.get(a.service_id)?.category??"other";
  const bCategory=byId.get(b.service_id)?.category??"other";
  return aCategory===bCategory?(byId.get(a.service_id)?.service_name??"").localeCompare(byId.get(b.service_id)?.service_name??""):
   aCategory==="consultation"?-1:bCategory==="consultation"?1:aCategory.localeCompare(bCategory);
 });
 return <div className="vcx-rate-card-manager">
  <div className="vcx-rate-intro"><div><span className="section-kicker">CLINIC RATE CARD</span>
   <h2 id="clinic-services">Your services & consultation fees</h2>
   <p>Set your basic consultation fee for clinic, remote and field visits separately. Extra tests and procedures can have individual optional rates.</p></div>
   <span className="vcx-rate-count">{sorted.length} services</span>
  </div>
  <section className="vcx-consultation-modes" aria-label="General consultation types">
   <h3>1. Basic consultation fees</h3>
   <p>These are separately priced visit types, not a combined fee. Enter an amount only for the types you actually provide.</p>
   <div className="vcx-consultation-mode-grid">
    {consultationCards.map(mode=><div className="vcx-consultation-mode" key={mode.key}>
     <strong>{mode.title}</strong>
     <span>{mode.offering?feeLabel(mode.offering):"Not configured"}</span>
     <small>{mode.detail}</small>
    </div>)}
   </div>
  </section>
  <h3 className="vcx-rate-extras-title">2. Services, procedures & additional fees</h3>
  {sorted.length>0?<div className="vcx-rate-list">
   {sorted.map(row=>{
    const details=byId.get(row.service_id);
    return <article key={row.id} className="vcx-rate-item">
     <div className="vcx-rate-item-head"><div>
      <small>{categoryLabels[details?.category??""]??details?.category?.replaceAll("_"," ")??"Service"}</small>
      <h3>{details?.service_name??"Veterinary service"}</h3>
      <p className="vcx-rate-price">{feeLabel(row)}{row.duration_minutes?` · ${row.duration_minutes} min`:""}</p>
     </div>
     <div className="vcx-rate-tags"><span>{row.is_public?"Public":"Private"}</span><span>{row.booking_enabled?"Booking enabled":"Contact for booking"}</span></div></div>
     {row.description&&<p className="vcx-rate-desc">{row.description}</p>}
     <details className="vcx-rate-editor"><summary>Edit price, duration & booking</summary>
      <form action={addAction} className="vcx-rate-editor-form">
       <input type="hidden" name="clinic_id" value={clinicId}/>
       <input type="hidden" name="service_id" value={row.service_id}/>
       <FeeFields row={row}/>
       <button type="submit" className="button button-primary">Save changes</button>
      </form>
      <form action={removeAction} className="vcx-rate-remove">
       <input type="hidden" name="clinic_id" value={clinicId}/>
       <input type="hidden" name="id" value={row.id}/>
       <button type="submit" className="button button-secondary">Remove this service</button>
       <small>Removes the rate card entry for this clinic only.</small>
      </form>
     </details>
    </article>;
   })}
  </div>:<div className="empty-state"><p>No rate card entries yet. Add a consultation or clinical service below.</p></div>}
  <details className="vcx-rate-add" open={sorted.length===0}>
   <summary>+ Add consultation type or extra service</summary>
   <form action={addAction} className="vcx-rate-editor-form">
    <input type="hidden" name="clinic_id" value={clinicId}/>
    <label>Choose a service
     <select name="service_id" defaultValue="" required>
      <option value="">Select a catalogue service</option>
      {[...grouped.entries()].map(([category,items])=><optgroup key={category} label={categoryLabels[category]??category}>
       {items.map(item=><option value={item.id} key={item.id}>{item.service_name}</option>)}
      </optgroup>)}
     </select>
    </label>
    <FeeFields/>
    {submitButton}
   </form>
  </details>
  <p className="form-help">Extra service charges may be additional to consultation fees. Explain what is included in each quote, and do not add the basic fee twice. Fees are estimates supplied by the clinic, not payments collected by VetConnect. Specialties in the profile are informational until they are available in the approved service catalogue. Booking requests depend on your published clinic hours and review status.</p>
 </div>;
}
