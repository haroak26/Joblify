import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Loader2, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SetupProfile() {
  const { user, setupProfile, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      username: "",
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (!isLoading && user && user.profileSetupComplete) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user?.name) {
      form.setValue("name", user.name);
    }
  }, [user, form]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      await setupProfile(data.name, data.username);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Setup failed";
      if (message.toLowerCase().includes("username")) {
        form.setError("username", { message });
      } else {
        form.setError("root", { message });
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <CardTitle className="text-2xl mt-2">Complete your profile</CardTitle>
            <CardDescription className="mt-1">
              Just a couple more details to get you started
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter your name"
                          className="pl-10"
                          data-testid="input-setup-name"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Choose a unique username"
                          className="pl-10"
                          data-testid="input-setup-username"
                          {...field}
                        />
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
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-setup-profile"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Started
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
