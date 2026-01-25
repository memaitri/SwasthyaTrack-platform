import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role } from "@shared/schema";

type ClientUser = User & { schoolName?: string | null };

interface AuthContextType {
  user: ClientUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role?: string;
    schoolId?: string;
  }) => Promise<any>;
  
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('swasthya-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('swasthya-session-id', sessionId);
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Session-ID": sessionId
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    
    // Update session ID from response if provided
    const responseSessionId = response.headers.get('X-Session-ID');
    if (responseSessionId && responseSessionId !== sessionId) {
      sessionStorage.setItem('swasthya-session-id', responseSessionId);
    }
    
    const accessToken = data.accessToken || data.token; // Support both formats
    if (!accessToken) {
      throw new Error("No access token received from server");
    }
    setToken(accessToken);
    setUser(data.user);
    localStorage.setItem("accessToken", accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const register = async (registerData: {
    username: string;
    password: string;
    email: string;
    fullName: string;
    role?: string;
    schoolId?: string;
    classSection?: string;
    region?: string;
    district?: string;
    block?: string;
  }) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    const data = await response.json();

    // If registration requires approval, server responds with 202 and { pending: true }
    if (response.status === 202 || data.pending) {
      // Let caller handle the pending state (no auto-login)
      return data;
    }

    const accessToken = data.accessToken || data.token; // Support both formats
    if (!accessToken) {
      throw new Error("No access token received from server");
    }
    setToken(accessToken);
    setUser(data.user);
    localStorage.setItem("accessToken", accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role as Role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthenticatedFetch() {
  const { token, logout } = useAuth();

  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      logout();
      throw new Error("Session expired");
    }

    return response;
  };
}
