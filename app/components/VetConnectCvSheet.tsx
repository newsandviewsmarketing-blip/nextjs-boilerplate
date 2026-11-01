import Image from 'next/image';
export type CvSheetData={full_name?:string|null;headline?:string|null;contact_email?:string|null;phone?:string|null;experience?:string|null;education?:string|null;skills?:string|null};
export default function VetConnectCvSheet({cv,photoUrl,location}:{cv:CvSheetData;photoUrl?:string|null;location?:string}){
 return <article className="vetconnect-cv">
 <header className="cv-letterhead"><Image src="/vetconnect-logo.png" alt="VetConnect" width={166} height={55} unoptimized/><span>PROFESSIONAL CV</span></header>
 <div className="cv-person-heading"><div><h1>{cv.full_name||'Your name'}</h1>{cv.headline&&<p className="cv-profession">{cv.headline}</p>}<p>{[cv.contact_email,cv.phone].filter(Boolean).join(' | ')}</p>{location&&<p>{location}</p>}</div>{photoUrl&&<Image unoptimized src={photoUrl} alt="Professional photograph" width={100} height={116} className="cv-person-photo"/>}</div>
 {([['Professional experience',cv.experience],['Education & qualifications',cv.education],['Expertise & skills',cv.skills]] as const).filter(([,value])=>Boolean(value?.trim())).map(([heading,value])=><section className="cv-document-section" key={heading}><h2>{heading}</h2><p>{value}</p></section>)}
 <footer className="cv-provenance">Generated through VetConnect Pakistan from information supplied by the profile holder. This document does not certify qualifications, employment or professional registration.</footer>
 </article>;
}
