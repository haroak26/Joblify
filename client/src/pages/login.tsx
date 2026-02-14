import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "google":
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case "github":
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      );
    case "linkedin":
      return (
        <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case "apple":
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      );
    default:
      return null;
  }
}

export default function Login() {
  const { login, loginWithProvider, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  
  // Parse URL error params
  const urlParams = new URLSearchParams(window.location.search);
  const urlError = urlParams.get("error");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
    } catch (error) {
      form.setError("root", { 
        message: error instanceof Error ? error.message : "Invalid credentials" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderLogin = async (provider: string) => {
    setProviderLoading(provider);
    try {
      await loginWithProvider(provider);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Failed to connect to provider"
      });
    } finally {
      setProviderLoading(null);
    }
  };

  const providerMap: Record<string, string> = {
    google: "GoogleOAuth",
    linkedin: "LinkedInOAuth",
    github: "GitHubOAuth",
    apple: "AppleOAuth",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <Link href="/">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <Link href="/">
            <div className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors">Joblify</div>
          </Link>
          <div>
            <CardTitle className="text-2xl mt-2" data-testid="text-login-title">Welcome back</CardTitle>
            <CardDescription className="mt-1">Sign in to your Joblify account</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* URL-based error messages */}
          {urlError === "email_exists" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 mb-4" data-testid="text-email-exists-error">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Email already registered</p>
                <p className="text-xs text-muted-foreground mt-1">An account with this email already exists. Please sign in with your username and password instead.</p>
              </div>
            </div>
          )}
          {urlError === "auth_failed" && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Authentication failed</p>
                <p className="text-xs text-muted-foreground mt-1">Something went wrong during sign in. Please try again.</p>
              </div>
            </div>
          )}

          {/* Social login buttons */}
          <div className="space-y-2 mb-6">
            {[
              { key: "google", label: "Google" },
              { key: "github", label: "GitHub" },
              { key: "linkedin", label: "LinkedIn" },
              { key: "apple", label: "Apple" },
            ].map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                className="w-full"
                disabled={providerLoading !== null}
                onClick={() => handleProviderLogin(providerMap[key])}
                data-testid={`button-login-${key}`}
              >
                {providerLoading === providerMap[key] ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <span className="mr-2"><ProviderIcon provider={key} /></span>
                )}
                Continue with {label}
              </Button>
            ))}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        data-testid="input-username"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter your password" 
                          data-testid="input-password"
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
              {form.formState.errors.root && (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5" data-testid="text-login-error">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.root.message === "Invalid credentials" 
                        ? "Incorrect username or password" 
                        : form.formState.errors.root.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.formState.errors.root.message === "Invalid credentials"
                        ? "Please check your credentials and try again, or reset your password."
                        : "Please try again or contact support if the issue persists."}
                    </p>
                  </div>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
