import { createClient } from "@/lib/supabase/server";

export type TeamMember = {
  id:string;full_name:string;slug:string;job_title:string;department:string;
  summary:string;biography:string;expertise:string;qualifications:string;
  photo_path:string|null;linkedin_url:string|null;email_public:string|null;
  sort_order:number;is_published:boolean;
  team_group:string;seo_title:string;seo_description:string;website_url:string|null;facebook_url:string|null;photo_position_y:number;
};
export function teamPhotoUrl(path:string|null):string|null {
  if (!path || !/^[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+$/.test(path)) return null;
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!base) return null;
  return base.replace(/\/$/,"")+"/storage/v1/object/public/team-photos/"+path;
}
export const TEAM_GROUPS = [
  {value:"chairman",label:"Chairman",rank:0},
  {value:"founder",label:"Founder",rank:1},
  {value:"leadership",label:"Leadership",rank:2},
  {value:"management",label:"Management",rank:3},
  {value:"team",label:"Our Team",rank:4},
  {value:"advisors",label:"Advisors",rank:5}
] as const;
export function sortTeamMembers<T extends TeamMember>(members:T[]):T[]{
 const priority=new Map<string,number>(TEAM_GROUPS.map(g=>[g.value,g.rank]));
 return [...members].sort((a,b)=>(priority.get(a.team_group)??4)-(priority.get(b.team_group)??4)
 || a.sort_order-b.sort_order || a.full_name.localeCompare(b.full_name));
}
export async function publishedTeamMembers():Promise<TeamMember[]> {
  const db=await createClient();
  const {data,error}=await db.from("team_members").select("*").eq("is_published",true).order("sort_order").order("full_name");
  if(error) return [];
  return sortTeamMembers((data??[]) as TeamMember[]);
}
