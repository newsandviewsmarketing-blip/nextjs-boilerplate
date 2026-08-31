"use server";

import process from "node:process";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAllowedSelfRegistrationRole } from "@/lib/auth";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function withMessage(
  path: string,
  kind: "error" | "message",
  text: string,
) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}${kind}=${encodeURIComponent(text)}`;
}

function ensureConfigured(path: string) {
  if (!isSupabaseConfigured()) {
    redirect(
      withMessage(
        path,
        "error",
        "Backend is not configured yet.",
      ),
    );
  }
}

/**
 * Security gate for authenticated sessions.
 *
 * A suspended VetConnect account must not retain application access
 * merely because a valid Supabase session already exists.
 *
 * If the authenticated profile is suspended:
 * 1. terminate the Supabase session;
 * 2. redirect to login;
 * 3. show a clear suspension message.
 */
async function blockSuspendedAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
) {
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const claims = claimsData?.claims;

  const userId =
    typeof claims?.sub === "string"
      ? claims.sub
      : null;

  if (claimsError || !userId) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.account_status === "suspended") {
    await supabase.auth.signOut();

    redirect(
      withMessage(
        path,
        "error",
        "Your VetConnect account is suspended. Contact VetConnect support.",
      ),
    );
  }
}

export async function loginAction(formData: FormData) {
  ensureConfigured("/login");

  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const nextValue = value(formData, "next");

  const next =
    nextValue.startsWith("/") &&
    !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email || !password) {
    redirect(
      withMessage(
        "/login",
        "error",
        "Enter your email and password.",
      ),
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    redirect(
      withMessage(
        "/login",
        "error",
        error.message,
      ),
    );
  }

  await blockSuspendedAccount(
    supabase,
    "/login",
  );

  revalidatePath("/", "layout");

  redirect(next);
}

export async function requestLoginOtpAction(
  formData: FormData,
) {
  ensureConfigured("/login");

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  const nextValue = value(
    formData,
    "next",
  );

  const next =
    nextValue.startsWith("/") &&
    !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email) {
    redirect(
      withMessage(
        "/login",
        "error",
        "Enter your email address.",
      ),
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

  if (error) {
    redirect(
      withMessage(
        "/login",
        "error",
        error.message,
      ),
    );
  }

  redirect(
    `/verify-email?mode=login&email=${encodeURIComponent(
      email,
    )}&next=${encodeURIComponent(
      next,
    )}&message=${encodeURIComponent(
      "A six-digit verification code has been sent to your email.",
    )}`,
  );
}

export async function requestRegistrationOtpAction(
  formData: FormData,
) {
  ensureConfigured("/register");

  const fullName = value(
    formData,
    "full_name",
  );

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  const role = value(
    formData,
    "role",
  );

  const city = value(
    formData,
    "city",
  );

  const phone = value(
    formData,
    "phone",
  );

  const pvmcNumber = value(
    formData,
    "pvmc_number",
  );

  const organizationName = value(
    formData,
    "organization_name",
  );

  const registrationIntent = value(
    formData,
    "registration_intent",
  );

  const isClinicRegistration =
    registrationIntent === "clinic" &&
    role === "company";

  const registrationPath =
    isClinicRegistration
      ? "/register?role=company&intent=clinic"
      : "/register";

  const registrationNext =
    isClinicRegistration
      ? "/dashboard/clinics"
      : "/dashboard";

  if (!fullName || !email || !role) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Complete all required fields.",
      ),
    );
  }

  if (!isAllowedSelfRegistrationRole(role)) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Choose a valid account type.",
      ),
    );
  }

  if (
    isClinicRegistration &&
    !organizationName
  ) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Enter the clinic or veterinary hospital name.",
      ),
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName,
          role,
          city,
          phone,
          pvmc_number: pvmcNumber,
          organization_name:
            organizationName,
          registration_intent:
            isClinicRegistration
              ? "clinic"
              : "",
        },
      },
    });

  if (error) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        error.message,
      ),
    );
  }

  redirect(
    `/verify-email?mode=register&email=${encodeURIComponent(
      email,
    )}&next=${encodeURIComponent(
      registrationNext,
    )}&message=${encodeURIComponent(
      isClinicRegistration
        ? "Your clinic registration verification code has been sent by email."
        : "Your VetConnect verification code has been sent by email.",
    )}`,
  );
}


export async function resendEmailOtpAction(
  formData: FormData,
) {
  ensureConfigured("/login");

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  const mode =
    value(formData, "mode") === "register"
      ? "register"
      : "login";

  const nextValue = value(
    formData,
    "next",
  );

  const next =
    nextValue.startsWith("/") &&
    !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (!email) {
    redirect(
      withMessage(
        "/login",
        "error",
        "Enter your email address.",
      ),
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser:
          mode === "register",
      },
    });

  if (error) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(
        email,
      )}&next=${encodeURIComponent(
        next,
      )}&error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  redirect(
    `/verify-email?mode=${mode}&email=${encodeURIComponent(
      email,
    )}&next=${encodeURIComponent(
      next,
    )}&message=${encodeURIComponent(
      "A new verification code has been sent.",
    )}`,
  );
}

export async function verifyEmailOtpAction(
  formData: FormData,
) {
  ensureConfigured("/login");

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  const token = value(
    formData,
    "token",
  ).replace(/\s/g, "");

  const mode =
    value(formData, "mode") === "register"
      ? "register"
      : "login";

  const nextValue = value(
    formData,
    "next",
  );

  const next =
    nextValue.startsWith("/") &&
    !nextValue.startsWith("//")
      ? nextValue
      : "/dashboard";

  if (
    !email ||
    !/^\d{6,10}$/.test(token)
  ) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(
        email,
      )}&next=${encodeURIComponent(
        next,
      )}&error=${encodeURIComponent(
        "Enter the complete verification code.",
      )}`,
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

  if (error) {
    redirect(
      `/verify-email?mode=${mode}&email=${encodeURIComponent(
        email,
      )}&next=${encodeURIComponent(
        next,
      )}&error=${encodeURIComponent(
        "The code is invalid or has expired. Request a new code and try again.",
      )}`,
    );
  }

  await blockSuspendedAccount(
    supabase,
    "/login",
  );

  revalidatePath("/", "layout");

  redirect(next);
}

export async function registerAction(
  formData: FormData,
) {
  ensureConfigured("/register");

  const fullName = value(
    formData,
    "full_name",
  );

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  const password = value(
    formData,
    "password",
  );

  const confirmPassword = value(
    formData,
    "confirm_password",
  );

  const role = value(
    formData,
    "role",
  );

  const city = value(
    formData,
    "city",
  );

  const phone = value(
    formData,
    "phone",
  );

  const pvmcNumber = value(
    formData,
    "pvmc_number",
  );

  const organizationName = value(
    formData,
    "organization_name",
  );

  const registrationIntent = value(
    formData,
    "registration_intent",
  );

  const isClinicRegistration =
    registrationIntent === "clinic" &&
    role === "company";

  const registrationPath =
    isClinicRegistration
      ? "/register?role=company&intent=clinic"
      : "/register";

  const registrationNext =
    isClinicRegistration
      ? "/dashboard/clinics"
      : "/dashboard";

  if (
    !fullName ||
    !email ||
    !password ||
    !role
  ) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Complete all required fields.",
      ),
    );
  }

  if (!isAllowedSelfRegistrationRole(role)) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Choose a valid account type.",
      ),
    );
  }

  if (
    isClinicRegistration &&
    !organizationName
  ) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Enter the clinic or veterinary hospital name.",
      ),
    );
  }

  if (password.length < 8) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Password must contain at least 8 characters.",
      ),
    );
  }

  if (password !== confirmPassword) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        "Passwords do not match.",
      ),
    );
  }

  const headerStore =
    await headers();

  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.vetconnect.com.pk";

  const supabase =
    await createClient();

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          `${origin}/auth/confirm?next=${registrationNext}`,
        data: {
          full_name: fullName,
          role,
          city,
          phone,
          pvmc_number: pvmcNumber,
          organization_name:
            organizationName,
          registration_intent:
            isClinicRegistration
              ? "clinic"
              : "",
        },
      },
    });

  if (error) {
    redirect(
      withMessage(
        registrationPath,
        "error",
        error.message,
      ),
    );
  }

  if (!data.session) {
    redirect(
      withMessage(
        `/login?next=${encodeURIComponent(
          registrationNext,
        )}`,
        "message",
        "Account created. Check your email to confirm your address, then sign in.",
      ),
    );
  }

  await blockSuspendedAccount(
    supabase,
    "/login",
  );

  revalidatePath("/", "layout");

  redirect(registrationNext);
}


export async function requestPasswordResetAction(
  formData: FormData,
) {
  ensureConfigured(
    "/forgot-password",
  );

  const email = value(
    formData,
    "email",
  ).toLowerCase();

  if (!email) {
    redirect(
      withMessage(
        "/forgot-password",
        "error",
        "Enter your email address.",
      ),
    );
  }

  const headerStore =
    await headers();

  const origin =
    headerStore.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.vetconnect.com.pk";

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          `${origin}/auth/confirm?next=/update-password`,
      },
    );

  if (error) {
    redirect(
      withMessage(
        "/forgot-password",
        "error",
        error.message,
      ),
    );
  }

  redirect(
    withMessage(
      "/forgot-password",
      "message",
      "If this email is registered, a password reset message has been sent.",
    ),
  );
}

export async function updatePasswordAction(
  formData: FormData,
) {
  ensureConfigured(
    "/update-password",
  );

  const password = value(
    formData,
    "password",
  );

  const confirmPassword = value(
    formData,
    "confirm_password",
  );

  if (password.length < 8) {
    redirect(
      withMessage(
        "/update-password",
        "error",
        "Password must contain at least 8 characters.",
      ),
    );
  }

  if (password !== confirmPassword) {
    redirect(
      withMessage(
        "/update-password",
        "error",
        "Passwords do not match.",
      ),
    );
  }

  const supabase =
    await createClient();

  await blockSuspendedAccount(
    supabase,
    "/login",
  );

  const { error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    redirect(
      withMessage(
        "/update-password",
        "error",
        error.message,
      ),
    );
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  redirect(
    withMessage(
      "/login",
      "message",
      "Password updated. You can now sign in.",
    ),
  );
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase =
      await createClient();

    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");

  redirect("/");
}
