import React, { createContext, useContext, useState } from "react";
import { getCurrentUser, setCurrentUser as saveCurrentUser, verifyUser, type UserRole } from "../lib/userManager";

interface CurrentUser {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  currentUser: CurrentUser | null;
  role: UserRole | null;
  login: (username: string, password: string) => { success: boolean; message: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 如果没有登录用户，默认使用普通用户身份
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(() => {
    const saved = getCurrentUser();
    if (saved) {
      return saved;
    }
    // 默认使用普通用户身份
    const defaultUser: CurrentUser = {
      id: "default",
      username: "guest",
      role: "user",
    };
    return defaultUser;
  });

  const login = (username: string, password: string): { success: boolean; message: string } => {
    const user = verifyUser(username, password);
    if (user) {
      const userInfo = { id: user.id, username: user.username, role: user.role };
      setCurrentUserState(userInfo);
      saveCurrentUser(user);
      return { success: true, message: "登录成功" };
    }
    return { success: false, message: "用户名或密码错误" };
  };

  const logout = () => {
    // 退出登录后，恢复为默认普通用户
    const defaultUser: CurrentUser = {
      id: "default",
      username: "guest",
      role: "user",
    };
    setCurrentUserState(defaultUser);
    saveCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      role: currentUser?.role || "user", // 默认普通用户
      login, 
      logout 
    }}>
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

