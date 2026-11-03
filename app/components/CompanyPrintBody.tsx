import CompanyStory,{plainCompanyDescription} from "./CompanyStory";
import CompanyPrintButton from "./CompanyPrintButton";
import type { ManagementContact } from "@/lib/company-profile-editor";
import "./CompanyProfileFields.css";

type PublicData=Record<string,unknown>;
const text=(data:PublicData,key:string)=>String(data[key]??"").trim();
const website=(value:string)=>{try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)?u.toString():null;}catch{return null;}};

export default function CompanyPrintBody({
  company,presentation,contacts=[],privateRecord=false,
}:{
  company:PublicData;
  presentation:PublicData | null;
  contacts?:ManagementContact[];
  privateRecord?:boolean;
}) {
  const profile=presentation??{};
  const name=text(company,"canonical_name")||text(company,"company_name");
  const story=text(company,"description");
  const socials:[string,string][]=[
    ["Website",text(company,"website")],
    ["Facebook",text(profile,"facebook_url")],
    ["Instagram",text(profile,"instagram_url")],
    ["LinkedIn",text(profile,"linkedin_url")],
    ["YouTube",text(profile,"youtube_url")],
    ["Other official link",text(profile,"other_url")],
  ];
  return <main>
    <div className="vc-company-print-controls vc-company-export-actions">
      <CompanyPrintButton/>
      <span>Choose your browser&apos;s <b>Save as PDF</b> printer destination for a PDF file.</span>
    </div>
    <article className="vc-company-print-sheet">
      <header style={{display:"flex",justifyContent:"space-between",gap:20,borderBottom:"3px solid #e9811c",paddingBottom:16,marginBottom:18}}>
        <div><strong style={{color:"#143567",fontSize:20}}>VET<span style={{color:"#ee8013"}}>CONNECT</span></strong>
          <p style={{margin:0,fontSize:11,color:"#5d6b7d"}}>Pakistan professional business directory</p></div>
        <div style={{textAlign:"right",fontSize:11,color:"#66768a"}}>{privateRecord?"CONFIDENTIAL • INTERNAL COPY":"PUBLIC COMPANY PROFILE"}<p style={{margin:"4px 0"}}>{new Date().toLocaleDateString("en-PK",{timeZone:"Asia/Karachi"})}</p></div>
      </header>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        {website(text(company,"logo_url"))&&<img src={website(text(company,"logo_url"))??""} alt={name+" logo"} style={{width:86,height:86,objectFit:"contain",borderRadius:8}}/>}
        <div><h1 style={{margin:"0 0 7px",fontSize:28}}>{name}</h1>
          <p style={{margin:0,color:"#58667a",lineHeight:1.5}}>{text(profile,"tagline")||plainCompanyDescription(story).slice(0,240)}</p></div>
      </div>
      <section style={{marginTop:25}}>
        <h2>Company information</h2>
        <dl>
          {([
            ["Business type",text(company,"business_type")],
            ["Legal name",text(company,"legal_name")],
            ["Trade name",text(company,"trade_name")],
            ["Year established",text(profile,"year_established")],
            ["Location",[text(company,"city"),text(company,"district"),text(company,"province")].filter(Boolean).join(", ")],
            ["Office address",text(company,"address")],
            ["Public email",text(company,"public_email")||text(company,"contact_email")],
            ["Public phone",text(company,"public_phone")],
          ] as [string,string][]).filter((entry)=>Boolean(entry[1])).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
      {story&&<section style={{marginTop:22}}><h2>Company profile</h2><CompanyStory text={story} tone={text(profile,"profile_tone")||"navy"}/></section>}
      <section style={{marginTop:22}}><h2>Online presence</h2><dl>{socials.filter(([,url])=>Boolean(website(url))).map(([label,url])=><div key={label}><dt>{label}</dt><dd><a href={website(url)??"#"}>{url}</a></dd></div>)}</dl></section>
      {privateRecord&&<section style={{marginTop:26,borderTop:"2px solid #e9811c",paddingTop:16}}>
        <h2>Confidential management hierarchy</h2>
        <p style={{color:"#6a7585",fontSize:13}}>For authorized internal use only. These contact details must not be published or forwarded without permission.</p>
        {contacts.length===0&&<p>No private management contacts recorded.</p>}
        {contacts.map((contact,index)=><div className="vc-management-card" key={index}>
          <h3 style={{margin:"0 0 10px",color:"#113661"}}>{index+1}. {contact.full_name}</h3>
          <dl>
            {([
              ["Designation",contact.designation],["Department",contact.department],
              ["Office telephone",contact.office_phone],["Mobile",contact.mobile_phone],
              ["Private email",contact.email],["Reports to",contact.reports_to],
              ["Internal notes",contact.notes],
            ] as [string,string][]).filter(([,value])=>Boolean(value)).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>)}
      </section>}
      <footer style={{marginTop:27,borderTop:"1px solid #dce3ed",paddingTop:12,fontSize:10,color:"#637289"}}>
        Generated from VetConnect Pakistan. {privateRecord?"Confidential management report.":"Published company information only."}
      </footer>
    </article>
  </main>;
}
