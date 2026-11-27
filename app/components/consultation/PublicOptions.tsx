import {consultationTestingEnabled} from "@/lib/consultation/testing";
import {requestSession} from "@/app/dashboard/consultation/history/actions";
import Link from "next/link";
import {availabilityLabel,type PublicConsultation} from "@/lib/consultation/status";
export default function PublicOptions({service}:{service:PublicConsultation|undefined}) {
 if (!service) return null;
 return <section className="backend-form-card" aria-label="Online consultation"><h2>Online consultation</h2><p>{availabilityLabel(service.status)}</p>{service.fee_pkr!=null&&<p>Consultation fee: PKR {Number(service.fee_pkr).toLocaleString("en-PK")}</p>}<div className="card-actions">{consultationTestingEnabled() && service.status==="available"?<form action={requestSession}><input type="hidden" name="vet" value={service.user_id}/>{service.audio&&<button name="mode" value="audio">Request audio call</button>}{service.video&&<button name="mode" value="video">Request video call</button>}</form>:<>{service.audio&&<button type="button" disabled>Audio call (not enabled)</button>}{service.video&&<button type="button" disabled>Video call (not enabled)</button>}</>}{service.appointment&&<Link className="button button-secondary" href="/clinics">Browse clinic appointments</Link>}</div><p>Calls are limited to authorized test accounts. Clinic directory links are not a confirmed booking with this veterinarian.</p></section>;
}
