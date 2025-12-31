/**
 * 飞书 API 客户端
 * 封装飞书相关的 API 请求
 */

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

export interface TenantAccessTokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

export interface FeishuError {
  code: number;
  msg: string;
  error?: any;
}

/**
 * 获取 tenant_access_token
 * @param appId 飞书应用 App ID
 * @param appSecret 飞书应用 App Secret
 * @returns tenant_access_token
 */
export async function getTenantAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const url = `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `网络请求失败: HTTP ${response.status} ${response.statusText}`
      );
    }

    const data: TenantAccessTokenResponse = await response.json();

    if (data.code !== 0) {
      const error: FeishuError = {
        code: data.code,
        msg: data.msg || "未知错误",
      };
      throw formatFeishuError(error);
    }

    if (!data.tenant_access_token) {
      throw new Error("响应中缺少 tenant_access_token");
    }

    return data.tenant_access_token;
  } catch (error: any) {
    // 格式化错误信息，使其更可读
    if (error instanceof Error) {
      // 如果已经是格式化过的错误，直接抛出
      if (error.message.includes("错误代码") || error.message.includes("错误描述")) {
        throw error;
      }
      // 网络错误或其他错误
      throw new Error(`连接失败: ${error.message}`);
    }
    throw new Error(`连接失败: ${String(error)}`);
  }
}

/**
 * 格式化飞书错误信息，使其更可读
 */
function formatFeishuError(error: FeishuError): Error {
  let message = "飞书 API 调用失败\n";
  message += `错误代码: ${error.code}\n`;
  message += `错误描述: ${error.msg}`;

  // 根据常见错误代码提供更详细的说明
  const errorCodeMap: Record<number, string> = {
    99991663: "app_id 无效或不存在",
    99991664: "app_secret 无效或错误",
    99991400: "请求参数错误",
    99991401: "未授权访问",
    99991403: "权限不足",
    99991404: "资源不存在",
  };

  if (errorCodeMap[error.code]) {
    message += `\n可能原因: ${errorCodeMap[error.code]}`;
  }

  if (error.code === 99991663 || error.code === 99991664) {
    message += "\n请检查 App ID 和 App Secret 是否正确";
  }

  return new Error(message);
}

/**
 * 测试飞书连接
 * @param appId 飞书应用 App ID
 * @param appSecret 飞书应用 App Secret
 * @returns 测试结果信息
 */
export async function testFeishuConnection(
  appId: string,
  appSecret: string
): Promise<{ success: boolean; message: string; token?: string }> {
  if (!appId || !appSecret) {
    return {
      success: false,
      message: "请先填写 App ID 和 App Secret",
    };
  }

  try {
    const token = await getTenantAccessToken(appId, appSecret);
    return {
      success: true,
      message: "连接成功！已成功获取 tenant_access_token",
      token: token.substring(0, 20) + "...", // 只显示前20个字符
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "连接测试失败",
    };
  }
}
