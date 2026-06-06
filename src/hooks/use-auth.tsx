import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { readAdminSession, type SeededAdminUser, writeAdminSession } from "@/lib/admin-auth";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { IS_USER_SURFACE } from "@/lib/deployment-surface";
import { supabase } from "@/lib/supabase";

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
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isInitialized: boolean;
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
  const [role, setRole] = useState<UserRole>("guest");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const applySessionVersionRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const supabaseClient = supabase;

    const applySession = async (session: Session | null) => {
      const applyVersion = ++applySessionVersionRef.current;
      if (!mounted) return;

      if (!session?.user) {
        const storedAdmin = LOCAL_ADMIN_ALLOWED ? readAdminSession() : null;
        if (storedAdmin) {
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
          .select("display_name,full_name,email")
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
          contactNumber: (authUser.user_metadata?.contact_number as string | undefined) ?? "",
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

    supabaseClient.auth.getSession().then(({ data }) => {
      void applySession(data.session ?? null);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      mounted = false;
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
        error: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

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
  }: SignUpParams) => {
    if (!supabase) {
      return {
        error: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
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
          municipality: "Prototype Municipality",
        },
      },
    });

    if (error) return { error: error.message };

    // Force manual sign-in after registration even when email confirmation is disabled.
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole("guest");
    setUser(null);

    return {
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const signOut = async () => {
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
      role,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [isAuthenticated, isInitialized, role, user],
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
