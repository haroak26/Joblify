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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-background to-pink-50 dark:from-gray-950 dark:via-background dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {status === "loading" && "Verifying..."}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
              {status === "waiting" && "Verify Your Email"}
            </CardTitle>
            {status === "waiting" && (
              <CardDescription className="mt-2 text-base">
                Check your email to verify your account and unlock all features
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === "loading" && (
            <div className="py-12">
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"></div>
                  <Loader2 className="w-20 h-20 animate-spin text-primary relative z-10" />
                </div>
              </div>
              <p className="text-muted-foreground mt-6 text-lg">Verifying your email...</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="py-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full animate-ping"></div>
                </div>
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto relative z-10" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">{message}</p>
              <p className="text-sm text-muted-foreground mb-8">Redirecting to dashboard...</p>
              <Button asChild className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="py-8">
              <XCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
              <p className="text-lg text-foreground mb-8">{message}</p>
              <div className="space-y-3">
                {user && !user.emailVerified && (
                  <Button 
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
                <Button asChild variant="outline" className="w-full h-12">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </div>
          )}

          {status === "waiting" && (
            <div className="py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse opacity-20"></div>
                <Mail className="w-10 h-10 text-purple-600 dark:text-purple-400 relative z-10" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                {message}
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Click the link in the email to verify your account and access the dashboard.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
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
                  className="w-full h-12"
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
