import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProfileSetup } from '@/components/profile-setup';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { FreelancerProfile, Skill } from '@shared/schema';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<FreelancerProfile>({
    intro: '',
    skills: [],
    isComplete: false
  });

  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ['/api/profile'],
    enabled: !!user
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<FreelancerProfile>) => {
      const response = await apiRequest('POST', '/api/profile', updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/profile', {
        ...profile,
        isComplete: true
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Profile completed!',
        description: 'Redirecting to email verification...'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setLocation('/verify-email');
    }
  });

  if (!user || profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleIntroChange = (intro: string) => {
    setProfile({ ...profile, intro });
  };

  const handleSkillsChange = (skills: Skill[]) => {
    setProfile({ ...profile, skills });
  };

  const handleNext = async () => {
    if (step === 1 && profile.intro.length < 20) {
      toast({
        title: 'Introduction required',
        description: 'Please write at least 20 characters about yourself.',
        variant: 'destructive'
      });
      return;
    }

    if (step === 2 && profile.skills.length === 0) {
      toast({
        title: 'Skills required',
        description: 'Please add at least one skill.',
        variant: 'destructive'
      });
      return;
    }

    // Save progress
    await updateProfileMutation.mutateAsync(profile);

    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    } else {
      await completeOnboardingMutation.mutateAsync();
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Welcome to Joblify! 👋</CardTitle>
            <CardDescription>
              Let's set up your profile to find the perfect job opportunities
            </CardDescription>
            <Progress value={progress} className="mt-4" />
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tell us about yourself</h3>
              <ProfileSetup
                intro={profile.intro}
                skills={[]}
                onIntroChange={handleIntroChange}
                onSkillsChange={() => {}}
                hideSkills={true}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Add your skills</h3>
              <ProfileSetup
                intro={profile.intro}
                skills={profile.skills}
                onIntroChange={handleIntroChange}
                onSkillsChange={handleSkillsChange}
                hideIntro={true}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Almost done!</h3>
              <p className="text-muted-foreground">
                We'll send a verification email to <strong>{user.email}</strong>. 
                After verifying, you'll get access to your personalized job feed.
              </p>
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Your Profile Summary:</h4>
                <p className="text-sm mb-2">
                  <strong>Introduction:</strong> {profile.intro.length > 100 ? profile.intro.substring(0, 100) + '...' : profile.intro}
                </p>
                <p className="text-sm"><strong>Skills:</strong> {profile.skills.map(s => s.name).join(', ')}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              >
                Back
              </Button>
            )}
            <Button
              className="ml-auto gap-2"
              onClick={handleNext}
              disabled={updateProfileMutation.isPending || completeOnboardingMutation.isPending}
            >
              {step === 3 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete Setup
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
