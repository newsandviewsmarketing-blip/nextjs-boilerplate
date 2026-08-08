import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const vets = [
  ["SA", "Dr. Sara Ahmed", "Small Animal & Pet Practice", "Lahore", "Dogs, Cats", "Clinic, Video", "Today 6:00 PM"],
  ["MH", "Dr. M. Hassan", "Livestock & Herd Health", "Faisalabad", "Cattle, Buffalo", "Farm Visit, Video", "Tomorrow 9:30 AM"],
  ["RK", "Dr. R. Khan", "Poultry Health", "Rawalpindi", "Broiler, Layer", "On-site, Advisory", "Mon 11:00 AM"],
  ["AN", "Dr. A. Noor", "Dairy Reproduction", "Multan", "Dairy Cattle", "Farm Visit", "Tue 8:30 AM"],
  ["FA", "Dr. F. Ali", "Equine Practice", "Lahore", "Horse", "Clinic, Farm Visit", "Wed 4:00 PM"],
  ["HZ", "Dr. H. Zafar", "Aquatic Animal Health", "Islamabad", "Fish, Aquaculture", "Advisory, Video", "Thu 2:00 PM"],
];

export default function VetsPage() {
  return <main><SiteHeader />
    <section className="page-hero"><div className="shell"><span className="section-kicker">VETERINARIAN DIRECTORY</span><h1>Find the right veterinary professional.</h1><p>Search by city, sector, animal, expertise, service type and availability. Profile verification and booking data shown here are front-end preview fields.</p></div></section>
    <section className="section compact-section"><div className="shell directory-layout">
      <aside className="directory-filters"><h3>Filter profiles</h3><label>City</label><select><option>All cities</option><option>Lahore</option><option>Faisalabad</option><option>Islamabad</option><option>Rawalpindi</option><option>Multan</option></select><label>Sector / Animal</label><select><option>All sectors</option><option>Pets</option><option>Livestock</option><option>Poultry</option><option>Dairy</option><option>Equine</option><option>Fisheries</option></select><label>Service type</label><select><option>Any service</option><option>Clinic Visit</option><option>Farm Visit</option><option>Video Consultation</option><option>Advisory</option></select><label>Availability</label><select><option>Any time</option><option>Today</option><option>Tomorrow</option><option>This week</option></select><button className="button button-primary button-full">Apply filters</button><div className="filter-note"><b>Verification design</b><p>Professional registration number, qualifications and submitted documents can be reviewed by VetConnect admin before a public verification badge is activated.</p></div></aside>
      <div><div className="directory-top"><div><b>Veterinarian profiles</b><span>Sample front-end directory</span></div><select><option>Recommended</option><option>Nearest</option><option>Earliest available</option></select></div><div className="directory-grid">{vets.map(v => <article className="directory-vet" key={v[1]}><div className="directory-vet-head"><div className="avatar">{v[0]}</div><div><span className="sample-label">Sample profile</span><h3>{v[1]}</h3><p>{v[2]}</p></div></div><div className="verified-line"><span>✓</span> PVMC verification field</div><div className="profile-chips"><span>{v[3]}</span><span>{v[4]}</span><span>{v[5]}</span></div><div className="availability-box"><small>Next available</small><b>{v[6]}</b></div><div className="profile-details"><div><small>Clinic / service address</small><b>Profile-controlled location</b></div><div><small>Consultation fee</small><b>Shown when configured</b></div></div><div className="card-actions"><button className="button button-primary">Book appointment</button><button className="button button-secondary">View full profile</button></div></article>)}</div></div>
    </div></section>
    <section className="section section-soft"><div className="shell"><div className="section-heading"><span className="section-kicker">PROFILE DATA MODEL</span><h2>What a veterinarian can manage.</h2></div><div className="feature-columns"><div><h3>Identity & verification</h3><p>Name, photograph, PVMC number, qualifications, documents and verification status.</p></div><div><h3>Clinical expertise</h3><p>Specialties, species, services, consultation modes and professional experience.</p></div><div><h3>Location & availability</h3><p>Clinic address, city, nearby service areas, farm-visit radius, weekly schedule and available slots.</p></div><div><h3>Practice & bookings</h3><p>Fees, appointment types, booking confirmation, animal/case details, revisit history and follow-up.</p></div></div></div></section>
    <SiteFooter /></main>;
}
