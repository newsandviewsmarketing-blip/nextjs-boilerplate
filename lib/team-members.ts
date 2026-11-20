import { createClient } from "@/lib/supabase/server";

export type TeamMember = {
  id:string;full_name:string;slug:string;job_title:string;department:string;
  summary:string;biography:string;expertise:string;qualifications:string;
  photo_path:string|null;linkedin_url:string|null;email_public:string|null;
  sort_order:number;is_published:boolean;
};
export function teamPhotoUrl(path:string|null):string|null {
  if (!path || !/^[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+$/.test(path)) return null;
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!base) return null;
  return base.replace(/\/$/,"")+"/storage/v1/object/public/team-photos/"+path;
}
export async function publishedTeamMembers():Promise<TeamMember[]> {
  const db=await createClient();
  const {data,error}=await db.from("team_members").select("*").eq("is_published",true).order("sort_order").order("full_name");
  if(error) return [];
  return (data??[]) as TeamMember[];
}
