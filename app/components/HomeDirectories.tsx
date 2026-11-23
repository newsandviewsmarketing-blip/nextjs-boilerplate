import Link from "next/link";

const destinations=[
 {symbol:"🩺",name:"Veterinarians",detail:"Credentials, expertise & veterinary services",href:"/vets"},
 {symbol:"🏥",name:"Clinics & Hospitals",detail:"Pet and livestock practice facilities",href:"/clinics"},
 {symbol:"🔬",name:"Diagnostic Labs",detail:"Laboratory and testing directory",href:"/labs"},
 {symbol:"👥",name:"Professionals",detail:"Industry, academia & research",href:"/professionals"},
 {symbol:"🏢",name:"Companies",detail:"Published business profiles",href:"/companies"},
 {symbol:"📦",name:"Marketplace",detail:"Products and suppliers",href:"/marketplace"},
 {symbol:"💼",name:"Jobs & Careers",detail:"Current opportunities",href:"/jobs"},
 {symbol:"📖",name:"Vets Guide",detail:"Learning and practical resources",href:"/learn"}
];
export default function HomeDirectories(){
 return <section className="vc-explore-section" aria-labelledby="vc-explore-title">
  <div className="shell"><span className="section-kicker">EXPLORE VETCONNECT</span>
   <h2 id="vc-explore-title">Everything veterinary, connected.</h2>
   <p>Start from one directory and explore related verified profiles, services, organizations and opportunities.</p>
   <div className="vc-directory-tiles">{destinations.map(item=><Link key={item.href} href={item.href} className="vc-directory-tile">
    <span className="vc-directory-icon" aria-hidden="true">{item.symbol}</span>
    <strong>{item.name}</strong><small>{item.detail}</small>
   </Link>)}</div>
  </div>
 </section>;
}
