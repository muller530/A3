import React, { createContext, useContext, useState, useEffect } from "react";

type UserRole = "user" | "admin" | null;

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem("user_role");
    return (saved as UserRole) || null;
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem("user_role", role);
    } else {
      localStorage.removeItem("user_role");
    }
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const logout = () => {
    setRoleState(null);
  };

  return (
    <AuthContext.Provider value={{ role, setRole, logout }}>
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

