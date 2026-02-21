import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, Loader2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/seo";

export default function Verify2FA() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleVerify = async (verificationCode: string) => {
    if (verificationCode.length !== 6) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/auth/verify-2fa", {
        code: verificationCode,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Verification failed");
      }

      const data = await response.json();
      
      // User is now logged in, redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Two-Factor Verification"
        description="Complete two-factor authentication to securely sign in to your Joblify account."
        keywords="2FA verification, two-factor authentication, Joblify login security"
        canonicalUrl="https://joblify.com/verify-2fa"
      />
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
            <CardTitle className="text-2xl mt-2">Two-Factor Authentication</CardTitle>
            <CardDescription className="mt-1">Enter the 6-digit code sent to your email</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center p-4 rounded-lg bg-muted/50 border">
            <Mail className="w-5 h-5 text-muted-foreground mr-2" />
            <p className="text-sm text-muted-foreground">
              Check your email for the verification code
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 6) {
                    handleVerify(value);
                  }
                }}
                disabled={isSubmitting}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please check the code and try again, or request a new one by logging in again.
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={() => handleVerify(code)}
              disabled={isSubmitting || code.length !== 6}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              The code will expire in 5 minutes
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
