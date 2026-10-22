import adminAreas from "../public/data/pakistan-administrative-hierarchy.json";
import type { PublicJob } from "./jobs";

const provinceAliases: Record<string,string> = {
  "islamabad capital territory": "islamabad",
  "gilgit-baltistan": "gilgit baltistan",
  "azad jammu and kashmir": "azad kashmir",
  "ajk": "azad kashmir",
};
const clean = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g," ");
const normalizeProvince = (s: string | null | undefined) => {
  const name = clean(s);
  return provinceAliases[name] ?? name;
};

type AreaInfo = { province: string; district: string | null };
const areaMap = new Map<string, AreaInfo>();
const locationNames = new Set<string>();
for (const province of adminAreas.data) {
  const provinceName = normalizeProvince(province.name.en);
  areaMap.set(provinceName, {province:provinceName,district:null});
  locationNames.add(province.name.en);
  for (const district of province.district) {
    const districtName = clean(district.name.en);
    if (!areaMap.has(districtName)) areaMap.set(districtName, {province:provinceName,district:districtName});
    locationNames.add(district.name.en);
    for (const tehsil of district.tehsil) {
      const townName = clean(tehsil.name.en);
      if (!areaMap.has(townName)) areaMap.set(townName, {province:provinceName,district:districtName});
    }
  }
}
export function locationSearchOptions(): string[] {
  return [...locationNames].sort((a,b)=>a.localeCompare(b));
}

export function matchesJobLocation(job: PublicJob, search: string): boolean {
  const term=clean(search);
  if (!term || term==="all cities" || term==="all locations") return true;
  const targetProvince = normalizeProvince(job.coverage?.province ?? job.province);
  const queryArea=areaMap.get(normalizeProvince(search)) ?? null;
  const scope=job.coverage?.scope;
  if (scope==="nationwide") return true;
  if (scope==="flexible") return false;

  // Searches at province level show jobs whose stated coverage includes that province.
  if (queryArea?.district===null && queryArea?.province===targetProvince) return true;
  if (normalizeProvince(search)===targetProvince && targetProvince) return true;

  // Province-wide jobs should appear in a city/district search in that province.
  if (scope==="province" && queryArea && queryArea.province===targetProvince) return true;

  const single = [job.city,job.district].some(s=>clean(s)===term);
  if (!job.coverage) return single;
  return Boolean(single || job.coverage_areas?.some(area => {
    if ([area.city,area.district,area.label].some(x=>clean(x)===term)) return true;
    // A district assignment includes tehsil/town matches within the same district.
    return area.district && queryArea?.district===clean(area.district) &&
      queryArea.province===normalizeProvince(area.province);
  }));
}
