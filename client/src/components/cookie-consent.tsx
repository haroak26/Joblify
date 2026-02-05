import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Show banner after a brief delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">
                We use cookies to enhance your experience.{" "}
                <Link href="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>{" "}
                •{" "}
                <Link href="/terms-and-conditions" className="text-primary hover:underline">
                  Terms
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDecline}
                className="flex-1 sm:flex-none h-8 text-xs"
              >
                Decline
              </Button>
              <Button 
                size="sm" 
                onClick={handleAccept}
                className="flex-1 sm:flex-none h-8 text-xs"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
