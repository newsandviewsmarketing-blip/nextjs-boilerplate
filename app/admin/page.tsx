import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AdminNav from "./components/AdminNav";
import { isSuspiciousProfileName } from "@/lib/profile-name";
import {credentialDataFlags} from "@/lib/veterinary-verification";
import { requireAdminPermission, getEffectiveAdminPermissions } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Activity = {id:string;kind:string;name:string;status:string;at:string;href:string;description:string};
type Metric = {label:string;value:number|null;href:string;note:string;attention?:boolean};
type Params = {q?:string;kind?:string;status?:string};
const format = (at:string) => new Date(at).toLocaleString("en-PK",{timeZone:"Asia/Karachi",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});

export default async function AdminOverviewPage({searchParams}:{searchParams:Promise<Params>}) {
  const params=await searchParams;
  const identity=await requireAdminPermission("admin.view","/admin");
  const rights=await getEffectiveAdminPermissions(identity);
  const can=(key:Parameters<typeof rights.has>[0])=>rights.has(key);
  const supabase=await createClient();
  const profilesAllowed=can("profiles.review");
  const usersAllowed=can("users.manage");
  const directoryAllowed=can("directories.manage");
  const productsAllowed=can("products.manage");
  const jobsAllowed=can("jobs.manage");
  const auditAllowed=can("audit.view");
  const credentialAllowed=can("regulatory.review");
  // Fresh registrations (last 24 hours) and pending approvals are different metrics.
  // eslint-disable-next-line react-hooks/purity
  const since24h=new Date(Date.now()-24*60*60*1000).toISOString();
  const metricCounts=new Map<string,number|null>();
  async function countOf(key:string, table:string, column:string, conditions:Array<[string,string]>=[],recent=false) {
    let query=supabase.from(table).select(column,{count:"exact",head:true});
    for(const [field,value] of conditions) query=query.eq(field,value);
    if(recent)query=query.gte("created_at",since24h);
    const {count,error}=await query;
    metricCounts.set(key,error ? null : (count??0));
  }
  const requirements: Array<[string,string,string,Array<[string,string]>,boolean]> = [];
  const requireCount=(key:string,table:string,column:string,conditions:Array<[string,string]>=[],recent=false)=>
    requirements.push([key,table,column,conditions,recent]);
  if(profilesAllowed||usersAllowed||directoryAllowed) {
    requireCount("vets","veterinarian_profiles","user_id");
    requireCount("professionals","professional_profiles","user_id");
    requireCount("managedVets","managed_people","id",[["profile_kind","veterinarian"]]);
    requireCount("managedProfessionals","managed_people","id",[["profile_kind","professional"]]);
    requireCount("clinics","clinics","id");
    requireCount("labs","laboratories","id");
    requireCount("companies","companies","id");
    if(profilesAllowed){
      for(const [key,table,column] of [
        ["vetsPending","veterinarian_profiles","user_id"],["professionalsPending","professional_profiles","user_id"],
        ["companyPending","company_profiles","user_id"],["labsPending","laboratories","id"],
        ["managedPending","managed_people","id"],["clinicsPending","clinics","id"],["companiesPending","companies","id"]
      ]) requireCount(key,table,column,[["verification_status","pending"]]);
    }
  }
  // Status breakdown for top-level sectors; do not interpret profile approval as PVMC approval.
  const statusSources=[
    ["vets","veterinarian_profiles","user_id"],
    ["professionals","professional_profiles","user_id"],
    ["managedVets","managed_people","id"],
    ["managedProfessionals","managed_people","id"],
    ["clinics","clinics","id"],
    ["labs","laboratories","id"],
    ["companies","companies","id"],
    ["products","products","id"],
    ["jobs","jobs","id"],
  ] as const;
  for(const [key,table,column] of statusSources){
    const isPeople=key==="vets"||key==="professionals"||key==="managedVets"||key==="managedProfessionals";
    const canSee=key==="products"?productsAllowed:key==="jobs"?jobsAllowed:isPeople?profilesAllowed:(profilesAllowed||directoryAllowed);
    if(!canSee)continue;
    const scope:Array<[string,string]>=key==="managedVets"?[["profile_kind","veterinarian"]]:key==="managedProfessionals"?[["profile_kind","professional"]]:[];
    requireCount(key+"New24",table,column,scope,true);
    if((key==="products"&&productsAllowed)||(key==="jobs"&&jobsAllowed)||(!["products","jobs"].includes(key)&&profilesAllowed)){
      for(const status of ["approved","pending","rejected"]){
        requireCount(key+status[0].toUpperCase()+status.slice(1),table,column,[...scope,["verification_status",status]]);
      }
    }
  }
  if(credentialAllowed){
    requireCount("pvmcPending","veterinarian_profiles","user_id",[["pvmc_verification_status","pending"],["verification_status","approved"]]);
    requireCount("managedPvmcPending","managed_people","id",[["pvmc_verification_status","pending"],["verification_status","approved"],["profile_kind","veterinarian"]]);
  }
  const vetCredentialAudit=credentialAllowed?await supabase.from("veterinarian_profiles")
    .select("qualifications,pvmc_number,pvmc_verification_status")
    .eq("pvmc_verification_status","approved").limit(1000):null;
  const recheckCount=vetCredentialAudit?.error?null:vetCredentialAudit?.data?.filter(row=>credentialDataFlags(row).length>0).length??null;
  if(usersAllowed){
    requireCount("accounts","profiles","id");
    requireCount("customers","profiles","id",[["primary_role","user"]]);
    requireCount("candidateAccounts","profiles","id",[["primary_role","candidate"]]);
    requireCount("newcomers","profiles","id",[["account_status","active"]]);

    requireCount("clinicAffiliations","clinic_members","clinic_id",[["membership_status","pending"]]);
  }
  if(productsAllowed){
    requireCount("products","products","id");
    requireCount("productsPending","products","id",[["verification_status","pending"]]);
  }
  if(jobsAllowed) {
    requireCount("applications","job_applications","id");
    requireCount("jobs","jobs","id");
    requireCount("jobsPending","jobs","id",[["verification_status","pending"]]);
  }
  if(can("master_data.manage")) requireCount("suggestions","master_data_suggestions","id",[["status","pending"]]);
  await Promise.all(requirements.map(([key,table,column,filters,recent])=>countOf(key,table,column,filters,recent)));
  const [recentRegistrations,recentApplications,recentProducts,recentJobs]=await Promise.all([
    usersAllowed?supabase.from("profiles").select("id",{head:true,count:"exact"}).gte("created_at",since24h):Promise.resolve({count:null,error:null}),
    jobsAllowed?supabase.from("job_applications").select("id",{head:true,count:"exact"}).gte("applied_at",since24h):Promise.resolve({count:null,error:null}),
    productsAllowed?supabase.from("products").select("id",{head:true,count:"exact"}).gte("created_at",since24h):Promise.resolve({count:null,error:null}),
    jobsAllowed?supabase.from("jobs").select("id",{head:true,count:"exact"}).gte("created_at",since24h):Promise.resolve({count:null,error:null})
  ]);
  metricCounts.set("newRegistrations24h",recentRegistrations.error?null:recentRegistrations.count);
  metricCounts.set("newApplications24h",recentApplications.error?null:recentApplications.count);
  metricCounts.set("newProducts24h",recentProducts.error?null:recentProducts.count);
  metricCounts.set("newJobs24h",recentJobs.error?null:recentJobs.count);
  const total=(...keys:string[]):number|null => keys.some(key=>metricCounts.get(key)==null) ? null : keys.reduce((sum,key)=>sum+(metricCounts.get(key)??0),0);
  const value=(key:string)=>metricCounts.get(key)??null;
  type SectorRow={name:string;href:string;total:number|null;approved:number|null;pending:number|null;rejected:number|null;new24:number|null;note?:string};
  const metricOrNull=(allowed:boolean,key:string)=>allowed?value(key):null;
  const groupStatus=(allowed:boolean,key:string,kind:"Approved"|"Pending"|"Rejected")=>
    metricOrNull(allowed,key+kind);
  const sector=(name:string,href:string,records:number|null,allowed:boolean,key:string,note?:string):SectorRow=>({
    name,href,total:records,approved:groupStatus(allowed,key,"Approved"),
    pending:groupStatus(allowed,key,"Pending"),rejected:groupStatus(allowed,key,"Rejected"),
    new24:metricOrNull(allowed,key+"New24"),note
  });
  const sectorRows:SectorRow[]=[];
  if(profilesAllowed||directoryAllowed||usersAllowed){
    const peopleStatus=profilesAllowed;
    const peopleRows=[
      {key:"vets",label:"Veterinarians",url:directoryAllowed?"/admin/directory?q=veterinarian":"/admin/users?role=veterinarian",managed:"managedVets"},
      {key:"professionals",label:"Professionals",url:directoryAllowed?"/admin/directory?q=professional":"/admin/users?role=professional",managed:"managedProfessionals"},
    ];
    for(const row of peopleRows){
      const sum=(suffix:string)=>total(row.key+suffix,row.managed+suffix);
      sectorRows.push({
        name:row.label,href:row.url,total:total(row.key,row.managed),
        approved:peopleStatus?sum("Approved"):null,
        pending:peopleStatus?sum("Pending"):null,
        rejected:peopleStatus?sum("Rejected"):null,
        new24:peopleStatus?sum("New24"):null,
        note:row.key==="vets"?"PVMC credential checks are separate from profile approval.":"Professional profile review, not a job application count."
      });
    }
    sectorRows.push(sector("Clinics & hospitals","/admin/directory?kind=clinic",value("clinics"),profilesAllowed,"clinics","Publication is a separate decision."));
    sectorRows.push(sector("Diagnostic laboratories","/admin/directory?kind=laboratory",value("labs"),profilesAllowed,"labs"));
    sectorRows.push(sector("Marketplace companies","/admin/directory?kind=company",value("companies"),profilesAllowed,"companies"));
  }
  if(productsAllowed)sectorRows.push(sector("Products & medicines","/admin/products",value("products"),true,"products"));
  if(jobsAllowed)sectorRows.push(sector("Jobs & vacancies","/admin/jobs",value("jobs"),true,"jobs","Applications are counted separately."));
  const numberLabel=(num:number|null)=>num===null?"—":num.toLocaleString("en-PK");

  const cards:Metric[]=[];
  const add=(ok:boolean,label:string,number:number|null,href:string,note:string,attention=false)=>{if(ok)cards.push({label,value:number,href,note,attention});};
  add(usersAllowed||directoryAllowed,"Veterinarians",total("vets","managedVets"),directoryAllowed?"/admin/directory?q=veterinarian":"/admin/users?role=veterinarian","Registered and staff-assisted");
  add(usersAllowed||directoryAllowed,"Professionals",total("professionals","managedProfessionals"),directoryAllowed?"/admin/directory?q=professional":"/admin/users?role=professional","Accounts and assisted records");
  add(directoryAllowed,"Companies & firms",value("companies"),"/admin/directory?kind=company","Organization records");
  add(directoryAllowed,"Clinics",value("clinics"),"/admin/directory?kind=clinic","Clinics and hospitals");
  add(directoryAllowed,"Laboratories",value("labs"),"/admin/directory?kind=laboratory","Diagnostic facilities");
  add(usersAllowed,"Customers",value("customers"),"/admin/users?role=user","Registered customer accounts");
  add(usersAllowed,"Registered accounts",value("accounts"),"/admin/users","All registered accounts");
  add(productsAllowed,"Marketplace products",value("products"),"/admin/products","Medicines, feed and other products");
  add(jobsAllowed,"Jobs & HR",value("jobs"),"/admin/jobs","Vacancy records");
  add(jobsAllowed,"Job applications",value("applications"),"/admin/applications","Applications recorded");
  add(profilesAllowed,"Pending profiles",total("vetsPending","professionalsPending","companyPending","labsPending","managedPending","clinicsPending","companiesPending"),"/admin/reviews#pending-profiles","Approval queue",true);
  add(credentialAllowed,"PVMC checks",total("pvmcPending","managedPvmcPending"),"/admin/reviews#credential-checks","Unverified submissions",true);
  add(credentialAllowed,"PVMC data rechecks",recheckCount,"/admin/credential-recheck","Approved status with missing evidence",true);
  add(productsAllowed,"Pending products",value("productsPending"),"/admin/reviews#pending-products","Publication review",true);
  add(jobsAllowed,"Pending jobs",value("jobsPending"),"/admin/reviews#jobs-review","Employer submissions",true);
  add(usersAllowed,"Pending clinic affiliations",value("clinicAffiliations"),"/admin/clinic-affiliations","Membership requests",true);
  add(can("master_data.manage"),"Category suggestions",value("suggestions"),"/admin/data#suggestions-to-review","New category/city/degree requests",true);

  const activity:Activity[]=[];
  const addActivity=(entry:Activity)=>{if(entry.at) activity.push(entry);};
  const readAccounts=usersAllowed;
  const [profiles,vets,professionals,managed,companies,clinics,laboratories,products,jobs,audit] = await Promise.all([
    readAccounts?supabase.from("profiles").select("id,full_name,primary_role,account_status,created_at").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("veterinarian_profiles").select("user_id,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("professional_profiles").select("user_id,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("managed_people").select("id,full_name,profile_kind,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("companies").select("id,canonical_name,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("clinics").select("id,clinic_name,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    profilesAllowed?supabase.from("laboratories").select("id,laboratory_name,verification_status,created_at").eq("verification_status","pending").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    productsAllowed?supabase.from("products").select("id,product_name,verification_status,created_at").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    jobsAllowed?supabase.from("jobs").select("id,title,verification_status,created_at").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null}),
    auditAllowed?supabase.from("audit_logs").select("id,action,entity_type,created_at").order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],error:null})
  ]);
  const accountIds=[...(vets.data??[]).map(x=>x.user_id),...(professionals.data??[]).map(x=>x.user_id)].filter(Boolean);
  const lookup=accountIds.length ? await supabase.from("profiles").select("id,full_name").in("id",accountIds) : {data:[]};
  const names=new Map((lookup.data??[]).map(item=>[item.id,item.full_name]));
  for(const item of profiles.data??[])addActivity({id:"registration-"+item.id,kind:"registration",name:isSuspiciousProfileName(item.full_name||"")?`Flagged account · ${item.id.slice(0,8)}`:item.full_name||"New account",status:item.account_status,at:item.created_at,href:"/admin/users/"+item.id,description:"New "+item.primary_role.replaceAll("_"," ")+" registration"});
  for(const item of vets.data??[])addActivity({id:"vet-"+item.user_id,kind:"veterinarian",name:names.get(item.user_id)||"Veterinarian registration",status:item.verification_status,at:item.created_at,href:"/admin/reviews#profile-account-"+item.user_id,description:"Veterinarian profile needs review"});
  for(const item of professionals.data??[])addActivity({id:"professional-"+item.user_id,kind:"professional",name:names.get(item.user_id)||"Professional registration",status:item.verification_status,at:item.created_at,href:"/admin/reviews#profile-account-"+item.user_id,description:"Professional profile needs review"});
  for(const item of managed.data??[])addActivity({id:"managed-"+item.id,kind:item.profile_kind,name:item.full_name||"Assisted entry",status:item.verification_status,at:item.created_at,href:"/admin/reviews#profile-managed_people-"+item.id,description:"Assisted "+item.profile_kind+" awaits review"});
  for(const item of companies.data??[])addActivity({id:"company-"+item.id,kind:"company",name:item.canonical_name,at:item.created_at,status:item.verification_status,href:"/admin/reviews#profile-companies-"+item.id,description:"Company registration needs review"});
  for(const item of clinics.data??[])addActivity({id:"clinic-"+item.id,kind:"clinic",name:item.clinic_name,at:item.created_at,status:item.verification_status,href:"/admin/reviews#profile-clinics-"+item.id,description:"Clinic needs review"});
  for(const item of laboratories.data??[])addActivity({id:"laboratory-"+item.id,kind:"laboratory",name:item.laboratory_name,at:item.created_at,status:item.verification_status,href:"/admin/reviews#profile-laboratories-"+item.id,description:"Laboratory needs review"});
  for(const item of products.data??[])addActivity({id:"product-"+item.id,kind:"product",name:item.product_name,at:item.created_at,status:item.verification_status,href:item.verification_status==="pending"?"/admin/reviews#product-"+item.id:"/admin/products/"+item.id,description:"Marketplace product"});
  for(const item of jobs.data??[])addActivity({id:"job-"+item.id,kind:"job",name:item.title,at:item.created_at,status:item.verification_status,href:item.verification_status==="pending"?"/admin/reviews#job-"+item.id:"/admin/jobs?search="+encodeURIComponent(item.title),description:"Employer opportunity"});
  for(const item of audit.data??[])addActivity({id:"audit-"+item.id,kind:"administration",name:item.action.replaceAll("_"," ").replaceAll("."," · "),at:item.created_at,status:"recorded",href:"/admin/audit",description:"Latest recorded actions: "+item.entity_type.replaceAll("_"," ")});
  const filtered=activity
    .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))
    .filter(x=>(!params.q || (x.name+" "+x.description+" "+x.kind).toLowerCase().includes(params.q.toLowerCase())) &&
      (!params.kind || params.kind==="all" || x.kind===params.kind) &&
      (!params.status || params.status==="all" || x.status===params.status))
    .slice(0,24);
  const kinds=[...new Set(activity.map(x=>x.kind))].sort();
  return <main className="vc-admin-page">
    <SiteHeader/>
    <section className="section compact-section"><div className="shell admin-control-layout vc-admin-layout">
      <div className="admin-control-sidebar"><AdminNav roles={identity.roles}/></div>
      <div className="admin-control-content vc-admin-main">
        <div className="vc-admin-toolbar">
          <div><span className="section-kicker">VETCONNECT / ADMIN CONTROL</span><h1>Administration overview</h1><p>Approvals first. Then recent updates, operational indicators and full records.</p></div>
          <div className="vc-admin-actions">
            <Link className="button button-secondary" href="/admin">Refresh</Link>
            {auditAllowed&&<Link className="button button-secondary" href="/admin/reports">Reports & CSV</Link>}
          </div>
        </div>
        <div className="vc-admin-toolbar vc-admin-toolbar-search">
          <p>Choose one task from the left navigation. Every approval opens its existing permission-controlled review page.</p>
          {(directoryAllowed||usersAllowed)&&<form className="vc-admin-global-search" action={directoryAllowed?"/admin/directory":"/admin/users"} method="get" role="search">
            <label htmlFor="admin-global-search">Find a person, company or record</label>
            <div><input id="admin-global-search" name="q" placeholder="Search by name, company or city" required/><button className="button button-primary">Search</button></div>
          </form>}
        </div>
        <section className="vc-admin-sector-summary" aria-labelledby="vc-platform-figures">
          <div className="vc-admin-section-title">
            <div><span className="section-kicker">LIVE PLATFORM FIGURES</span>
              <h2 id="vc-platform-figures">Registrations, approvals and new activity</h2>
              <p>All-time counts are separate from new records in the last 24 hours. Dash (—) means unavailable or outside your permission.</p>
            </div>
          </div>
          <div className="vc-admin-top-figures">
            {usersAllowed&&<Link href="/admin/users"><span>Registered accounts</span><strong>{numberLabel(value("accounts"))}</strong><small>All accounts</small></Link>}
            {usersAllowed&&<Link href="/admin/users"><span>New accounts</span><strong>{numberLabel(value("newRegistrations24h"))}</strong><small>Last 24 hours</small></Link>}
            {usersAllowed&&<Link href="/admin/users?role=candidate"><span>Candidate accounts</span><strong>{numberLabel(value("candidateAccounts"))}</strong><small>Primary account role only</small></Link>}
            {jobsAllowed&&<Link href="/admin/applications"><span>Job applications</span><strong>{numberLabel(value("applications"))}</strong><small>All-time submissions</small></Link>}
          </div>
          <div className="vc-admin-sector-grid" aria-label="Current sector record statistics">
            {sectorRows.map(row=><article className="vc-admin-sector-card" key={row.name}>
              <div className="vc-admin-sector-card-top"><h3>{row.name}</h3><Link href={row.href} aria-label={"Open "+row.name+" records"}>View records →</Link></div>
              <div className="vc-admin-sector-total"><strong>{numberLabel(row.total)}</strong><span>Total records</span></div>
              <div className="vc-admin-sector-states">
                <div><span>Approved</span><b>{numberLabel(row.approved)}</b></div>
                <div><span>Pending</span><b>{numberLabel(row.pending)}</b></div>
                <div><span>Rejected</span><b>{numberLabel(row.rejected)}</b></div>
                <div><span>New 24h</span><b>{numberLabel(row.new24)}</b></div>
              </div>
              {row.note&&<p className="vc-admin-sector-note">{row.note}</p>}
            </article>)}
          </div>
          <p className="vc-panel-footnote">Approved refers to the source record review status. PVMC verification, public publication and other legal approvals are independent checks. No approval is made by opening these cards.</p>
        </section>
        <section className="vc-admin-priority-panel" aria-labelledby="vc-pending-reviews">
          <div className="vc-admin-section-title"><div><span className="section-kicker">ACTION REQUIRED</span><h2 id="vc-pending-reviews">Approval and review queues</h2><p>Counts are private to your assigned permissions; opening a queue does not approve anything.</p></div>
          {profilesAllowed&&<Link href="/admin/reviews">Review centre</Link>}</div>
          <div className="vc-admin-metrics vc-admin-priority-grid" aria-label="Review queues">
            {cards.filter(card=>card.attention).map(card=><Link className="vc-admin-metric vc-admin-metric-priority" href={card.href} key={card.label}>
              <span>{card.label}</span><b>{card.value===null?"—":card.value.toLocaleString("en-PK")}</b><small>{card.value===null?"Count unavailable":card.note}</small>
              <span className="vc-metric-action">Open review queue →</span>
            </Link>)}
          </div>
        </section>
        <section className="vc-admin-panel" aria-labelledby="activity-title">
          <div className="vc-panel-header"><div><span className="section-kicker">RECENT ACTIVITY</span><h2 id="activity-title">Latest updates and decisions</h2><p>Recent registrations, requests and review decisions. Open a record for its relevant workflow.</p></div>{auditAllowed&&<Link href="/admin/audit">Full audit history →</Link>}</div>
          <form className="vc-admin-filter-row" method="get" action="/admin">
            <div><label htmlFor="activity-query">Search recent activity</label><input name="q" id="activity-query" placeholder="Name or activity" defaultValue={params.q??""}/></div>
            <div><label htmlFor="activity-kind">Type</label><select id="activity-kind" name="kind" defaultValue={params.kind??"all"}><option value="all">All records</option>{kinds.map(kind=><option key={kind} value={kind}>{kind.replaceAll("_"," ")}</option>)}</select></div>
            <div><label htmlFor="activity-status">Status</label><select id="activity-status" name="status" defaultValue={params.status??"all"}><option value="all">Any status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="active">Active</option><option value="recorded">Recorded</option></select></div>
            <button className="button button-primary" type="submit">Filter</button><Link href="/admin">Clear</Link>
          </form>
          {filtered.length ? <div className="vc-activity-list">{filtered.map(item=><Link className="vc-activity-entry" key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">
            <span className="vc-activity-mark" aria-hidden="true"></span><span className="vc-activity-content"><strong>{item.name}</strong><small>{item.description} · {item.kind.replaceAll("_"," ")}</small></span>
            <span className="vc-activity-meta"><em className={`vc-status vc-status-${item.status}`}>{item.status}</em><time dateTime={item.at}>{format(item.at)}</time></span><span aria-hidden="true">↗</span>
          </Link>)}</div>:<p className="empty-state">No matching recent records. Use the full directory or account search to locate older records.</p>}
        </section>
        {(usersAllowed||jobsAllowed) && <section className="vc-admin-panel" aria-labelledby="pulse-title"><div className="vc-panel-header"><div><span className="section-kicker">LAST 24 HOURS</span><h2 id="pulse-title">Operational pulse</h2></div></div>
          <div className="admin-pulse-grid">
            {usersAllowed&&<article><Link href="/admin/users"><b>{value("newRegistrations24h")===null?"—":value("newRegistrations24h")}</b><span>New registrations</span></Link></article>}
            {jobsAllowed&&<article><Link href="/admin/jobs"><b>{value("newJobs24h")===null?"—":value("newJobs24h")}</b><span>New job posts</span></Link></article>}
            {jobsAllowed&&<article><Link href="/admin/applications"><b>{value("newApplications24h")===null?"—":value("newApplications24h")}</b><span>New job applications</span></Link></article>}
            {usersAllowed&&<article><Link href="/admin/clinic-affiliations"><b>{value("clinicAffiliations")===null?"—":value("clinicAffiliations")}</b><span>Pending clinic affiliations</span></Link></article>}
          </div><p className="vc-panel-footnote">The first three cards show the last rolling 24 hours. Clinic affiliations show the current pending queue.</p>
        </section>}

      </div>
    </div></section>
    <SiteFooter/>
  </main>;
}
