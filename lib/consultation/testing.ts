import "server-only";
export function consultationTestingEnabled() {
  return process.env.CONSULTATION_CALLS_TEST_MODE === "true" &&
    (process.env.VERCEL_ENV === "preview" || (!process.env.VERCEL_ENV && process.env.NODE_ENV !== "production"));
}
