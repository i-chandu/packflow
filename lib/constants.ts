export const APP_NAME = "PackFlow";

/** Path segments that cannot be used as organization slugs */
export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "signup",
  "organizations",
  "invite",
  "i",
  "search",
  "settings",
  "_next",
  "favicon.ico",
]);

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
] as const;
