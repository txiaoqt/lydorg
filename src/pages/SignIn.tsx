import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { IS_ADMIN_SURFACE, IS_USER_SURFACE } from "@/lib/deployment-surface";
import { supabase } from "@/lib/supabase";

type SignInProps = {
  forcedMode?: "user" | "admin";
};

const SignIn = ({ forcedMode }: SignInProps) => {
  const inferredMode = useMemo<"user" | "admin">(() => {
    if (forcedMode) return forcedMode;
    if (IS_ADMIN_SURFACE) return "admin";
    return "user";
  }, [forcedMode]);

  const [mode, setMode] = useState<"user" | "admin">(inferredMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isInitialized, role } = useAuth();
  const useSupabaseAuth = Boolean(supabase);
  const roleSelectionEnabled = !forcedMode && !IS_ADMIN_SURFACE && !IS_USER_SURFACE;

  useEffect(() => {
    setMode(inferredMode);
  }, [inferredMode]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    navigate("/organization-profile", { replace: true });
  }, [isAuthenticated, isInitialized, navigate, role]);

  const isAdminMode = mode === "admin";
  const canSubmit = isAdminMode
    ? Boolean(username.trim() && password)
    : Boolean(useSupabaseAuth && isInitialized && email.trim() && password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = isAdminMode
      ? await signIn({ mode: "admin", username, password })
      : await signIn({ mode: "user", email, password });

    if (result.error) {
      toast({ title: "Sign In Failed", description: result.error });
      return;
    }

    const signInToast = toast({
      title: "Signed In",
      description: isAdminMode ? "Welcome, administrator." : "Welcome back.",
    });
    window.setTimeout(() => {
      signInToast.dismiss();
    }, 1000);
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    navigate(isAdminMode ? "/admin" : "/organization-profile", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] left-[-140px] h-[360px] w-[360px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 text-left">
          <Link to="/" className="inline-flex items-center gap-3 max-w-full">
            <BrandLogo
              imgClassName="h-10 w-10"
              showText
              subtitle={isAdminMode ? "Admin Portal" : "Youth Portal"}
            />
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-7 space-y-5 card-shadow"
        >
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdminMode ? "Sign in with your admin credentials." : "Sign in with your youth account."}
            </p>
          </div>

          {roleSelectionEnabled && (
            <div className="space-y-2">
              <Label className="text-foreground">Access Role</Label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setMode("user")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    !isAdminMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => setMode("admin")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isAdminMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {!useSupabaseAuth && !isAdminMode && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file.
            </div>
          )}

          {isAdminMode ? (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Admin Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-input pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            disabled={!canSubmit}
          >
            {isAdminMode ? "Sign In as Admin" : "Sign In as User"}
          </Button>
        </form>

        {!isAdminMode && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:text-primary/90">
              Create one
            </Link>
          </p>
        )}
        {!isAdminMode && (
          <p className="text-center mt-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&lt;- Back to home</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default SignIn;
