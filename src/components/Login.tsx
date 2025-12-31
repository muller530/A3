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
    navigate("/config");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>A3 客服知识库工具</CardTitle>
          <CardDescription>请选择您的角色登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">角色</label>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "user" | "admin")}
              >
                <option value="user">普通用户 (User)</option>
                <option value="admin">管理员 (Admin)</option>
              </Select>
            </div>
            <Button onClick={handleLogin} className="w-full">
              登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

