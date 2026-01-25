import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmailVerificationBannerProps {
  email: string;
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [sent, setSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification");
      return response.json();
    },
    onSuccess: () => {
      setSent(true);
    },
  });

  if (sent) {
    return (
      <Alert className="bg-primary/10 border-primary/20" data-testid="alert-verification-sent">
        <CheckCircle className="h-4 w-4 text-primary" />
        <AlertTitle data-testid="text-verification-sent-title">Verification Email Sent</AlertTitle>
        <AlertDescription data-testid="text-verification-sent-description">
          We've sent a new verification link to <strong>{email}</strong>. 
          Please check your inbox and spam folder.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-amber-500/10 border-amber-500/20" data-testid="alert-verify-email">
      <Mail className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-700 dark:text-amber-400" data-testid="text-verify-email-title">Verify Your Email</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-amber-700/80 dark:text-amber-400/80" data-testid="text-verify-email-description">
          Please verify your email address to unlock all features. Check <strong>{email}</strong> for a verification link.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending}
          className="shrink-0"
          data-testid="button-resend-verification"
        >
          {resendMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
          ) : (
            "Resend Email"
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
