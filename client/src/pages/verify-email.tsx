import { useEffect, useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Briefcase, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function VerifyEmail() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(search).get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          setTimeout(() => {
            setLocation("/dashboard");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, [token, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl" data-testid="text-verify-title">
              {status === "loading" && "Verifying..."}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
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
              <Button asChild className="w-full" data-testid="button-go-dashboard">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
          
          {status === "error" && (
            <div className="py-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full" data-testid="button-go-login">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
