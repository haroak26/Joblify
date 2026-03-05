import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Sparkles } from "lucide-react";

interface ResumeCompilingProps {
  resumeId: string;
}

export default function ResumeCompiling({ resumeId }: ResumeCompilingProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // After 3 seconds, navigate to the resume editor
    const timer = setTimeout(() => {
      setLocation(`/dashboard/resume-builder/${resumeId}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [resumeId, setLocation]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <Loader2 className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Compiling Knowledge</h2>
          <p className="text-muted-foreground">
            We're organizing your information and creating your professional resume...
          </p>
        </div>

        <div className="flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
}
