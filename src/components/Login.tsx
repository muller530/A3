import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select } from "./ui/select";

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");
  const { setRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    setRole(selectedRole);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      
      <Card className="relative w-full max-w-md glass border-white/30 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-8">
          <div className="mb-4">
            <div className="inline-block p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/50">
              <span className="text-2xl font-bold text-white">A3</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">knowledge base</CardTitle>
          <CardDescription className="text-base mt-2">请选择您的角色登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-3 block text-gray-700">角色</label>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "user" | "admin")}
                className="w-full h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              >
                <option value="user">普通用户 (User)</option>
                <option value="admin">管理员 (Admin)</option>
              </Select>
            </div>
            <Button 
              onClick={handleLogin} 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 hover:scale-[1.02]"
            >
              登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

