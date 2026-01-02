export type UserRole = "user" | "admin";

export interface User {
  id: string;
  username: string;
  password: string; // 实际应用中应该存储哈希值
  role: UserRole;
  createdAt: string;
}

const STORAGE_KEY = "A3_USERS";
const CURRENT_USER_KEY = "A3_CURRENT_USER";

// 初始化默认用户（如果不存在）
function initializeDefaultUsers(): void {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const defaultUsers: User[] = [
      {
        id: "1",
        username: "admin",
        password: "admin123", // 默认管理员密码
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        username: "user",
        password: "user123", // 默认普通用户密码
        role: "user",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
  }
}

// 获取所有用户
export function getAllUsers(): User[] {
  initializeDefaultUsers();
  const usersStr = localStorage.getItem(STORAGE_KEY);
  if (!usersStr) return [];
  try {
    return JSON.parse(usersStr);
  } catch {
    return [];
  }
}

// 根据用户名查找用户
export function getUserByUsername(username: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.username === username) || null;
}

// 验证用户登录
export function verifyUser(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// 添加用户
export function addUser(username: string, password: string, role: UserRole): { success: boolean; message: string } {
  const users = getAllUsers();
  
  // 检查用户名是否已存在
  if (users.some((u) => u.username === username)) {
    return { success: false, message: "用户名已存在" };
  }

  const newUser: User = {
    id: Date.now().toString(),
    username,
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  return { success: true, message: "用户添加成功" };
}

// 更新用户
export function updateUser(
  userId: string,
  updates: { username?: string; password?: string; role?: UserRole }
): { success: boolean; message: string } {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === userId);
  
  if (index === -1) {
    return { success: false, message: "用户不存在" };
  }

  // 如果更新用户名，检查是否与其他用户冲突
  if (updates.username && updates.username !== users[index].username) {
    if (users.some((u) => u.id !== userId && u.username === updates.username)) {
      return { success: false, message: "用户名已存在" };
    }
  }

  users[index] = {
    ...users[index],
    ...updates,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  return { success: true, message: "用户更新成功" };
}

// 删除用户
export function deleteUser(userId: string): { success: boolean; message: string } {
  const users = getAllUsers();
  const filtered = users.filter((u) => u.id !== userId);
  
  if (filtered.length === users.length) {
    return { success: false, message: "用户不存在" };
  }

  // 至少保留一个管理员
  const adminCount = filtered.filter((u) => u.role === "admin").length;
  if (adminCount === 0) {
    return { success: false, message: "至少需要保留一个管理员账号" };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return { success: true, message: "用户删除成功" };
}

// 保存当前登录用户
export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ id: user.id, username: user.username, role: user.role }));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// 获取当前登录用户
export function getCurrentUser(): { id: string; username: string; role: UserRole } | null {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

