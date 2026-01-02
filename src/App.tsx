import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";
import AnswerList from "./components/AnswerList";
import HelpPage from "./pages/HelpPage";

// 设置页面需要登录保护
function SettingsProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  // 如果是默认访客用户（未登录），跳转到登录页
  if (!currentUser || currentUser.id === "default") {
    return <Navigate to="/login?redirect=/settings" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={<HomePage />}
        />
        <Route
          path="/settings"
          element={
            <SettingsProtectedRoute>
              <SettingsPage />
            </SettingsProtectedRoute>
          }
        />
        <Route
          path="/config"
          element={<Navigate to="/settings" replace />}
        />
        <Route
          path="/answers"
          element={<AnswerList />}
        />
        <Route
          path="/help"
          element={<HelpPage />}
        />
      </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

