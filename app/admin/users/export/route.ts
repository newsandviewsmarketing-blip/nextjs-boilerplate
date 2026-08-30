import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

function csv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

type ProfileExportRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  primary_role: string;
  account_status: string;
  province: string | null;
  district: string | null;
  tehsil: string | null;
  city: string | null;
  created_at: string;
};

type VetExportRow = {
  user_id: string;
  pvmc_number: string | null;
  veterinary_sector: string | null;
  specialization: string | null;
  verification_status: string | null;
};

export async function GET(request: Request) {
  const identity = await getCurrentIdentity();
  if (!identity || !hasAdminPermission(identity, "users.manage")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().toLowerCase();
  const role = params.get("role") ?? "";
  const province = params.get("province") ?? "";
  const district = params.get("district") ?? "";
  const sector = params.get("sector") ?? "";
  const verification = params.get("verification") ?? "";

  const supabase = await createClient();
  const pageSize = 1000;
  const profiles: ProfileExportRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,phone,primary_role,account_status,province,district,tehsil,city,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) return new NextResponse(error.message, { status: 500 });
    const page = (data ?? []) as ProfileExportRow[];
    profiles.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  const { data: vets, error: vetsError } = await supabase
    .from("veterinarian_profiles")
    .select("user_id,pvmc_number,veterinary_sector,specialization,verification_status");
  if (vetsError) return new NextResponse(vetsError.message, { status: 500 });

  const vetMap = new Map<string, VetExportRow>();
  for (const row of (vets ?? []) as VetExportRow[]) vetMap.set(row.user_id, row);

  const filtered = profiles.filter((profile) => {
    const vet = vetMap.get(profile.id);
    const haystack = `${profile.full_name} ${profile.email} ${profile.phone ?? ""} ${profile.city ?? ""} ${profile.tehsil ?? ""} ${profile.district ?? ""} ${profile.province ?? ""} ${profile.primary_role} ${vet?.pvmc_number ?? ""} ${vet?.veterinary_sector ?? ""} ${vet?.specialization ?? ""}`.toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (!role || profile.primary_role === role) &&
      (!province || profile.province === province) &&
      (!district || profile.district === district) &&
      (!sector || vet?.veterinary_sector === sector) &&
      (!verification || vet?.verification_status === verification)
    );
  });

  const header = [
    "Name",
    "Email",
    "Phone",
    "Role",
    "Account Status",
    "Province",
    "District",
    "Tehsil/Taluka",
    "City/Town",
    "PVMC",
    "Veterinary Sector",
    "Specialization",
    "Verification",
    "Registered At",
  ];

  const rows = filtered.map((profile) => {
    const vet = vetMap.get(profile.id);
    return [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.primary_role,
      profile.account_status,
      profile.province,
      profile.district,
      profile.tehsil,
      profile.city,
      vet?.pvmc_number,
      vet?.veterinary_sector,
      vet?.specialization,
      vet?.verification_status,
      profile.created_at,
    ].map(csv).join(",");
  });

  const bom = "\uFEFF";
  return new NextResponse(bom + [header.map(csv).join(","), ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="vetconnect-users-directory.csv"',
    },
  });
}
