import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { User } from "lucide-react";

export default function AccountSettings() {
  const { role } = useAuth();

  return (
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
            当前角色
          </label>
          <div className="p-3 bg-gray-50 rounded-md border">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              role === "admin" 
                ? "bg-blue-100 text-blue-800" 
                : "bg-green-100 text-green-800"
            }`}>
              {role === "admin" ? "管理员 (Admin)" : "普通用户 (User)"}
            </span>
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
              </>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <p className="text-xs text-gray-500">
            如需切换角色，请退出登录后重新选择角色登录
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
