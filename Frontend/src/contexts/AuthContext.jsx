import { createContext, useContext, useState, useEffect, useRef } from "react";
import { setUnauthorizedHandler } from "@/lib/authEvents";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

// Decode the JWT payload to check whether the access token has expired.
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    if (!decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    console.error("Failed to decode token:", error);
    return true;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityWarning, setInactivityWarning] = useState(null);

  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const hasWarnedRef = useRef(false);

  const resetInactivityTimer = () => {
    // Warn after 9 minutes, log out after 10 if the user has been idle.
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    hasWarnedRef.current = false;
    setInactivityWarning(null);

    if (isAuthenticated) {
      warningTimerRef.current = setTimeout(() => {
        hasWarnedRef.current = true;
        setInactivityWarning("You will be logged out in 1 minute due to inactivity. Click anywhere or press any key to stay logged in.");
      }, 540000);

      inactivityTimerRef.current = setTimeout(() => {
        setInactivityWarning(null);
        logout();
      }, 600000);
    }
  };

  const handleUserActivity = () => {
    if (isAuthenticated) {
      resetInactivityTimer();
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated]);

  useEffect(() => {
    resetInactivityTimer();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      window.location.href = `${import.meta.env.BASE_URL || "/"}#/login`;
    });

    const restore = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("aquawatch_user");
      if (!token || !storedUser || isTokenExpired(token)) {
        logout();
        setIsLoading(false);
        return;
      }
      try {
        const user = await api.getMe(token);
        localStorage.setItem("aquawatch_user", JSON.stringify(user));
        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token && isTokenExpired(token)) {
        logout();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || "Login failed" };
      }

      const data = await response.json();
      const userWithoutToken = { ...data.user };
      setUser(userWithoutToken);
      setIsAuthenticated(true);
      localStorage.setItem("aquawatch_user", JSON.stringify(userWithoutToken));
      localStorage.setItem("token", data.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("aquawatch_user");
    localStorage.removeItem("token");
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("aquawatch_user", JSON.stringify(updated));
      return updated;
    });
  };

  const verifyPin = (pin) => {
    return user?.pin === pin;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    verifyPin,
    updateUser,
    inactivityWarning,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
