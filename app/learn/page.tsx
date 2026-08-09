import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const courses = [
  ["Poultry Health & Disease Management", "Poultry", "Veterinarians", "6 modules"],
  ["Farm Biosecurity Essentials", "Livestock", "Farm Teams", "4 modules"],
  ["Veterinary Diagnostics & Sample Handling", "Clinical", "Veterinarians", "5 modules"],
  ["Dairy Herd Health Fundamentals", "Dairy", "Veterinarians & Managers", "6 modules"],
  ["Animal Health Product Stewardship", "Industry", "Technical & Sales Teams", "4 modules"],
  ["Aquaculture Health Basics", "Fisheries", "Professionals & Students", "5 modules"],
];

export default function LearnPage(){return <main><SiteHeader/><section className="page-hero learn-hero"><div className="shell"><span className="section-kicker">KNOWLEDGE HUB & ONLINE TRAINING</span><h1>Learn. Update skills. Build a stronger professional profile.</h1><p>A learning layer for veterinarians, students, farm teams and animal-health companies, including courses, workshops, seminars and technical resources.</p><div className="hero-actions"><button className="button button-primary">Explore courses</button><button className="button button-secondary">Become a training partner</button></div></div></section>
<section className="section compact-section"><div className="shell"><div className="section-heading"><span className="section-kicker">COURSE CATALOGUE</span><h2>Practical learning by sector.</h2></div><div className="learning-grid">{courses.map((c,i)=><article key={c[0]}><div className="course-number">{String(i+1).padStart(2,"0")}</div><span>{c[1]}</span><h3>{c[0]}</h3><p>{c[2]}</p><div><small>{c[3]}</small><button>View course →</button></div></article>)}</div></div></section>
<section className="section section-soft"><div className="shell two-col align-center"><div><span className="section-kicker">PROFESSIONAL DEVELOPMENT</span><h2>Connect learning with careers and profiles.</h2><p>Completed learning can later feed into a professional development record, improving profile depth and helping candidates demonstrate relevant skills to employers.</p></div><div className="learning-path"><div><b>01</b><span><strong>Choose learning</strong><small>By sector, role, skill or career goal.</small></span></div><div><b>02</b><span><strong>Complete modules</strong><small>Video, reading, assessment and live sessions.</small></span></div><div><b>03</b><span><strong>Record completion</strong><small>Add course completion to your VetConnect profile.</small></span></div><div><b>04</b><span><strong>Use in career matching</strong><small>Surface relevant skills for jobs and employers.</small></span></div></div></div></section><SiteFooter/></main>}
