import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [] });
  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim();
  const parentId = url.searchParams.get("parent_id")?.trim();
  const supabase = await createClient();
  let query = supabase
    .from("master_data_items")
    .select("id, category, parent_id, code, label, metadata, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");
  if (category) query = query.eq("category", category);
  if (parentId) query = query.eq("parent_id", parentId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
