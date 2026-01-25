import { Link, useLocation } from "wouter";
import { Home, Briefcase, Wand2, Calendar, LogOut, Settings, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer" data-testid="link-logo">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight text-sidebar-foreground" data-testid="text-sidebar-logo">Joblify</span>
              <span className="text-xs text-muted-foreground/80">Find freelance work</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={`h-11 px-3 rounded-lg transition-all ${
                      isActive(item.url) 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                        : 'text-sidebar-foreground/80 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className={`w-5 h-5 ${isActive(item.url) ? 'text-primary' : ''}`} />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive("/dashboard/account")}
                  className={`h-11 px-3 rounded-lg transition-all ${
                    isActive("/dashboard/account") 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                      : 'text-sidebar-foreground/80 hover:text-sidebar-foreground'
                  }`}
                >
                  <Link href="/dashboard/account" data-testid="link-nav-account">
                    <Settings className={`w-5 h-5 ${isActive("/dashboard/account") ? 'text-primary' : ''}`} />
                    <span className="text-sm">Account</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 mt-auto">
        {!isLoading && user && (
          <div className="bg-sidebar-accent/50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold truncate text-sidebar-foreground" data-testid="text-username">{user.username}</span>
                <span className="text-xs text-muted-foreground">{planLabel} Plan</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
