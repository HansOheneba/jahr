/**
 * Preview mode - skip real auth and inject a dummy CEO profile.
 * Off by default now that real auth + real employees are wired up.
 * Set NEXT_PUBLIC_AUTH_BYPASS=true to temporarily re-enable it locally.
 */
export const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
