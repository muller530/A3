import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import Navigation from "./Navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleLogin = async () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    const result = login(username, password);
    
    if (result.success) {
      navigate(redirect);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 导航栏 */}
      <Navigation />
      
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      
      {/* 登录表单居中 */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] pt-16">
        <Card className="relative w-full max-w-md glass border-white/30 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-8">
          <div className="mb-4">
            <div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/50">
              <span className="text-2xl font-bold text-white">A3</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">knowledge base</CardTitle>
          <CardDescription className="text-base mt-2">请输入您的账号信息登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-3 block text-gray-700">用户名</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入用户名"
                className="w-full h-12"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-3 block text-gray-700">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入密码"
                className="w-full h-12"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

