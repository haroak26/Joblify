import { Link, useLocation } from "wouter";
import { Home, User, Briefcase, Moon, Sun, FileText, Search, FileEdit, Shield, Sparkles, Mic } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { normalizePlan } from "@shared/schema";
import { useTheme } from "@/components/theme-provider";

interface SubscriptionResponse {
  subscription: { plan: string };
  limits: { hasScheduleAccess: boolean };
}

const coreMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Resumes",
    url: "/dashboard/resumes",
    icon: FileText,
  },
  {
    title: "AI Resume Builder",
    url: "/dashboard/resumes?create=ai",
    icon: Sparkles,
  },
];

const toolsMenuItems = [
  {
    title: "Tailor Resume",
    url: "/dashboard/job-tailor",
    icon: Sparkles,
  },
  {
    title: "Resume Review",
    url: "/dashboard/resume-review",
    icon: FileText,
  },
  {
    title: "ATS Scanner",
    url: "/dashboard/ats-scanner",
    icon: Search,
  },
  {
    title: "Cover Letter",
    url: "/dashboard/cover-letter",
    icon: FileEdit,
  },
  {
    title: "AI Interview",
    url: "/dashboard/ai-interview",
    icon: Mic,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });
  
  // Check if user is admin
  const { data: userDetailsData } = useQuery<{ user?: { isAdmin?: boolean } }>({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
  });
  
  const isAdmin = userDetailsData?.user?.isAdmin || false;
  
  const planValue = normalizePlan(subscriptionQuery.data?.subscription?.plan);
  const planLabel = planValue === "ultra"
    ? "Ultra"
    : planValue === "plus"
    ? "Plus"
    : planValue === "student"
    ? "Student"
    : "Free";

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location === "/dashboard";
    }
    return location === url || location.startsWith(url + "/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getDisplayName = (name: string) => {
    if (!name) return "User";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0]; // Just first name if single name
    }
    // Return "FirstName LastInitial."
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
  };

  const logoHref = user ? "/dashboard" : "/";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <Link href={logoHref}>
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground" data-testid="text-sidebar-logo">
              Joblify
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground px-3">Core</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {!isAdmin && coreMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={`h-9 px-3 rounded-md transition-colors ${
                    isActive(item.url)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {!isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-3">AI Tools</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {toolsMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={`h-9 px-3 rounded-md transition-colors ${
                        isActive(item.url)
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                  </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
        
        {/* Admin Section */}
        {isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-3">Admin</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive("/dashboard/admin")}
                    className={`h-9 px-3 rounded-md transition-colors ${
                      isActive("/dashboard/admin") 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Link href="/dashboard/admin">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Admin Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto">
        {!isLoading && user && (
          <div className="space-y-1">
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive("/dashboard/account")}
                  className={`h-9 px-3 rounded-md transition-colors ${
                    isActive("/dashboard/account") 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href="/dashboard/account" data-testid="link-nav-account">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Account</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={toggleTheme}
                  className="h-9 px-3 rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                >
                  {theme === "light" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                  <span className="text-sm">Theme</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="flex items-center gap-3 px-3 py-2 mt-2 border-t border-sidebar-border">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {getInitials(user.name || user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate text-sidebar-foreground" data-testid="text-username">{getDisplayName(user.name || user.username)}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{planLabel} Plan</span>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
