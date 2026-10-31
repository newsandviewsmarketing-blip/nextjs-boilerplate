import hierarchy from "../public/data/pakistan-administrative-hierarchy.json";

export type PakistanLocationOption = {
  value: string;
  label: string;
  province: string;
};

// Source: Open Admin Data Pakistan administrative divisions (CC BY 4.0).
// Store the chosen town/district name in existing registration fields for compatibility.
const options: PakistanLocationOption[] = [];
const seen = new Set<string>();

for (const province of hierarchy.data) {
  for (const district of province.district) {
    const districtName = district.name.en.trim();
    const districtKey = [districtName, province.name.en, districtName].join("|").toLowerCase();
    if (!seen.has(districtKey)) {
      seen.add(districtKey);
      options.push({
        value: districtName,
        label: districtName + " District — " + province.name.en,
        province: province.name.en,
      });
    }
    for (const tehsil of district.tehsil) {
      const townName = tehsil.name.en.trim();
      const key = [townName, province.name.en, districtName].join("|").toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          value: townName,
          label: townName + " — " + districtName + ", " + province.name.en,
          province: province.name.en,
        });
      }
    }
  }
}

export const PAKISTAN_LOCATION_OPTIONS = options.sort((a, b) =>
  a.province.localeCompare(b.province) || a.label.localeCompare(b.label),
);

export const PAKISTAN_PROVINCES = hierarchy.data.map(item => item.name.en);

export function isPakistanLocationInProvince(city: string, province: string): boolean {
  return PAKISTAN_LOCATION_OPTIONS.some(option =>
    option.value.toLowerCase() === city.trim().toLowerCase() && option.province === province,
  );
}

const validLocationNames = new Set(
  PAKISTAN_LOCATION_OPTIONS.map(option => option.value.trim().toLowerCase()),
);

export function isPakistanLocation(value: string): boolean {
  return validLocationNames.has(value.trim().toLowerCase());
}
