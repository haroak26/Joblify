import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Loader2, ArrowRight, ArrowLeft, Mail, Lock, User, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { ProfileSetup } from "@/components/profile-setup";
import type { Skill } from "@shared/schema";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number");

// Step 1: Name and Email
const step1Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

// Step 2: Password
const step2Schema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 3: Introduction
const step3Schema = z.object({
  intro: z.string().min(20, "Please write at least 20 characters about yourself"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

type RegistrationData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  intro: string;
  skills: Skill[];
};

export default function Register() {
  const { register, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    intro: "",
    skills: [],
  });

  // Step 1 form
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name,
      email: formData.email,
    },
  });

  // Step 2 form
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    },
  });

  // Step 3 form
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      intro: formData.intro,
    },
  });

  const passwordValue = step2Form.watch("password");
  const showPasswordChecker = passwordValue && passwordValue.length > 0;

  if (!isLoading && user) {
    setLocation("/dashboard");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStep1Next = async (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const handleStep2Next = async (data: Step2Data) => {
    setFormData({ ...formData, ...data });
    setStep(3);
  };

  const handleStep3Next = async (data: Step3Data) => {
    setFormData({ ...formData, ...data });
    setStep(4);
  };

  const handleStep4Submit = async () => {
    if (formData.skills.length === 0) {
      step3Form.setError("root", { message: "Please add at least one skill" });
      return;
    }

    setIsSubmitting(true);
    try {
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.intro,
        formData.skills
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message.toLowerCase().includes("email")) {
        setStep(1);
        step1Form.setError("email", { message });
      } else {
        step3Form.setError("root", { message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillsChange = (skills: Skill[]) => {
    setFormData({ ...formData, skills });
  };

  const progress = (step / 4) * 100;

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
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
              {step === 1 && "Create your account"}
              {step === 2 && "Choose a password"}
              {step === 3 && "Tell us about yourself"}
              {step === 4 && "Add your skills"}
            </CardTitle>
            <CardDescription className="mt-1">
              {step === 1 && "Let's get started with the basics"}
              {step === 2 && "Keep your account secure"}
              {step === 3 && "Help us understand your expertise"}
              {step === 4 && "What are you good at?"}
            </CardDescription>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">Step {step} of 4</p>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Form {...step1Form}>
                  <form onSubmit={step1Form.handleSubmit(handleStep1Next)} className="space-y-4">
                    <FormField
                      control={step1Form.control}
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
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={step1Form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                type="email"
                                placeholder="Enter your email" 
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Form {...step2Form}>
                  <form onSubmit={step2Form.handleSubmit(handleStep2Next)} className="space-y-4">
                    <FormField
                      control={step2Form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {showPasswordChecker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.2 }}
                      >
                        <PasswordStrengthIndicator password={passwordValue} />
                      </motion.div>
                    )}

                    {showPasswordChecker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <FormField
                          control={step2Form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input 
                                    type="password" 
                                    placeholder="Confirm your password" 
                                    className="pl-10"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button type="submit" className="flex-1">
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <Form {...step3Form}>
                  <form onSubmit={step3Form.handleSubmit(handleStep3Next)} className="space-y-4">
                    <FormField
                      control={step3Form.control}
                      name="intro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tell us about yourself</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea 
                                placeholder="I'm a web developer with 5 years of experience in React and Node.js. I specialize in building scalable web applications..."
                                className="min-h-[120px] resize-none"
                                {...field} 
                              />
                              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                                {field.value.length} / 20 min
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Write at least 20 characters about your background and experience
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button type="submit" className="flex-1">
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Select your skills</h3>
                    <ProfileSetup
                      intro={formData.intro}
                      skills={formData.skills}
                      onIntroChange={() => {}}
                      onSkillsChange={handleSkillsChange}
                      hideIntro={true}
                    />
                  </div>

                  {formData.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add at least one skill to continue
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleStep4Submit} 
                      disabled={isSubmitting || formData.skills.length === 0}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
