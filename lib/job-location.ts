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
// Names such as Khanpur and Kingri occur in more than one province.
// Keep every matching administrative area instead of silently using the first.
const areaMap = new Map<string, AreaInfo[]>();
const addArea = (name: string, info: AreaInfo) => {
  const areas = areaMap.get(name) ?? [];
  if (!areas.some(area => area.province === info.province && area.district === info.district)) {
    areas.push(info);
    areaMap.set(name, areas);
  }
};
const locationNames = new Set<string>();
for (const province of adminAreas.data) {
  const provinceName = normalizeProvince(province.name.en);
  addArea(provinceName, {province:provinceName,district:null});
  locationNames.add(province.name.en);
  for (const district of province.district) {
    const districtName = clean(district.name.en);
    addArea(districtName, {province:provinceName,district:districtName});
    locationNames.add(district.name.en);
    for (const tehsil of district.tehsil) {
      const townName = clean(tehsil.name.en);
      addArea(townName, {province:provinceName,district:districtName});
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
  const queryAreas=areaMap.get(normalizeProvince(search)) ?? [];
  const scope=job.coverage?.scope;
  if (scope==="nationwide") return true;
  if (scope==="flexible") return false;

  // Searches at province level show jobs whose stated coverage includes that province.
  if (queryAreas.some(area => area.district===null && area.province===targetProvince)) return true;
  if (normalizeProvince(search)===targetProvince && targetProvince) return true;

  // Province-wide jobs should appear in a city/district search in that province.
  if (scope==="province" && queryAreas.some(area => area.province===targetProvince)) return true;

  const single = [job.city,job.district].some(s=>clean(s)===term);
  if (!job.coverage) return single;
  return Boolean(single || job.coverage_areas?.some(area => {
    if ([area.city,area.district,area.label].some(x=>clean(x)===term)) return true;
    // A district assignment includes tehsil/town matches within the same district.
    return area.district && queryAreas.some(queryArea =>
      queryArea.district===clean(area.district) &&
      queryArea.province===normalizeProvince(area.province));
  }));
}
