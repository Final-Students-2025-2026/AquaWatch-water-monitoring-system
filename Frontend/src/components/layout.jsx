import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Droplet, LayoutDashboard, LineChart, Bell, Cpu, SlidersHorizontal, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { SettingsModal } from "@/pages/settings";

export function Layout({ children }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const { info } = useToast();

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("aquawatch_sidebar_collapsed");
    if (stored !== null) {
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  // Save sidebar collapsed state
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("aquawatch_sidebar_collapsed", String(newState));
  };

  useEffect(() => {
    async function loadAlertCount() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/alerts`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const alerts = await response.json();
          const activeCount = Array.isArray(alerts) ? alerts.filter(a => a.status === "active").length : 0;
          setActiveAlertsCount(activeCount);
        }
      } catch (error) {
        console.error("Failed to load alert count:", error);
      }
    }
    loadAlertCount();
  }, []);

  const handleLogout = () => {
    logout();
    info("Logged out successfully");
    setLocation("/login");
  };

  const navItems = [
    { href: "/", label: "System Overview", icon: LayoutDashboard },
    { href: "/historical", label: "Historical Data", icon: LineChart },
    {
      href: "/alerts",
      label: "Alerts",
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    { href: "/sensors", label: "Sensors", icon: Cpu },
    { href: "/thresholds", label: "Thresholds", icon: SlidersHorizontal },
  ];

  function NavContent({ onNavigate, collapsed = false }) {
    return (
      <>
        <nav className={["flex-1 space-y-0.5 overflow-y-auto", collapsed ? "p-2" : "p-3"].join(" ")}>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return collapsed ? (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      "flex items-center justify-center p-2.5 rounded-lg transition-colors mx-auto w-10 h-10",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                    ].join(" ")}
                  >
                    <item.icon className={["w-5 h-5", isActive ? "text-primary" : "text-sidebar-foreground/70"].join(" ")} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={[
                  "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={["w-4 h-4", isActive ? "text-primary" : "text-sidebar-foreground/50"].join(" ")} />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-xs leading-none justify-center">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* Settings button */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="flex items-center justify-center p-2.5 rounded-lg transition-colors mx-auto w-10 h-10 text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                >
                  <Settings className="w-5 h-5 text-sidebar-foreground/70" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-sidebar-foreground/50" />
                <span className="text-sm">Settings</span>
              </div>
            </button>
          )}

          {/* Logout button in nav */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate();
                    handleLogout();
                  }}
                  className="flex items-center justify-center p-2.5 rounded-lg transition-colors mx-auto w-10 h-10 text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                >
                  <LogOut className="w-5 h-5 text-sidebar-foreground/70" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => {
                if (onNavigate) onNavigate();
                handleLogout();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-sidebar-foreground/50" />
                <span className="text-sm">Logout</span>
              </div>
            </button>
          )}

          {/* Admin/User section - right after logout */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center p-2.5 rounded-lg mx-auto w-10 h-10 cursor-default">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {user?.username?.charAt(0).toUpperCase() || "A"}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user?.username || "Admin"}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {user?.username?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">{user?.username || "Admin"}</p>
                  <p className="text-xs text-sidebar-foreground/60">Administrator</p>
                </div>
              </div>
            </div>
          )}
        </nav>

      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile top bar - sticky */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Droplet className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">AquaWatch</span>
          {activeAlertsCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-xs">
              {activeAlertsCount}
            </Badge>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent/50 h-9 w-9"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          "md:hidden fixed top-0 left-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col",
          "shadow-2xl transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Mobile Logo */}
        <div className="border-b border-sidebar-border p-4 shrink-0">
          <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shrink-0">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">AquaWatch</h1>
              <p className="text-sidebar-foreground/60 text-xs uppercase tracking-wider mt-0.5">IoT Monitor</p>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation - includes logout and admin */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <NavContent onNavigate={() => setSidebarOpen(false)} />
        </div>
      </aside>

      <TooltipProvider>
        <div className="flex flex-1 min-h-0 pt-14 md:pt-0">
          {/* Desktop sidebar - static */}
          <aside
            className={[
              "hidden md:flex bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border shrink-0 transition-all duration-300 ease-in-out min-h-screen sticky top-0",
              sidebarCollapsed ? "w-16" : "w-56 lg:w-64",
            ].join(" ")}
          >
            {/* Logo */}
            <div className={["border-b border-sidebar-border", sidebarCollapsed ? "p-4 flex justify-center" : "p-5"].join(" ")}>
              <Link href="/" className={["flex items-center", sidebarCollapsed ? "justify-center" : "gap-3"].join(" ")}>
                <div className="bg-primary text-primary-foreground p-2 rounded-lg shrink-0">
                  <Droplet className="w-5 h-5" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h1 className="font-bold text-lg tracking-tight leading-none">AquaWatch</h1>
                    <p className="text-sidebar-foreground/60 text-xs uppercase tracking-wider mt-0.5">IoT Monitor</p>
                  </div>
                )}
              </Link>
            </div>

            {/* Collapse toggle button */}
            <div className={["border-b border-sidebar-border", sidebarCollapsed ? "p-2 flex justify-center" : "px-3 py-2"].join(" ")}>
              <Button
                variant="ghost"
                onClick={toggleSidebar}
                className={[
                  "h-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
                  sidebarCollapsed ? "w-8 px-0 justify-center rounded-lg" : "w-full justify-start gap-2 px-2 rounded-lg",
                ].join(" ")}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs">Collapse</span>
                  </>
                )}
              </Button>
            </div>

            {/* Navigation with logout and admin - scrollable */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <NavContent collapsed={sidebarCollapsed} />
            </div>
          </aside>

          {/* Main content - scrollable area */}
          <main className="flex-1 overflow-y-auto relative">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24">
              {children}
            </div>
          </main>
        </div>
      </TooltipProvider>

      {/* Settings Modal */}
      <SettingsModal open={settingsModalOpen} onOpenChange={setSettingsModalOpen} />
    </div>
  );
}
