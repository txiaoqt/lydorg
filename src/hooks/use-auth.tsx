import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { readAdminSession, type SeededAdminUser, writeAdminSession } from "@/lib/admin-auth";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { IS_USER_SURFACE } from "@/lib/deployment-surface";
import { supabase, supabaseAuthStorageKey } from "@/lib/supabase";
import { normalizeUrn } from "@/lib/urn-registration";
import { clearSupabaseAuthStorage, isInvalidRefreshTokenError } from "@/lib/auth-session-recovery";
import { parsePasswordRecoveryUrl } from "@/lib/password-recovery";

const RECOVERY_SESSION_STORAGE_KEY = "ytrace-recovery-session";

export type UserRole = "guest" | "youth" | "sk" | "staff" | "admin";
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  profileHints?: {
    contactNumber?: string;
    district?: string;
    barangay?: string;
    isExistingOrganization?: boolean;
    organizationIdentifierNumber?: string;
  };
};

type SignInParams =
  | {
      mode: "user";
      email: string;
      password: string;
    }
  | {
      mode: "admin";
      username: string;
      password: string;
    };

type SignUpParams = {
  email: string;
  password: string;
  organizationName?: string;
  contactNumber?: string;
  district?: string;
  barangayId?: string;
  barangayName?: string;
  isExistingOrganization?: boolean;
  organizationIdentifierNumber?: string;
  pwaFlow?: boolean;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isPasswordRecoverySession: boolean;
  role: UserRole;
  user: AuthUser | null;
  signIn: (params: SignInParams) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_ADMIN_ALLOWED = !IS_USER_SURFACE;
const DEMO_ADMIN_USERNAME = String(import.meta.env.VITE_DEMO_ADMIN_USERNAME ?? "lydoadmin").trim();
const DEMO_ADMIN_PASSWORDS = new Set(
  [
    import.meta.env.VITE_DEMO_ADMIN_PASSWORD,
    "lydoadminpassword",
    "lydoadminnpassword",
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => String(value).trim()),
);
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;


const toAuthUser = (adminUser: SeededAdminUser): AuthUser => ({
  id: adminUser.id,
  email: adminUser.email,
  displayName: adminUser.displayName,
});

const createDemoAdminSession = (username: string): SeededAdminUser => {
  const now = Date.now();
  const sessionToken =
    globalThis.crypto?.randomUUID?.() ?? `demo-admin-${now.toString(36)}-${Math.random().toString(36).slice(2)}`;

  return {
    id: "admin-demo",
    username,
    email: `${username}@lydoconnect.local`,
    displayName: "Admin User",
    sessionToken,
    expiresAt: new Date(now + ADMIN_SESSION_TTL_MS).toISOString(),
  };
};

const isRecoverableSupabaseAuthError = (message: string) =>
  /invalid api key|jwt|network|fetch failed|failed to fetch|auth/i.test(message);

const priorityRole = (codes: string[]): UserRole => {
  if (codes.includes("admin")) return "admin";
  if (codes.includes("staff")) return "staff";
  if (codes.includes("sk")) return "sk";
  if (codes.includes("youth")) return "youth";
  return "youth";
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordRecoverySession, setIsPasswordRecoverySession] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const hasUrlCredentials = parsePasswordRecoveryUrl(window.location.href).hasRecoveryCredentials;
    const hasStoredFlag = window.sessionStorage.getItem(RECOVERY_SESSION_STORAGE_KEY) === "1";
    const isRecovery = hasUrlCredentials || hasStoredFlag;
    if (isRecovery) {
      window.sessionStorage.setItem(RECOVERY_SESSION_STORAGE_KEY, "1");
    }
    return isRecovery;
  });
  const [role, setRole] = useState<UserRole>("guest");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const applySessionVersionRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const supabaseClient = supabase;

    const applySession = async (session: Session | null, eventName?: string) => {
      const applyVersion = ++applySessionVersionRef.current;
      if (!mounted) return;

      const hasUrlCredentials =
        typeof window !== "undefined" ? parsePasswordRecoveryUrl(window.location.href).hasRecoveryCredentials : false;
      const isRecoveryEvent = eventName === "PASSWORD_RECOVERY";
      const isStoredRecovery =
        typeof window !== "undefined" && window.sessionStorage.getItem(RECOVERY_SESSION_STORAGE_KEY) === "1";
      const isRecovery = Boolean(isRecoveryEvent || hasUrlCredentials || isStoredRecovery);

      if (typeof window !== "undefined") {
        console.debug("[AuthDebug] applySession:", {
          eventName: eventName ?? "NONE",
          pathname: window.location.pathname,
          url: window.location.href,
          hasSessionUser: Boolean(session?.user),
          hasUrlCredentials,
          isRecoveryEvent,
          isStoredRecovery,
          isRecovery,
          sessionStorageFlag: window.sessionStorage.getItem(RECOVERY_SESSION_STORAGE_KEY),
        });
      }

      if (isRecovery) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(RECOVERY_SESSION_STORAGE_KEY, "1");
        }
        setIsPasswordRecoverySession(true);
      } else {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(RECOVERY_SESSION_STORAGE_KEY);
        }
        setIsPasswordRecoverySession(false);
      }

      if (!session?.user) {
        const storedAdmin = LOCAL_ADMIN_ALLOWED ? readAdminSession() : null;
        if (storedAdmin && !isRecovery) {
          if (supabaseClient) {
            const { data, error } = await supabaseClient.rpc("validate_admin_session_token", {
              _session_token: storedAdmin.sessionToken,
            });
            const validatedAdmin = Array.isArray(data) ? data[0] : null;
            const canTrustLocalAdminSession = Boolean(error && isRecoverableSupabaseAuthError(error.message));
            if ((!validatedAdmin && !canTrustLocalAdminSession) || (error && !canTrustLocalAdminSession)) {
              writeAdminSession(null);
              setIsAuthenticated(false);
              setRole("guest");
              setUser(null);
              setIsInitialized(true);
              return;
            }
          }
          setIsAuthenticated(true);
          setRole("admin");
          setUser(toAuthUser(storedAdmin));
          setIsInitialized(true);
          return;
        }

        setIsAuthenticated(false);
        setRole("guest");
        setUser(null);
        setIsInitialized(true);
        return;
      }

      const authUser = session.user;
      const defaultDisplayName =
        (authUser.user_metadata?.organization_name as string | undefined) ??
        (authUser.user_metadata?.display_name as string | undefined) ??
        (authUser.user_metadata?.full_name as string | undefined) ??
        authUser.email?.split("@")[0] ??
        "User";

      const [profileResp, rolesResp] = await Promise.all([
        supabaseClient!
          .from("user_profiles")
          .select("display_name,full_name,email,contact_number")
          .eq("user_id", authUser.id)
          .maybeSingle(),
        supabaseClient!.from("user_roles").select("roles(code)").eq("user_id", authUser.id),
      ]);

      // Ignore stale async results if a newer auth event was already applied
      // (e.g., signUp emits SIGNED_IN then we immediately force SIGNED_OUT).
      if (!mounted || applyVersion !== applySessionVersionRef.current) return;

      const roleCodes =
        rolesResp.data
          ?.map((entry) => {
            const related = (entry as { roles?: { code?: string } | Array<{ code?: string }> }).roles;
            if (Array.isArray(related)) return related[0]?.code;
            return related?.code;
          })
          .filter((code): code is string => Boolean(code)) ?? [];

      const resolvedRole = priorityRole(roleCodes);
      const resolvedUser: AuthUser = {
        id: authUser.id,
        email: (profileResp.data?.email as string | undefined) ?? authUser.email ?? "",
        displayName:
          (profileResp.data?.display_name as string | undefined) ??
          (profileResp.data?.full_name as string | undefined) ??
          defaultDisplayName,
        profileHints: {
          contactNumber:
            (profileResp.data?.contact_number as string | undefined) ??
            (authUser.user_metadata?.contact_number as string | undefined) ??
            "",
          district: (authUser.user_metadata?.district as string | undefined) ?? "",
          barangay: (authUser.user_metadata?.barangay_name as string | undefined) ?? "",
          isExistingOrganization: Boolean(authUser.user_metadata?.is_existing_organization),
          organizationIdentifierNumber: (authUser.user_metadata?.organization_identifier_number as string | undefined) ?? "",
        },
      };

      setIsAuthenticated(true);
      setRole(resolvedRole);
      setUser(resolvedUser);
      setIsInitialized(true);
    };

    const storedAdmin = LOCAL_ADMIN_ALLOWED ? readAdminSession() : null;
    if (storedAdmin) {
      setIsAuthenticated(true);
      setRole("admin");
      setUser(toAuthUser(storedAdmin));
      setIsInitialized(true);
    }

    if (!supabaseClient) {
      if (!storedAdmin) {
        setIsInitialized(true);
      }
      return;
    }

    const recoverInvalidRefreshSession = async (error: unknown) => {
      if (!isInvalidRefreshTokenError(error)) return false;
      clearSupabaseAuthStorage(supabaseAuthStorageKey);
      try {
        await supabaseClient.auth.signOut({ scope: "local" });
      } catch {
        // Storage was already cleared directly; local sign-out is best effort.
      }
      if (mounted) await applySession(null);
      return true;
    };

    void supabaseClient.auth.getSession()
      .then(async ({ data, error }) => {
        if (error && await recoverInvalidRefreshSession(error)) return;
        if (mounted) await applySession(data.session ?? null);
      })
      .catch(async (error: unknown) => {
        if (await recoverInvalidRefreshSession(error)) return;
        if (mounted) await applySession(null);
      });

    const handleUnhandledAuthRejection = (event: PromiseRejectionEvent) => {
      if (!isInvalidRefreshTokenError(event.reason)) return;
      event.preventDefault();
      void recoverInvalidRefreshSession(event.reason);
    };
    window.addEventListener("unhandledrejection", handleUnhandledAuthRejection);

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      void applySession(session, event);
    });

    return () => {
      mounted = false;
      window.removeEventListener("unhandledrejection", handleUnhandledAuthRejection);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (params: SignInParams) => {
    if (params.mode === "admin") {
      if (!LOCAL_ADMIN_ALLOWED) {
        return { error: "Admin login is disabled on this deployment." };
      }

      const username = params.username.trim();
      const password = params.password;
      const canUseLocalDemoCredentials = username.toLowerCase() === DEMO_ADMIN_USERNAME.toLowerCase() && DEMO_ADMIN_PASSWORDS.has(password.trim());
      const signInWithLocalDemoAccount = async () => {
        if (!canUseLocalDemoCredentials) return null;

        const adminUser = createDemoAdminSession(username);
        writeAdminSession(adminUser);
        setIsAuthenticated(true);
        setRole("admin");
        setUser(toAuthUser(adminUser));
        setIsInitialized(true);
        return {};
      };

      if (!supabase) {
        const demoResult = await signInWithLocalDemoAccount();
        if (demoResult) return demoResult;
        return { error: "Supabase is not configured. Use the seeded demo admin credentials or set the Supabase env vars." };
      }

      const { data, error } = await supabase.rpc("authenticate_admin_account", {
        _username: username,
        _password: password,
      });

      if (error) {
        const demoResult = isRecoverableSupabaseAuthError(error.message) ? await signInWithLocalDemoAccount() : null;
        if (demoResult) return demoResult;
        return { error: error.message };
      }

      const adminAccount = Array.isArray(data) ? data[0] : null;
      if (!adminAccount) {
        const demoResult = await signInWithLocalDemoAccount();
        if (demoResult) return demoResult;
        return { error: "Invalid admin credentials." };
      }

      const adminUser: SeededAdminUser = {
        id: String(adminAccount.admin_id),
        username: String(adminAccount.username ?? params.username.trim()),
        email: String(adminAccount.email ?? ""),
        displayName: String(adminAccount.display_name ?? "Admin User"),
        sessionToken: String(adminAccount.session_token ?? ""),
        expiresAt: String(adminAccount.expires_at ?? ""),
      };

      await supabase.auth.signOut();
      writeAdminSession(adminUser);
      setIsAuthenticated(true);
      setRole("admin");
      setUser(toAuthUser(adminUser));
      return {};
    }

    writeAdminSession(null);

    if (!supabase) {
      return {
        error: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
      };
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RECOVERY_SESSION_STORAGE_KEY);
    }
    setIsPasswordRecoverySession(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: params.email.trim(),
      password: params.password,
    });
    if (error) return { error: error.message };
    return {};
  };

  const signUp = async ({
    email,
    password,
    organizationName,
    contactNumber,
    district,
    barangayId,
    barangayName,
    isExistingOrganization,
    organizationIdentifierNumber,
    pwaFlow,
  }: SignUpParams) => {
    if (!supabase) {
      return {
        error: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: getAuthCallbackUrl({ pwaFlow }),
        data: {
          full_name: organizationName ?? "",
          display_name: organizationName ?? "",
          organization_name: organizationName ?? "",
          contact_number: contactNumber ?? "",
          district: district ?? "",
          barangay_id: barangayId ?? "",
          barangay_name: barangayName ?? "",
          is_existing_organization: Boolean(isExistingOrganization),
          organization_identifier_number: organizationIdentifierNumber ?? "",
          registration_type: isExistingOrganization ? "existing_urn" : "new_organization",
          urn: isExistingOrganization ? normalizeUrn(organizationIdentifierNumber ?? "") : "",
          urn_review_status: isExistingOrganization ? "pending" : "not_applicable",
          municipality: "Prototype Municipality",
        },
      },
    });

    if (error) return { error: error.message };

    return {
      needsEmailConfirmation: true,
    };
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(RECOVERY_SESSION_STORAGE_KEY);
    }
    setIsPasswordRecoverySession(false);
    const storedAdmin = readAdminSession();
    if (supabase && storedAdmin?.sessionToken) {
      await supabase.rpc("revoke_admin_session_token", {
        _session_token: storedAdmin.sessionToken,
      });
    }
    writeAdminSession(null);
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole("guest");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      isInitialized,
      isPasswordRecoverySession,
      role,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [isAuthenticated, isInitialized, isPasswordRecoverySession, role, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
