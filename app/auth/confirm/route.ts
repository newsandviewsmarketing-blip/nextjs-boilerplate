import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function loginRedirect(
  origin: string,
  kind: "error" | "message",
  text: string,
) {
  return NextResponse.redirect(
    new URL(
      `/login?${kind}=${encodeURIComponent(text)}`,
      origin,
    ),
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const tokenHash =
    url.searchParams.get("token_hash");

  const type =
    url.searchParams.get("type") as EmailOtpType | null;

  const code =
    url.searchParams.get("code");

  const requestedNext =
    url.searchParams.get("next") ??
    "/dashboard";

  const next =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  if (!isSupabaseConfigured()) {
    return loginRedirect(
      url.origin,
      "error",
      "Backend is not configured.",
    );
  }

  const supabase =
    await createClient();

  let authError: Error | null = null;

  if (code) {
    const result =
      await supabase.auth.exchangeCodeForSession(
        code,
      );

    authError = result.error;
  } else if (tokenHash && type) {
    const result =
      await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

    authError = result.error;
  } else {
    authError = new Error(
      "The confirmation link is incomplete.",
    );
  }

  if (authError) {
    return loginRedirect(
      url.origin,
      "error",
      authError.message,
    );
  }

  // ----------------------------------------------------------
  // SECURITY GATE
  // ----------------------------------------------------------
  // A confirmation, magic-link, or password-recovery callback
  // can create an authenticated Supabase session.
  //
  // Before allowing that session to continue, VetConnect must
  // verify that the application account is not suspended.
  // ----------------------------------------------------------

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims =
    claimsData?.claims;

  const userId =
    typeof claims?.sub === "string"
      ? claims.sub
      : null;

  if (claimsError || !userId) {
    await supabase.auth.signOut();

    return loginRedirect(
      url.origin,
      "error",
      "Unable to verify your account session. Please sign in again.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();

    return loginRedirect(
      url.origin,
      "error",
      "Unable to verify your VetConnect account status. Please try again.",
    );
  }

  if (profile?.account_status === "suspended") {
    await supabase.auth.signOut();

    return loginRedirect(
      url.origin,
      "error",
      "Your VetConnect account is suspended. Contact VetConnect support.",
    );
  }

  return NextResponse.redirect(
    new URL(next, url.origin),
  );
}
