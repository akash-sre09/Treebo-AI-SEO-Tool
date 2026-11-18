export const TREEBO_DOMAIN = "@treebo.com";

/** The authoritative allowlist rule shared by client messaging and server middleware. */
export function isTreeboEmail(email: unknown): email is string {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(TREEBO_DOMAIN);
}

/** Only same-origin app paths may be used as post-login destinations. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value === "/login" || value.startsWith("/login?") || value === "/auth" || value.startsWith("/auth?")) return "/";
  return value;
}
