export type DeploymentSurface = "combined" | "user" | "admin";

const configuredSurface = String(import.meta.env.VITE_DEPLOY_SURFACE ?? "")
  .trim()
  .toLowerCase();
const rawSurface = configuredSurface || "combined";

const normalizeSurface = (value: string): DeploymentSurface => {
  if (value === "user") return "user";
  if (value === "admin") return "admin";
  return "combined";
};

export const DEPLOY_SURFACE: DeploymentSurface = normalizeSurface(rawSurface);
export const IS_USER_SURFACE = DEPLOY_SURFACE === "user";
export const IS_ADMIN_SURFACE = DEPLOY_SURFACE === "admin";
export const IS_COMBINED_SURFACE = DEPLOY_SURFACE === "combined";
export const IS_LOCAL_ADMIN_DEMO_ALLOWED =
  import.meta.env.DEV === true &&
  import.meta.env.MODE === "development" &&
  (configuredSurface === "admin" || configuredSurface === "combined");

export const ADMIN_SIGNIN_PATH = "/admin/signin";
export const USER_SIGNIN_PATH = "/signin";
export const EFFECTIVE_ADMIN_SIGNIN_PATH = IS_ADMIN_SURFACE ? ADMIN_SIGNIN_PATH : USER_SIGNIN_PATH;
