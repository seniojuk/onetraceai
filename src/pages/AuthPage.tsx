import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AccentWord } from "@/components/marketing/AccentWord";
import { AuthVisualSingle } from "@/components/auth/AuthVisualShowcase";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(mode === "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const { toast } = useToast();
  const { user, signIn, signUp, signInWithOAuth } = useAuth();

  useEffect(() => {
    if (user) {
      const nextParam = searchParams.get("next");
      const from = nextParam || (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location, searchParams]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = "Email is required";
    else if (!emailRegex.test(email)) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (!isLogin) {
      if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
      else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Welcome back", description: "You've been logged in successfully." });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Signup failed", description: error.message, variant: "destructive" });
          }
        } else {
          toast({ title: "Account created", description: "Welcome to OneTrace AI." });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github" | "azure") => {
    const { error } = await signInWithOAuth(provider);
    if (error) {
      toast({ title: "OAuth Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-geist antialiased selection:bg-accent/20">
      {/* Slim top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-[11px] font-medium text-accent-foreground">
              OT
            </span>
            <span className="font-geist text-[15px] font-medium tracking-[-0.01em] text-foreground">
              OneTrace <span className="text-muted-foreground">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: form */}
        <div className="flex items-center py-12 lg:pr-12">
          <div className="w-full max-w-md">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
              {isLogin ? "Sign in" : "Create account"}
            </span>
            <h1 className="mt-4 font-geist text-[40px] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[48px]">
              {isLogin ? (
                <>
                  Welcome <AccentWord>back.</AccentWord>
                </>
              ) : (
                <>
                  Start with <AccentWord>proof.</AccentWord>
                </>
              )}
            </h1>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
              {isLogin
                ? "Sign in to continue to your traceable workspace."
                : "Build software with end-to-end traceability — from requirement to commit."}
            </p>

            {/* OAuth */}
            <button
              onClick={() => handleOAuthLogin("google")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/15 hover:bg-muted/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                or with email
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[12.5px] font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[12.5px] font-medium">
                    Password
                  </Label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-[11.5px] text-accent hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> {errors.password}
                  </p>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[12.5px] font-medium">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? "border-destructive" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-3d btn-3d-primary mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 px-5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isLogin ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign in" : "Create account"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-[12.5px] text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-foreground hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>

            {!isLogin && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-accent hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* Right: editorial proof rail */}
        <aside className="hidden items-center border-l border-border lg:flex">
          <AuthVisualSingle
            variant="sync"
            headline="Your Jira tickets and GitHub commits can now tell the same story."
          />
        </aside>
      </main>
    </div>
  );
};

export default AuthPage;
