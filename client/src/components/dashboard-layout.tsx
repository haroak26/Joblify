import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { SearchLoadingOverlay } from "@/components/search-loading-overlay";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseApiError } from "@/lib/utils";
import type { FreelancerProfile } from "@shared/schema";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const profileQuery = useQuery<FreelancerProfile>({
    queryKey: ["/api/profile"],
  });

  const refreshJobsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/jobs/refresh');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Jobs updated!',
        description: `Found ${data.count} new opportunities`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: any) => {
      const errorMessage = parseApiError(error);
      toast({
        title: 'Scraping failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  const profile = profileQuery.data ?? { intro: "", skills: [], isComplete: false };
  const hasSkills = profile.skills.length > 0;
  
  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      {/* Search Loading Overlay */}
      <SearchLoadingOverlay isSearching={refreshJobsMutation.isPending} />
      
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-20">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              {hasSkills && (
                <Button
                  onClick={() => refreshJobsMutation.mutate()}
                  disabled={refreshJobsMutation.isPending}
                  size="sm"
                  className="gap-2"
                  data-testid="button-header-search-jobs"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {refreshJobsMutation.isPending ? 'Searching...' : 'Search Jobs'}
                  </span>
                </Button>
              )}
              <ThemeToggle />
            </div>
          </header>
          {user && !user.emailVerified && (
            <div className="px-4 pt-4">
              <EmailVerificationBanner email={user.email} />
            </div>
          )}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
