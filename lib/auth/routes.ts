/**
 * Sign-out endpoint. Server Components cannot clear cookies, so any
 * "session exists but is unusable" path must go through this route instead of
 * redirecting straight to /login, which the proxy would bounce back.
 */
export const SIGN_OUT_PATH = "/api/auth/signout";
