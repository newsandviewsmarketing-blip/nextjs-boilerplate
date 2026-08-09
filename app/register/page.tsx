import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const roles = [
  ["Veterinary Professional", "Create a profile with qualifications, PVMC details, expertise, locations and availability."],
  ["Company / Employer", "Create a business profile for products, jobs, contacts and company visibility."],
  ["Student / Job Seeker", "Build a career profile, upload a CV and discover jobs, internships and courses."],
  ["Animal Owner / Farmer", "Find veterinary services, manage bookings and discover relevant products."],
];

export default function RegisterPage(){return <main><SiteHeader/><section className="auth-section"><div className="shell"><div className="section-heading centered"><span className="section-kicker">JOIN VETCONNECT</span><h1>Choose your account type.</h1><p>Each role gets a different profile and dashboard, while shared data connects the platform modules.</p></div><div className="register-grid">{roles.map((r,i)=><article key={r[0]}><span>{String(i+1).padStart(2,"0")}</span><h2>{r[0]}</h2><p>{r[1]}</p><button className="button button-primary button-full">Start registration</button></article>)}</div><p className="center-note">Already registered? <Link href="/login">Sign in</Link></p></div></section><SiteFooter/></main>}
