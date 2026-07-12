import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

export type UserRole = "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER" | "ADMIN";

export interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  phone: string | null;
  avatarUrl: string | null;
  designation: string | null;
  status: string;
  departmentId: string | null;
  joinedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  employee: EmployeeProfile | null;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Pages fetch their data from `useEffect(..., [user, role])`. Handing them a
  // fresh object for an unchanged profile would restart every one of those
  // fetches on each revalidation, so only swap in `next` when it really differs.
  const applyUser = (next: UserProfile | null) => {
    setUser((prev) =>
      prev && next && JSON.stringify(prev) === JSON.stringify(next) ? prev : next
    );
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 200) {
        const data = await res.json();
        if (data.success && data.user) {
          applyUser(data.user);
          setError(null);
        } else {
          applyUser(null);
        }
      } else {
        applyUser(null);
      }
    } catch (e) {
      console.error("Failed to retrieve authentication profile", e);
      applyUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hydrated = useRef(false);

  // The profile is fetched once to hydrate, then revalidated in the background on
  // each navigation — a revoked or deactivated account still gets kicked on the
  // next route change. What we no longer do is flip `loading` back on: that made
  // every page blank out to its "Initializing Workspace" state and wait a full
  // `/api/auth/me` round trip before it was even allowed to start loading data.
  useEffect(() => {
    if (hydrated.current) {
      fetchProfile();
      return;
    }
    hydrated.current = true;

    const publicPaths = ["/", "/login", "/register"];
    if (publicPaths.includes(router.pathname)) {
      setLoading(false);
    }
    fetchProfile();
  }, [router.pathname]);

  // Route guarding check
  useEffect(() => {
    const publicPaths = ["/", "/login", "/register"];
    if (!loading && !user && !publicPaths.includes(router.pathname)) {
      router.push("/login");
    }
  }, [user, loading, router.pathname]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        setUser(data.user);
        setError(null);
        router.push("/dashboard");
        return { success: true };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (e) {
      return { success: false, error: "An unexpected network error occurred" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Failed call to logout endpoint", e);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        loading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
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
