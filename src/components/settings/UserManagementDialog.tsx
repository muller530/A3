import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { getAllUsers, addUser, updateUser, deleteUser, type User, type UserRole } from "../../lib/userManager";
import { Trash2, Edit2, Plus, X } from "lucide-react";

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", role: "user" as UserRole });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = () => {
    const allUsers = getAllUsers();
    setUsers(allUsers);
  };

  const handleAddUser = () => {
    setShowAddForm(true);
    setEditingUser(null);
    setFormData({ username: "", password: "", role: "user" });
    setMessage(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowAddForm(true);
    setFormData({ username: user.username, password: "", role: user.role });
    setMessage(null);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("确定要删除此用户吗？")) {
      const result = deleteUser(userId);
      if (result.success) {
        loadUsers();
        setMessage({ type: "success", text: result.message });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    }
  };

  const handleSubmit = () => {
    if (!formData.username || (!formData.password && !editingUser)) {
      setMessage({ type: "error", text: "请填写完整信息" });
      return;
    }

    let result;
    if (editingUser) {
      // 更新用户
      result = updateUser(editingUser.id, {
        username: formData.username,
        password: formData.password || undefined,
        role: formData.role,
      });
    } else {
      // 添加用户
      result = addUser(formData.username, formData.password, formData.role);
    }

    if (result.success) {
      loadUsers();
      setShowAddForm(false);
      setEditingUser(null);
      setFormData({ username: "", password: "", role: "user" });
      setMessage({ type: "success", text: result.message });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ username: "", password: "", role: "user" });
    setMessage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle>用户管理</DialogTitle>
          <DialogDescription>添加、编辑或删除用户账号</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {!showAddForm ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">用户列表</h3>
                  <Button onClick={handleAddUser} size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    添加用户
                  </Button>
                </div>

                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap">用户名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap">角色</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap">创建时间</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                            暂无用户数据
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{user.username}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.role === "admin" ? "管理员" : "普通用户"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {new Date(user.createdAt).toLocaleString("zh-CN")}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="h-8 w-8 p-0"
                                  title="编辑"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">{editingUser ? "编辑用户" : "添加用户"}</h3>
                  <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 w-8 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">用户名</label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="请输入用户名"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">密码</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? "留空则不修改密码" : "请输入密码"}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">角色</label>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full"
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </Select>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={handleCancel}>
                      取消
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingUser ? "保存" : "添加"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

