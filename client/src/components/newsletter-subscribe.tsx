import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For now, just simulate a subscription
    // In production, this would call an API endpoint
    if (email && email.includes("@")) {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 5000);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-lg p-6 my-8">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 rounded-full p-3 flex-shrink-0">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">Stay Updated</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get the latest career tips, resume strategies, and job search insights delivered to your inbox.
          </p>
          
          {status === "success" ? (
            <div className="text-sm font-medium text-green-600 dark:text-green-500">
              ✓ Thanks for subscribing! Check your email to confirm.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" size="sm">
                Subscribe
              </Button>
            </form>
          )}
          
          {status === "error" && (
            <div className="text-sm text-red-600 dark:text-red-500 mt-2">
              Please enter a valid email address.
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-2">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
