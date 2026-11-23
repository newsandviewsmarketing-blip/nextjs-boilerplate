import Link from "next/link";
import ProfilePhoto from "./ProfilePhoto";
import {initials} from "@/lib/directories";
export type FeaturedVet={user_id:string;full_name:string;city:string|null;specialization:string|null;veterinary_sector:string|null;qualifications:string|null;years_experience:number|null;image_url:string|null;pvmc_verified:boolean};
export default function HomeVerifiedVeterinarians({vets}:{vets:FeaturedVet[]}){
 return <section className="vc-vet-discovery" aria-labelledby="vc-vet-discovery-heading">
  <div className="shell">
   <div className="vc-vet-discovery-head">
    <div>
     <span className="section-kicker">VETERINARY PROFESSIONAL NETWORK</span>
     <h2 id="vc-vet-discovery-heading">Find certified veterinary expertise near you.</h2>
     <p>Explore public professional profiles by city, animal sector and area of expertise. Veterinary credentials are checked separately from profile approval.</p>
    </div>
    <Link className="vc-vet-discovery-all" href="/vets">Find a veterinarian →</Link>
   </div>
   {vets.length>0?<div className="vc-vet-discovery-grid">
    {vets.map(vet=><article className="vc-featured-vet" key={vet.user_id}>
     <div className="vc-vet-card-top">
      <div className="vc-vet-portrait"><ProfilePhoto imageUrl={vet.image_url} name={vet.full_name} fallback={initials(vet.full_name)}/></div>
      <div className="vc-vet-card-identity"><h3>{vet.full_name}</h3><p>{vet.city||"Pakistan"}</p>
       {vet.pvmc_verified&&<span className="vc-vet-credential">PVMC credential verified</span>}
      </div>
     </div>
     <p className="vc-vet-expertise">{vet.specialization||vet.veterinary_sector||"Veterinary services"}</p>
     <p className="vc-vet-credentials">{[vet.qualifications,typeof vet.years_experience==="number"&&vet.years_experience>0?vet.years_experience+" years experience":null].filter(Boolean).join(" · ")}</p>
     <Link className="vc-vet-profile-action" href={`/vets/${vet.user_id}`}>View profile & contact options →</Link>
    </article>)}
   </div>:<div className="vc-vet-directory-empty">Browse the directory for approved veterinary profiles, specializations and public contact options. <Link href="/vets">Explore veterinarians →</Link></div>}
  </div>
 </section>;
}
