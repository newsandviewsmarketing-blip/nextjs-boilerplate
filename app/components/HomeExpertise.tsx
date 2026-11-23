import Link from "next/link";
import ProfilePhoto from "./ProfilePhoto";
import {initials} from "@/lib/directories";

export type HomeVet = { user_id:string; full_name:string; city:string|null; veterinary_sector:string|null; specialization:string|null; image_url:string|null; pvmc_verified:boolean };
export type HomeClinic = { slug:string; clinic_name:string; city:string|null; facility_type:string|null; logo_url:string|null; species:string[] };
export type HomeProfessional = { slug:string; full_name:string; professional_type:string; city:string|null; image_url:string|null };

function Photo({url,name}:{url:string|null;name:string}){
 return <div className="vc-blueprint-photo"><ProfilePhoto imageUrl={url} name={name} fallback={initials(name)}/></div>;
}

export default function HomeExpertise({vets,clinics,professionals}:{vets:HomeVet[];clinics:HomeClinic[];professionals:HomeProfessional[]}){
 return <section className="vc-expertise-section" aria-labelledby="vc-expertise-title">
  <div className="shell">
   <div className="vc-expertise-heading">
    <div><span className="section-kicker">CONNECTED VETERINARY SERVICES</span>
     <h2 id="vc-expertise-title">Find the right expertise and services.</h2>
     <p>Explore public, approved professional and clinic profiles. Clinical booking and online consultation are shown only where a provider actually offers them.</p>
    </div>
   </div>
   <div className="vc-expertise-grid">
    <article className="vc-expertise-feature">
     {vets[0]?<Photo url={vets[0].image_url} name={vets[0].full_name}/>:<span className="vc-feature-icon" aria-hidden="true">🩺</span>}
     <div><span className="vc-feature-kicker">VETERINARY EXPERTISE</span><h3>Certified Veterinarians</h3><p>Find veterinarians by location, specialization and animal sector.</p><Link href="/vets">Explore veterinarians →</Link></div>
    </article>
    <article className="vc-expertise-feature">
     {professionals[0]?<Photo url={professionals[0].image_url} name={professionals[0].full_name}/>:<span className="vc-feature-icon" aria-hidden="true">👨‍🔬</span>}
     <div><span className="vc-feature-kicker">INDUSTRY & ADVISORY</span><h3>Professionals & Consultants</h3><p>Discover research, nutrition, poultry, dairy and animal-health expertise.</p><Link href="/professionals">Explore professionals →</Link></div>
    </article>
    <article className="vc-expertise-feature">
     {clinics[0]?<Photo url={clinics[0].logo_url} name={clinics[0].clinic_name}/>:<span className="vc-feature-icon" aria-hidden="true">🏥</span>}
     <div><span className="vc-feature-kicker">CLINICS & PRACTICE</span><h3>Veterinary Clinics</h3><p>Locate listed facilities, species served and available clinical services.</p><Link href="/clinics">Explore clinics →</Link></div>
    </article>
    <article className="vc-expertise-feature">
     <span className="vc-feature-icon" aria-hidden="true">🔬</span>
     <div><span className="vc-feature-kicker">DIAGNOSTIC SERVICES</span><h3>Diagnostic Laboratories</h3><p>Explore the laboratory directory as approved facility information becomes available.</p><Link href="/labs">Explore laboratories →</Link></div>
    </article>
   </div>
  </div>
 </section>;
}
