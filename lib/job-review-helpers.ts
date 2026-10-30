import "server-only";
import {createClient} from "@/lib/supabase/server";

/** Propose unknown controlled terms. Never activates master data directly. */
export async function proposeJobMasterTerms(args:{
  jobId:string; userId:string; sector?:string|null; qualification?:string|null;
  cities?:string[];province?:string|null;districts?:string[];tehsil?:string|null;
}) {
  const supabase=await createClient();
  const proposed=[
    {category:"job_sector",label:args.sector ?? "",context_province:null},
    {category:"job_qualification",label:args.qualification ?? "",context_province:null},
    ...(args.cities ?? []).map(label=>({category:"city",label,context_province:args.province ?? null})),
    ...(args.districts ?? []).map(label=>({category:"district",label,context_province:args.province ?? null})),
    {category:"tehsil",label:args.tehsil ?? "",context_province:args.province ?? null},
  ].filter(x=>x.label.trim().length>=2 && x.label.trim().length<=150 && !(x.category==="job_sector" && x.label.trim().toLowerCase()==="punjab"));
  const unique=new Map(proposed.map(x=>[x.category+":"+x.context_province+":"+x.label.toLowerCase(),x]));
  const categories=[...new Set([...unique.values()].map(x=>x.category))];
  const {data:approved,error:fetchError}=await supabase.from("master_data_items")
    .select("category,label,metadata").in("category",categories).eq("is_active",true);
  if(fetchError) return {count:0,error:fetchError.message};
  const approvedItems=approved ?? [];
  let count=0;
  for(const item of unique.values()){
    const name=item.label.trim();
    const exists=approvedItems.some(x=>x.category===item.category && x.label.trim().toLowerCase()===name.toLowerCase()
      && (!item.context_province || !((x.metadata as Record<string,unknown>|null)?.province) ||
      String((x.metadata as Record<string,unknown>).province).toLowerCase()===item.context_province.toLowerCase()));
    if(exists)continue;
    const {error}=await supabase.from("master_data_suggestions").insert({
      category:item.category,label:name,context_province:item.context_province,
      source_job_id:args.jobId,created_by:args.userId,status:"pending",
    });
    if(!error) count++;
    else if(error.code!=="23505") return {count,error:error.message};
  }
  return {count,error:null};
}

/** Optional email delivery. In-app review queue remains authoritative. */
export async function emailJobReviewNotice(jobId:string,title:string,company:string){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.VETCONNECT_NOTIFICATION_FROM;
  const to=process.env.VETCONNECT_ADMIN_EMAIL || "vetconnect.official@gmail.com";
  if(!apiKey || !from)return {sent:false,reason:"Email provider not configured"};
  try{
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify({from,to:[to],subject:"VetConnect: Job awaiting review",
        text:["A new job draft is awaiting approval.", "Title: "+title,"Employer: "+company,
          "Review: https://vetconnect.com.pk/admin/reviews#job-"+jobId,
          "This job is not public until an authorized reviewer approves it."].join("\n")}),
    });
    if(!response.ok) return {sent:false,reason:"Email provider rejected request"};
    return {sent:true,reason:null};
  }catch{
    return {sent:false,reason:"Email delivery unavailable"};
  }
}
