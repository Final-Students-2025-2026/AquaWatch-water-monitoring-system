import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { TelemetryProvider } from "@/contexts/TelemetryContext";
import { useToast } from "@/contexts/ToastContext";
import { useEffect } from "react";
import { Layout } from "@/components/layout";
import Overview from "@/pages/overview";
import Historical from "@/pages/historical";
import Alerts from "@/pages/alerts";
import Sensors from "@/pages/sensors";
import Thresholds from "@/pages/thresholds";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return children;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {isAuthenticated ? (
          <Layout>
            <Overview />
          </Layout>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/historical">
        <ProtectedRoute>
          <Layout>
            <Historical />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/alerts">
        <ProtectedRoute>
          <Layout>
            <Alerts />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/sensors">
        <ProtectedRoute>
          <Layout>
            <Sensors />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/thresholds">
        <ProtectedRoute>
          <Layout>
            <Thresholds />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute>
          <Layout>
            <NotFound />
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function InactivityWarning() {
  const { inactivityWarning } = useAuth();
  const { warning } = useToast();

  useEffect(() => {
    if (inactivityWarning) {
      warning(inactivityWarning);
    }
  }, [inactivityWarning, warning]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <TelemetryProvider>
            <TooltipProvider>
              <InactivityWarning />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </TelemetryProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
