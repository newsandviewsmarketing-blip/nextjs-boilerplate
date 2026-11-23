import Link from "next/link";
import ProfilePhoto from "./ProfilePhoto";
import {initials} from "@/lib/directories";

export type HomeVet = {user_id:string;full_name:string;city:string|null;veterinary_sector:string|null;specialization:string|null;image_url:string|null;pvmc_verified:boolean};
export type HomeClinic = {slug:string;clinic_name:string;city:string|null;facility_type:string|null;logo_url:string|null;species:string[]};
export type HomeProfessional = {slug:string;full_name:string;professional_type:string;city:string|null;image_url:string|null};
export type OnlineClinic = {slug:string;clinic_name:string;city:string|null;logo_url:string|null};

function Photo({url,name}:{url:string|null;name:string}){
 return <div className="vc-blueprint-photo"><ProfilePhoto imageUrl={url} name={name} fallback={initials(name)}/></div>;
}
export default function HomeExpertise({vets,clinics,professionals,onlineClinics}:{vets:HomeVet[];clinics:HomeClinic[];professionals:HomeProfessional[];onlineClinics:OnlineClinic[]}){
 return <section className="vc-expertise-section" aria-labelledby="vc-expertise-title"><div className="shell">
  <div className="vc-expertise-heading"><span className="section-kicker">CONNECTED VETERINARY SERVICES</span>
   <h2 id="vc-expertise-title">Find the right expertise and services.</h2>
   <p>Browse current public profiles. Online consultation is offered only where a verified practice explicitly lists the service. Appointment times require separate confirmation.</p>
  </div>
  <div className="vc-expertise-grid">
   <article className="vc-expertise-feature">
    {onlineClinics[0]?<Photo url={onlineClinics[0].logo_url} name={onlineClinics[0].clinic_name}/>:<span className="vc-feature-icon" aria-hidden="true">💻</span>}
    <div><span className="vc-feature-kicker">REMOTE VETERINARY SERVICES</span><h3>Online Consultations</h3>
     <p>{onlineClinics.length>0?onlineClinics.length+" approved "+(onlineClinics.length===1?"practice lists":"practices list")+" tele-veterinary consultation. Request a time directly.":"Find veterinary clinics and check whether remote consultations are offered."}</p>
     <Link href="/clinics?q=Tele-Veterinary+Consultation">Explore online consultation →</Link></div>
   </article>
   <article className="vc-expertise-feature">
    {professionals[0]?<Photo url={professionals[0].image_url} name={professionals[0].full_name}/>:<span className="vc-feature-icon" aria-hidden="true">👨‍🔬</span>}
    <div><span className="vc-feature-kicker">INDUSTRY & ADVISORY</span><h3>Professionals & Consultants</h3>
     <p>Research, nutrition, poultry, dairy and animal-health specialists. Clinical appointments are not assumed.</p>
     <Link href="/professionals">Explore professionals →</Link></div>
   </article>
   <article className="vc-expertise-feature">
    {clinics[0]?<Photo url={clinics[0].logo_url} name={clinics[0].clinic_name}/>:<span className="vc-feature-icon" aria-hidden="true">🏥</span>}
    <div><span className="vc-feature-kicker">CLINICS & PRACTICE</span><h3>Veterinary Clinics</h3>
     <p>Find approved facilities, services, animal species and published contact options.</p>
     <Link href="/clinics">Explore clinics →</Link></div>
   </article>
   <article className="vc-expertise-feature">
    <span className="vc-feature-icon" aria-hidden="true">🔬</span>
    <div><span className="vc-feature-kicker">DIAGNOSTIC SERVICES</span><h3>Diagnostic Laboratories</h3>
     <p>Search the laboratory directory when public approved listings become available.</p>
     <Link href="/labs">Explore laboratories →</Link></div>
   </article>
  </div>
  <div className="vc-home-vet-strip-head"><div><span className="section-kicker">CERTIFIED VETERINARIANS</span><h3>Meet veterinary professionals</h3></div><Link href="/vets">View all veterinarians →</Link></div>
  {vets.length?<div className={"vc-home-vet-strip"+(vets.length>4?" vc-home-vet-animated":"")} aria-label="Approved veterinarians; scroll to view more">
   <div className="vc-home-vet-track">
    {[0,...(vets.length>4?[1]:[])].map(copy=><div className="vc-home-vet-group" aria-hidden={copy===1} key={copy}>
     {vets.map(vet=><Link tabIndex={copy===1?-1:undefined} key={vet.user_id} className="vc-home-vet-mini" href={"/vets/"+vet.user_id}>
      <div className="vc-home-vet-mini-photo"><ProfilePhoto imageUrl={vet.image_url} name={vet.full_name} fallback={initials(vet.full_name)}/></div>
      <div><strong>{vet.full_name}</strong><small>{[vet.specialization||vet.veterinary_sector,vet.city].filter(Boolean).join(" · ")||"Veterinarian"}</small><span>PVMC credential verified</span></div>
     </Link>)}
    </div>)}
   </div>
  </div>:<p className="vc-home-empty-vets">No approved and credential-verified veterinarian profiles are currently listed. <Link href="/vets">Browse directory</Link></p>}
 </div></section>;
}
