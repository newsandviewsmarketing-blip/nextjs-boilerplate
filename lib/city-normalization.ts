/**
 * UI-only normalization of public city labels. Preserve original database values.
 * This is deliberately conservative: do not merge distinct towns or districts.
 */
export function canonicalCity(value:string|null|undefined):string{
 let name=(value??"").trim().replace(/\s+/g," ");
 if(!name)return "";
 name=name.replace(/,?\s+Pakistan$/i,"").replace(/,?\s+(Punjab|Sindh|Balochistan|Baluchistan|Khyber Pakhtunkhwa|KPK|Gilgit Baltistan|Azad Kashmir)$/i,"");
 name=name.replace(/\s+City$/i,"").trim();
 return name.replace(/\s+/g," ");
}
export function matchesCity(value:string|null|undefined,selected:string|null|undefined):boolean{
 const query=canonicalCity(selected).toLocaleLowerCase("en");
 return !query||query==="all cities"||canonicalCity(value).toLocaleLowerCase("en")===query;
}
export function uniqueCities(values:(string|null|undefined)[]):string[]{
 const names=new Map<string,string>();
 for(const value of values){
  const label=canonicalCity(value);
  if(label)names.set(label.toLocaleLowerCase("en"),label);
 }
 return [...names.values()].sort((a,b)=>a.localeCompare(b,"en"));
}
