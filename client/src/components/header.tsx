import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user } = useAuth();
  const primaryCtaLabel = user ? "My Account" : "Get Started";

  return (
    <nav className="fixed top-0 w-full z-50 border-b bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Joblify</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/why-us">
            <Button variant="ghost" size="sm">Why Us</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="sm">Pricing</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm">{primaryCtaLabel}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
