import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { registrationEvidenceRequirements } from "@/lib/registration-evidence";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user?.user_metadata?.registration_details_pending === true) {
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("primary_role").eq("id", user.id).maybeSingle();
    const intent = user.user_metadata?.registration_intent === "clinic" ? "clinic" : "";
    const track = typeof user.user_metadata?.student_track === "string" ? user.user_metadata.student_track : "";
    const requiredTypes = [...registrationEvidenceRequirements(profile?.primary_role ?? "", intent, track).map((item) => item.type), "cnic_front", "cnic_back"];
    const { data: rows, error } = await supabase.from("registration_evidence")
      .select("document_type").eq("user_id", user.id);
    const submitted = new Set((rows ?? []).map((row) => row.document_type));
    if (profileError || error || !requiredTypes.every((type) => submitted.has(type))) {
      redirect("/register/complete");
    }
  }
  return children;
}
