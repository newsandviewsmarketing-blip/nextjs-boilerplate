import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function compile(path,imports) {
 const module={exports:{}};
 const code=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:name=>{if(name in imports)return imports[name];throw new Error("Unexpected import "+name);},URL,FormData,Date,console});
 return module.exports;
}
const info=compile("lib/public-information.ts",{"@/lib/seo":{absoluteUrl:p=>"https://www.vetconnect.com.pk"+p}});
const docs=compile("lib/site-content-document.ts",{"./public-information":info});
const form=()=>{const f=new FormData();f.set("slug","about");f.set("revision","1");f.set("document",JSON.stringify(docs.sourceSiteDocument("about")));return f;};
test("All current pages round-trip with sections and source links preserved",()=>{
 for(const slug of ["about","team","terms","privacy","cookies"]){
  const d=docs.sourceSiteDocument(slug);
  assert.equal(docs.validateSiteDocument(d,slug),d);
  const p=docs.publicPageFromDocument(d);
  assert.deepEqual(JSON.parse(JSON.stringify(p)),JSON.parse(JSON.stringify(info.PUBLIC_INFORMATION[slug])));
 }
});
test("Editor rejects invalid dates, wrong slugs, executable HTML and unexpected metadata",()=>{
 for(const change of [{effectiveDate:"2026-02-30"},{slug:"privacy"},{schemaVersion:1},{title:"<script>x</script>"},{service_role:"hidden"}]){
  assert.throws(()=>docs.validateSiteDocument({...docs.sourceSiteDocument("about"),...change},"about"));
 }
 assert.equal(docs.isSiteSlug("__proto__"),false);
 assert.throws(()=>docs.validateSiteDocument({...docs.sourceSiteDocument("about"),sections:[]},"about"));
});
test("Public links reject executable schemes, protocol-relative paths, credentials and signed tokens",()=>{
 for(const link of ["javascript:alert(1)","//evil.test","/admin/users","https://user:pass@example.com","https://x.test?token=abc","/api/files","https://x.test/\\evil"]){
  assert.equal(docs.safeContentLink(link),false,link);
 }
 for(const link of ["/vets","/register","https://www.nicfaisalabad.com/startup/vet-connect/"])assert.equal(docs.safeContentLink(link),true,link);
});
test("History conversion does not mutate the original and preserves paragraph ordering",()=>{
 const legacy={slug:"about",title:"Old title",summary:"Old summary",version:"v1",effectiveDate:"2026-10-31",sections:[{heading:"Purpose",paragraphs:["First paragraph","Second paragraph"]}]};
 const before=JSON.stringify(legacy);
 const restored=docs.historySiteDocument(legacy,"about");
 assert.equal(JSON.stringify(legacy),before);
 assert.equal(restored.schemaVersion,2);
 assert.equal(docs.publicPageFromDocument(restored).sections[0].body,"First paragraph\n\nSecond paragraph");
});
function actions({rights=["site.manage"],gate=true,revision=1,identity={userId:"staff"},readError=null}={}){
 const writes=[], paths=[];
 const db={rpc:async(name,args)=>{if(name.startsWith("site_content_can_"))return {data:gate,error:null};writes.push({name,args});return {data:null,error:null};},
  from:()=>({select:()=>({eq(){return this;},maybeSingle:async()=>({data:{document:docs.sourceSiteDocument("about"),revision},error:readError})})})};
 const mod=compile("app/admin/website/actions.ts",{
  "next/navigation":{redirect:url=>{throw new Error("REDIRECT:"+url);}},
  "next/cache":{revalidatePath:p=>paths.push(p)},
  "@/lib/auth":{getCurrentIdentity:async()=>identity},
  "@/lib/admin":{getEffectiveAdminPermissions:async()=>new Set(rights)},
  "@/lib/supabase/server":{createClient:async()=>db},
  "@/lib/site-content-document":docs
 });
 return {mod,writes,paths};
}
test("Unauthenticated, revoked and database-denied callers cannot save drafts",async()=>{
 for(const opts of [{identity:null},{rights:[]},{gate:false}]){
  const a=actions(opts);
  await assert.rejects(a.mod.saveWebsiteDraftAction(form()));
  assert.equal(a.writes.length,0);
 }
});
test("Draft-only editors can save but cannot publish",async()=>{
 const a=actions({rights:["site_content.edit"]});
 await assert.rejects(a.mod.saveWebsiteDraftAction(form()),/REDIRECT:/);
 assert.equal(a.writes[0].name,"save_site_content_drafts");
 const b=actions({rights:["site_content.edit"]});
 const f=form();f.set("confirm","publish");
 await assert.rejects(b.mod.publishWebsiteDraftAction(f),/permission/);
 assert.equal(b.writes.length,0);
});
test("Publishing requires explicit review, validates saved revision and refuses stale drafts",async()=>{
 for(const [opts,confirm] of [[{},false],[{revision:2},true],[{readError:{message:"unavailable"}},true]]){
  const a=actions(opts), f=form();if(confirm)f.set("confirm","publish");
  await assert.rejects(a.mod.publishWebsiteDraftAction(f));
  assert.equal(a.writes.length,0);
 }
 const a=actions(),f=form();f.set("confirm","publish");
 await assert.rejects(a.mod.publishWebsiteDraftAction(f),/REDIRECT:/);
 assert.equal(a.writes[0].name,"publish_site_content");
 assert.equal(a.writes[0].args.expected_revision,1);
 assert.ok(a.paths.includes("/about"));
});
