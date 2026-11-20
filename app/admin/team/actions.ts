"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function field(form:FormData,name:string,max:number) {return String(form.get(name)??"").trim().slice(0,max);}
function urlField(form:FormData,name:string) {
  const value=field(form,name,500); if(!value)return null;
  try { const url=new URL(value);if(url.protocol!=="https:")throw Error();return url.href; }
  catch {throw Error("Provide a valid HTTPS link for "+name);}
}
export async function saveTeamMember(form:FormData){
  const identity=await requireAdminPermission("site.manage","/admin/team");
  const db=await createClient();
  const id=field(form,"id",64);
  if(id && !uuid.test(id))throw Error("Invalid member ID.");
  const name=field(form,"full_name",120),title=field(form,"job_title",120);
  const slug=field(form,"slug",100).toLowerCase();
  if(name.length<2||title.length<2||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error("Name, title and URL slug are required.");
  const summary=field(form,"summary",500),biography=field(form,"biography",8000);
  const sort=Number(field(form,"sort_order",8));
  if(!Number.isSafeInteger(sort)||sort<0||sort>99999)throw Error("Invalid display order.");
  let photoPath:string|null=null;
  if(id){
    const {data,error}=await db.from("team_members").select("photo_path").eq("id",id).maybeSingle();
    if(error||!data)throw Error("Member not found or permission denied.");
    photoPath=data.photo_path;
  }
  const image=form.get("photo");
  if(image instanceof File && image.size>0){
    if(image.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(image.type))throw Error("Choose a JPG, PNG or WebP image under 5 MB.");
    const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[image.type];
    const filePath=identity.userId+"/"+crypto.randomUUID()+"."+ext;
    const {error}=await db.storage.from("team-photos").upload(filePath,image,{contentType:image.type,upsert:false});
    if(error)throw Error("Photo upload failed.");
    photoPath=filePath;
  }
  const values={
    full_name:name,slug,job_title:title,department:field(form,"department",120),
    summary,biography,expertise:field(form,"expertise",1200),
    qualifications:field(form,"qualifications",1200),
    linkedin_url:urlField(form,"linkedin_url"),email_public:field(form,"email_public",254)||null,
    photo_path:photoPath,sort_order:sort,is_published:form.get("is_published")==="on",
    updated_at:new Date().toISOString()
  };
  if(values.email_public&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email_public))throw Error("Invalid public email.");
  const result=id?await db.from("team_members").update(values).eq("id",id):
     await db.from("team_members").insert(values);
  if(result.error)throw Error("Unable to save team profile. Check the slug is unique and the database migration has been applied.");
  revalidatePath("/team");revalidatePath("/admin/team");
  redirect("/admin/team?message=Member%20profile%20saved");
}
export async function unpublishTeamMember(form:FormData){
  await requireAdminPermission("site.manage","/admin/team");
  const id=field(form,"id",64);if(!uuid.test(id))throw Error("Invalid member ID.");
  const db=await createClient();
  const {error}=await db.from("team_members").update({is_published:false,updated_at:new Date().toISOString()}).eq("id",id);
  if(error)throw Error("Unable to unpublish team profile.");
  revalidatePath("/team");revalidatePath("/admin/team");
  redirect("/admin/team?message=Member%20unpublished");
}
