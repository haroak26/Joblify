import { Link, useLocation } from "wouter";
import { Home, Briefcase, Wand2, Calendar, LogOut, Sparkles } from "lucide-react";
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

interface SubscriptionResponse {
  subscription: { plan: string };
  limits: { hasScheduleAccess: boolean };
}

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: Briefcase,
  },
  {
    title: "Generator",
    url: "/dashboard/generator",
    icon: Wand2,
  },
  {
    title: "Schedules",
    url: "/dashboard/schedules",
    icon: Calendar,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();
  
  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription"],
  });
  
  const planLabel = subscriptionQuery.data?.subscription?.plan === "plus" ? "Plus" : "Free";

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return location === "/dashboard";
    }
    return location === url || location.startsWith(url + "/");
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const logoHref = user ? "/dashboard" : "/";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-5">
        <Link href={logoHref}>
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="w-9 h-9 bg-sidebar-accent rounded-xl flex items-center justify-center border border-sidebar-border transition-transform group-hover:-rotate-3">
              <Sparkles className="w-5 h-5 text-sidebar-accent-foreground" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-sidebar-foreground" data-testid="text-sidebar-logo">
                Joblify
              </span>
              <p className="text-xs text-sidebar-foreground/60">Freelance command center</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.url)}
                  className={`h-10 px-3 rounded-md transition-all duration-200 ${
                    isActive(item.url) 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                    <item.icon className={`w-4 h-4 ${isActive(item.url) ? 'text-sidebar-accent-foreground' : ''}`} />
                    <span className="text-[14px]">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-3">
        {!isLoading && user && (
          <div className="space-y-3">
            <SidebarSeparator className="bg-sidebar-border/60" />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => logout()}
                  className="h-10 px-3 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-all duration-200"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[14px]">Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <Link href="/dashboard/account">
              <div className="flex items-center gap-3 px-3 py-2 border border-sidebar-border rounded-xl bg-sidebar-accent/20 transition-colors hover:bg-sidebar-accent/40">
                <Avatar className="h-9 w-9 ring-1 ring-sidebar-border">
                  <AvatarImage src={`https://avatar.vercel.sh/${user.username}`} />
                  <AvatarFallback className="bg-sidebar-accent text-[10px] font-medium">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate text-sidebar-foreground" data-testid="text-username">{user.username}</span>
                  <span className="text-[11px] text-sidebar-foreground/60">Plan: {planLabel}</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
