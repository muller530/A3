import { invoke } from "@tauri-apps/api/core";

export interface FeishuCredentials {
  app_id: string;
  app_secret: string;
}

export interface TableConfig {
  name: string; // 表格名称，如 "Answers"
  appToken: string;
  tableId: string;
}

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken: string; // 主要的 App Token（用于兼容旧版本）
  tableId: string; // 主要的 Table ID（用于兼容旧版本）
  tables: TableConfig[]; // 多个表格配置
}

export interface BitableTable {
  table_id: string;
  name: string;
}

export interface AnswerRecord {
  record_id: string;
  fields: Record<string, any>;
}

// Answers 表的结构化数据类型
export interface Answer {
  record_id: string;
  question: string;           // 问题
  standard_answer: string;    // 标准回答
  enable_status: string;      // 状态（启用 / 停用）
  scene: string;              // 使用场景
  tone: string;               // 语气
  product_name: string;       // 对应产品
  product_id: string;         // product_id
  raw_fields?: Record<string, any>; // 原始字段数据（用于调试）
}

// 设置飞书凭证（保存到后端）
export async function setFeishuCredentials(
  appId: string,
  appSecret: string
): Promise<string> {
  return await invoke("set_feishu_credentials", { appId, appSecret });
}

// 保存飞书完整配置到本地
// TODO: Phase 2 将替换为 Tauri secure storage
export async function saveFeishuConfig(config: FeishuConfig): Promise<void> {
  // Phase 1: 使用 localStorage（临时方案）
  // Phase 2: 将替换为 Tauri secure storage 以确保安全性
  localStorage.setItem("FEISHU_APP_ID", config.appId);
  localStorage.setItem("FEISHU_APP_SECRET", config.appSecret);
  localStorage.setItem("BITABLE_APP_TOKEN", config.appToken);
  localStorage.setItem("ANSWERS_TABLE_ID", config.tableId);
  
  // 保存多个表格配置
  if (config.tables && config.tables.length > 0) {
    localStorage.setItem("FEISHU_TABLES_CONFIG", JSON.stringify(config.tables));
    
    // 兼容：保存第一个表格作为默认表格（用于旧版本兼容）
    const firstTable = config.tables[0];
    if (firstTable) {
      localStorage.setItem("BITABLE_APP_TOKEN", firstTable.appToken);
      localStorage.setItem("ANSWERS_TABLE_ID", firstTable.tableId);
    }
  }
  
  // 同时保存到后端（用于后端 API 调用）
  await setFeishuCredentials(config.appId, config.appSecret);
}

// 从本地加载飞书配置
// TODO: Phase 2 将从 Tauri secure storage 读取
export function loadFeishuConfig(): Partial<FeishuConfig> | null {
  // Phase 1: 从 localStorage 读取（临时方案）
  // Phase 2: 将从 Tauri secure storage 读取
  const appId = localStorage.getItem("FEISHU_APP_ID");
  const appSecret = localStorage.getItem("FEISHU_APP_SECRET");
  const appToken = localStorage.getItem("BITABLE_APP_TOKEN");
  const tableId = localStorage.getItem("ANSWERS_TABLE_ID");

  if (!appId || !appSecret) {
    return null;
  }

  // 尝试加载多个表格配置
  const tablesConfigStr = localStorage.getItem("FEISHU_TABLES_CONFIG");
  let tables: TableConfig[] = [];
  if (tablesConfigStr) {
    try {
      tables = JSON.parse(tablesConfigStr);
    } catch (e) {
      console.error("Failed to parse tables config:", e);
    }
  }

  // 如果没有表格配置但有 appToken 和 tableId，创建默认配置（兼容旧版本）
  if (tables.length === 0 && appToken && tableId) {
    tables = [{ name: "Answers", appToken, tableId }];
  }

  return {
    appId,
    appSecret,
    appToken: appToken || "",
    tableId: tableId || "",
    tables,
  };
}

// 测试飞书连接（使用后端 Tauri 命令）
export async function testConnection(
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
    // 先设置凭证到后端
    await setFeishuCredentials(appId, appSecret);
    
    // 然后通过后端获取 token（后端会处理网络请求）
    const token = await getFeishuAccessToken();
    
    return {
      success: true,
      message: "连接成功！已成功获取 tenant_access_token",
      token: token.substring(0, 20) + "...", // 只显示前20个字符
    };
  } catch (error: any) {
    // 格式化错误信息
    let errorMessage = "连接测试失败";
    
    if (error && typeof error === "string") {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // 根据常见错误提供更友好的提示
    if (errorMessage.includes("请先配置飞书凭证")) {
      errorMessage = "凭证配置失败，请检查 App ID 和 App Secret";
    } else if (errorMessage.includes("网络请求失败")) {
      errorMessage = "网络连接失败，请检查网络连接或防火墙设置";
    } else if (errorMessage.includes("获取 token 失败")) {
      errorMessage = errorMessage.replace("获取 token 失败: ", "");
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// 获取飞书 access token（从后端缓存获取）
export async function getFeishuAccessToken(): Promise<string> {
  return await invoke("get_feishu_access_token");
}

// 获取 Bitable 表格列表
export async function getBitableTables(appToken: string): Promise<BitableTable[]> {
  return await invoke("get_bitable_tables", { appToken });
}

// 获取 Answers 表数据
export async function getAnswersData(
  appToken: string,
  tableId: string
): Promise<AnswerRecord[]> {
  return await invoke("get_answers_data", { appToken, tableId });
}

// 获取 Answers 表数据（结构化，带字段映射和容错处理）
export async function listAnswers(
  appToken: string,
  tableId: string
): Promise<Answer[]> {
  return await invoke("list_answers", { appToken, tableId });
}

