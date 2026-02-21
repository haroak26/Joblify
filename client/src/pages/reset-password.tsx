import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/seo";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number");

const schema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPassword() {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = form.watch("password");
  const passwordChecks = [
    { label: "At least 8 characters", valid: passwordValue.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(passwordValue) },
    { label: "One lowercase letter", valid: /[a-z]/.test(passwordValue) },
    { label: "One number", valid: /\d/.test(passwordValue) },
  ];

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    setIsSubmitting(true);
    setSuccessMessage("");
    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: data.password,
      });
      const payload = await response.json();
      setSuccessMessage(payload.message || "Password updated successfully.");
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      form.setError("root", { message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Invalid reset link</CardTitle>
              <CardDescription className="mt-1">
                Please request a new password reset email.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/forgot-password">Request reset link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Reset Password"
        description="Create a new secure password for your Joblify account to continue your job search workflow."
        keywords="reset password, Joblify security, account recovery"
        canonicalUrl="https://joblify.com/reset-password"
        robots="noindex, nofollow"
      />
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Create a new password</CardTitle>
            <CardDescription className="mt-1">
              Enter a strong password to secure your account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a new password"
                          data-testid="input-reset-password"
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
              <div className="grid gap-2 rounded-lg border border-muted p-3 text-sm text-muted-foreground">
                {passwordChecks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2">
                    {check.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={check.valid ? "text-foreground" : ""}>{check.label}</span>
                  </div>
                ))}
              </div>
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          data-testid="input-reset-confirm-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <div className="text-sm text-destructive text-center">
                  {form.formState.errors.root.message}
                </div>
              )}
              {successMessage && (
                <div className="text-sm text-emerald-600 text-center">{successMessage}</div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-reset-submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Back to{" "}
            <Link href="/login" className="text-primary hover:underline">
              login
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
