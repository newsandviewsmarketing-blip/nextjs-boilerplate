export function formField(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function commaList(formData: FormData, name: string) {
  return formField(formData, name)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugifyProduct(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 58);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function readProductInput(formData: FormData) {
  const productName = formField(formData, "product_name");
  const category = formField(formData, "category");
  const companyUserId = formField(formData, "company_user_id");
  const imageUrl = formField(formData, "image_url");

  if (!productName || !category) {
    return { error: "Product name and category are required." } as const;
  }
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    return { error: "Product image must use a secure https:// URL." } as const;
  }

  const sectors = commaList(formData, "sectors");
  return {
    error: null,
    companyUserId,
    regulatoryNumber: formField(formData, "regulatory_number"),
    data: {
      product_name: productName,
      product_code: formField(formData, "product_code") || null,
      brand_name: formField(formData, "brand_name") || null,
      generic_name: formField(formData, "generic_name") || null,
      category,
      subclass: formField(formData, "subclass") || null,
      therapeutic_class: formField(formData, "therapeutic_class") || null,
      sector: sectors[0] || null,
      sectors,
      species: commaList(formData, "species"),
      production_systems: commaList(formData, "production_systems"),
      use_areas: commaList(formData, "use_areas"),
      routes: commaList(formData, "routes"),
      composition: formField(formData, "composition") || null,
      strength: formField(formData, "strength") || null,
      dosage_form: formField(formData, "dosage_form") || null,
      pack_sizes: commaList(formData, "pack_sizes"),
      indications: formField(formData, "indications") || null,
      precautions: formField(formData, "precautions") || null,
      contraindications: formField(formData, "contraindications") || null,
      warnings: formField(formData, "warnings") || null,
      meat_withdrawal: formField(formData, "meat_withdrawal") || null,
      milk_withdrawal: formField(formData, "milk_withdrawal") || null,
      egg_withdrawal: formField(formData, "egg_withdrawal") || null,
      description: formField(formData, "description") || null,
      storage_instructions: formField(formData, "storage_instructions") || null,
      cold_chain: formData.get("cold_chain") === "on",
      temperature_range: formField(formData, "temperature_range") || null,
      shelf_life: formField(formData, "shelf_life") || null,
      country_of_origin: formField(formData, "country_of_origin") || null,
      image_url: imageUrl || null,
      availability: formField(formData, "availability") || null,
    },
  } as const;
}
