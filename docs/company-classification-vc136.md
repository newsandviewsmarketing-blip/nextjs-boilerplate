# Company classification (VC-136)

One canonical company ID; multiple sectors; two taxonomy levels only. Business activity and target animal coverage are attributes of the selected sector/subsector, not extra taxonomy levels. Never infer a company's sector from its business activity.

| Sector | Subsector examples |
|---|---|
| Poultry | Broiler, Layer, Breeder, Hatchery, Processing |
| Dairy | Farming, Milk collection, Processing |
| Livestock | Beef, Buffalo, Sheep, Goat, Camel |
| Feed industry | Poultry feed mill, Dairy feed mill, Livestock feed mill, Aqua feed mill, Pet food |
| Animal nutrition | Premixes, Additives, Minerals, Vitamins, Enzymes, Probiotics |
| Veterinary medicines | Poultry, Dairy, Livestock, Pet, Aqua medicines |
| Vaccines and biologicals | Poultry, Dairy, Livestock, Pet, Aqua vaccines, Other biologicals |
| Feed ingredients | Maize, Soybean, Soybean meal, Oilseed meals |
| Genetics | Poultry genetics, Dairy genetics, Semen, Embryos |
| Aquaculture | Fish, Shrimp, Hatcheries |
| Diagnostics | Veterinary, Feed, Food testing |
| Equipment | Poultry, Dairy, Feed mill, Laboratory equipment |
| Biosecurity | Disinfection, Hygiene, Water treatment |
| Agriculture | Seeds, Fodder, Crops, Inputs |
| Food processing | Meat, Milk, Eggs |
| Pets | Food, Accessories, Care |
| Services | Veterinary, Nutrition, Farm management |
| Wildlife and One Health | Conservation, Zoonoses, AMR |

Activities: local manufacturer, contract manufacturer, importer, exporter, distributor, trader, wholesaler, retailer, principal, indentor, marketer, registration holder, farm operator, processor, service provider, consultant. Multiple per classification. Coverage: poultry, dairy, beef, small ruminants, pets, equine, aquaculture, camel, wildlife, other.

## Verified gap
RegistrationDetails currently submits company activities as industry_sectors; registration-categories requires both arrays to match. This conflates independent dimensions. Existing company_sectors uses company_user_id, sector and subsectors array. Audit persistence and canonical company mapping before changing the contract; preserve legacy records without guessing their classification.

## Acceptance gates
- Shared master IDs and aliases; mobile checkbox disclosure; no third level; preserve selections on validation errors.
- Separate activity and sector validation; ownership-scoped canonical company relationships; no duplicate company creation.
- Customer/admin create and edit parity; secure draft recovery; independent approval gates.
- Authorized reports count distinct company IDs overall and per sector/subsector/activity; no summing overlapping sector counts as company totals.
- Synthetic multi-company and multi-sector tests, legacy compatibility, RLS checks, CI, preview and rollback plan before production.

This document is a specification, not an implemented migration or release.
