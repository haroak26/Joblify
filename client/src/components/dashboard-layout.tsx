import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const dashboardTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/account": "Account Settings",
  "/dashboard/resumes": "My Resumes",
  "/dashboard/resumes/create": "Create Resume",
  "/dashboard/job-match": "Job Match",
  "/dashboard/resume-review": "Resume Review",
  "/dashboard/ats-scanner": "ATS Scanner",
  "/dashboard/cover-letter": "Cover Letter Builder",
  "/dashboard/admin": "Admin Dashboard",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const routeTitle = dashboardTitles[location] ?? (location.startsWith("/dashboard/resume-builder/") ? "Resume Builder" : "Dashboard");
    document.title = `${routeTitle} | Joblify`;

    const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robotsMeta) {
      robotsMeta.setAttribute("content", "noindex, nofollow");
    }
  }, [location]);

  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          {!isLoading && user && !user.emailVerified && (
            <div className="px-4 pt-4">
              <EmailVerificationBanner email={user.email} />
            </div>
          )}
          <main className="flex-1 overflow-x-hidden overflow-y-auto pt-3 md:pt-6">
            <div className="px-4 md:hidden"><SidebarTrigger className="mb-3" /></div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
