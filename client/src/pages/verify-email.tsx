import { useEffect, useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Briefcase, Loader2, CheckCircle, XCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user, logout, resendVerification } = useAuth();
  const { toast } = useToast();
  const token = new URLSearchParams(search).get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "waiting">("loading");
  const [message, setMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // If we have a token, verify it
    if (token) {
      verifyEmail();
    } else if (user && !user.emailVerified) {
      // User is logged in but not verified - show waiting state
      setStatus("waiting");
      setMessage(`We've sent a verification email to ${user.email}`);
    } else if (user && user.emailVerified) {
      // Already verified, redirect to dashboard
      setLocation("/dashboard");
    } else {
      // Not logged in and no token
      setStatus("error");
      setMessage("Please log in to verify your email");
    }
  }, [token, user, setLocation]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyEmail = async () => {
    try {
      setStatus("loading");
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      await resendVerification();
      toast({
        title: "Email sent",
        description: "Check your inbox for the verification link",
      });
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {status === "loading" && "Verifying..."}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
              {status === "waiting" && "Verify Your Email"}
            </CardTitle>
            {status === "waiting" && (
              <CardDescription className="mt-2">
                Check your email to verify your account and access the dashboard
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Verifying your email...</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="py-4">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">{message}</p>
              <p className="text-sm text-muted-foreground mb-6">Redirecting to dashboard...</p>
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="py-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                {user && !user.emailVerified && (
                  <Button 
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full"
                    variant="default"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </div>
          )}

          {status === "waiting" && (
            <div className="py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-2">
                {message}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in the email to verify your account and access the dashboard.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full"
                  variant="default"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full"
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
