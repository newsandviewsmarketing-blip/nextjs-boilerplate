/** Presentation only. Every destination still enforces server and database access. */
export function workspaceCapabilities(roles: readonly string[], hasCompanyMembership = false) {
  return {
    professional: roles.some(role => ['veterinarian', 'professional', 'candidate'].includes(role)),
    clinic: roles.some(role => ['veterinarian', 'professional', 'company'].includes(role)),
    company: roles.includes('company') || hasCompanyMembership,
    laboratory: roles.includes('laboratory'),
  };
}
