import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user's email is already verified
  useEffect(() => {
    if (user?.emailVerified) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      // Mark onboarding as complete and redirect to email verification
      const response = await apiRequest('POST', '/api/profile', {
        isComplete: true
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Welcome to Joblify!',
        description: 'Redirecting to email verification...'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setLocation('/verify-email');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleGetStarted = async () => {
    await completeOnboardingMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">Welcome to Joblify! 👋</CardTitle>
            <CardDescription className="text-base">
              Your AI-powered resume builder is ready to help you land your dream job
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Build Professional Resumes</h4>
                <p className="text-sm text-muted-foreground">
                  Create ATS-optimized resumes with our AI chat builder
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">ATS Scanner</h4>
                <p className="text-sm text-muted-foreground">
                  Optimize your resume for applicant tracking systems
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Cover Letter Generator</h4>
                <p className="text-sm text-muted-foreground">
                  Generate tailored cover letters for any job posting
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              We'll send a verification email to <strong>{user.email}</strong>
            </p>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleGetStarted}
              disabled={completeOnboardingMutation.isPending}
            >
              {completeOnboardingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
