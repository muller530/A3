import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 从飞书 Bitable 链接中提取 App Token 和 Table ID
 * 支持的链接格式：
 * - https://example.feishu.cn/base/{app_token}?table={table_id}&view={view_id}
 * - https://example.feishu.cn/base/{app_token}
 * - https://bytedance.feishu.cn/base/{app_token}?table={table_id}
 */
export function extractBitableInfo(url: string): {
  appToken: string | null;
  tableId: string | null;
} {
  try {
    // 如果已经是 token 格式（纯字符串，不包含 / 或 http），直接返回
    if (!url.includes("/") && !url.includes("http")) {
      return { appToken: url, tableId: null };
    }

    // 解析 URL
    const urlObj = new URL(url);
    
    // 提取 app_token：从路径中提取 /base/{app_token} 部分
    const pathMatch = urlObj.pathname.match(/\/base\/([^\/\?]+)/);
    const appToken = pathMatch ? pathMatch[1] : null;

    // 提取 table_id：从查询参数中获取
    const tableId = urlObj.searchParams.get("table");

    return {
      appToken,
      tableId: tableId || null,
    };
  } catch (error) {
    // 如果 URL 解析失败，尝试直接作为 token 使用
    return { appToken: url || null, tableId: null };
  }
}

