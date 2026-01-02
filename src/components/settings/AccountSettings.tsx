import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { User, Users, LogOut } from "lucide-react";
import UserManagementDialog from "./UserManagementDialog";

export default function AccountSettings() {
  const { currentUser, role, logout } = useAuth();
  const [userManagementOpen, setUserManagementOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            账号设置
          </CardTitle>
          <CardDescription>
            查看和管理您的账号信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              当前账号
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{currentUser?.username}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    role === "admin" 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {role === "admin" ? "管理员 (Admin)" : "普通用户 (User)"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {role === "admin" 
                ? "管理员拥有所有权限，包括写回飞书、审核答案等功能"
                : "普通用户可以查看和搜索答案，使用 AI 优化和审核功能"}
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-3">权限说明</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>查看和搜索知识库答案</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>使用 AI 优化和审核功能</span>
              </div>
              {role === "admin" && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>将 AI 优化/审核结果写回飞书</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>修改答案状态为"已通过"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>配置飞书和 AI 设置</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>管理用户账号和权限</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {role === "admin" && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-3">用户管理</h3>
              <p className="text-xs text-gray-500 mb-4">
                添加、编辑或删除用户账号，设置用户角色和权限
              </p>
              <Button
                onClick={() => setUserManagementOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                管理用户
              </Button>
            </div>
          )}

          <div className="border-t pt-6">
            <Button
              onClick={logout}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>

      {role === "admin" && (
        <UserManagementDialog
          open={userManagementOpen}
          onOpenChange={setUserManagementOpen}
        />
      )}
    </>
  );
}
