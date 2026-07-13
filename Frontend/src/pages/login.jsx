import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { success } = useToast();
  const [location, setLocation] = useLocation();

  // Redirect if already authenticated
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    const result = await login(username.trim(), password);

    if (result.success) {
      success("Login successful");
      setLocation("/");
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section with Real Image */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        {/* Real water image from Unsplash */}
        <img
          src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&h=800&fit=crop"
          alt="Water landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/50 to-slate-900/30" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full px-12 text-white">
          <div className="flex items-center gap-4 mb-6">
            <img src="/logo.jpeg" alt="AquaWatch" className="w-16 h-16 rounded-2xl object-cover border border-white/20" />
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-center mb-4">
            AquaWatch
          </h1>
          <p className="text-2xl lg:text-3xl font-light text-sky-200 mb-6">
            Monitor
          </p>
          <p className="text-lg text-slate-300 text-center max-w-md leading-relaxed">
            Advanced IoT Water Quality Monitoring System
          </p>
          <div className="mt-12 flex gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-time Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>24/7 Monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Smart Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center relative bg-white dark:bg-slate-950 p-4 pt-6 lg:p-12">
        {/* Background image for mobile/tablet (shows on md and below) */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&h=800&fit=crop"
            alt="Water landscape"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        </div>

        <div className="w-full max-w-sm relative z-10 mt-12 lg:mt-0">
          {/* Mobile Hero Content (visible only on small screens) */}
          <div className="lg:hidden text-center text-white mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/logo.jpeg" alt="AquaWatch" className="w-12 h-12 rounded-2xl object-cover border border-white/20" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              AquaWatch
            </h1>
            <p className="text-xl font-light text-sky-200 mb-3">
              Monitor
            </p>
            <p className="text-base text-slate-300 max-w-xs mx-auto leading-relaxed">
              Advanced IoT Water Quality Monitoring System
            </p>
            <div className="mt-6 flex justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Real-time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>24/7</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Alerts</span>
              </div>
            </div>
          </div>

          {/* Desktop Logo (visible only on large screens) */}
          <div className="hidden lg:flex items-center justify-center gap-3 mb-8">
            <img src="/logo.jpeg" alt="AquaWatch" className="w-11 h-11 rounded-xl object-cover" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AquaWatch</h1>
              <p className="text-sm text-muted-foreground">IoT Monitor</p>
            </div>
          </div>

          {/* Login Form Header */}
          <div className="mb-8 lg:block hidden">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Mobile Form Header */}
          <div className="mb-6 lg:hidden">
            <h2 className="text-xl font-bold tracking-tight text-white text-center">
              Sign In
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="text-sm bg-destructive/90 border-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200 lg:text-slate-700 lg:dark:text-slate-300">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="h-12 bg-white/10 lg:bg-slate-50 dark:bg-slate-900 border-white/20 lg:border-slate-200 dark:border-slate-800 text-white lg:text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 lg:text-slate-700 lg:dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 bg-white/10 lg:bg-slate-50 dark:bg-slate-900 border-white/20 lg:border-slate-200 dark:border-slate-800 text-white lg:text-slate-900 placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 lg:text-slate-400 hover:text-white lg:hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
