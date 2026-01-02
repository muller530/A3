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

// 测试飞书连接（通过后端）
export async function testConnection(
  appId: string,
  appSecret: string
): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    const result = await invoke<string>("test_feishu_connection", {
      appId,
      appSecret,
    });
    return {
      success: true,
      message: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.toString() || "连接测试失败",
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

// Answers 表的结构化数据
export interface Answer {
  record_id: string;
  question: string;
  standard_answer: string;
  enable_status: string;
  scene: string;
  tone: string;
  product_name: string;
  product_id: string;
  raw_fields?: Record<string, any>; // 原始字段数据（用于调试）
}

// 获取答案列表（结构化数据）
export async function listAnswers(
  appToken: string,
  tableId: string
): Promise<Answer[]> {
  return await invoke("list_answers", { appToken, tableId });
}

// 答案数据缓存接口
interface AnswersCache {
  data: Answer[];
  tableId: string;
  timestamp: number; // 同步时间戳
}

// 保存答案数据到本地缓存
export function saveAnswersCache(tableId: string, answers: Answer[]): void {
  try {
    const cache: AnswersCache = {
      data: answers,
      tableId,
      timestamp: Date.now(),
    };
    localStorage.setItem(`ANSWERS_CACHE_${tableId}`, JSON.stringify(cache));
  } catch (error) {
    console.error("保存答案缓存失败:", error);
  }
}

// 从本地缓存加载答案数据
export function loadAnswersCache(tableId: string): AnswersCache | null {
  try {
    const cacheStr = localStorage.getItem(`ANSWERS_CACHE_${tableId}`);
    if (!cacheStr) {
      return null;
    }
    const cache: AnswersCache = JSON.parse(cacheStr);
    // 验证缓存是否匹配当前表格
    if (cache.tableId !== tableId) {
      return null;
    }
    return cache;
  } catch (error) {
    console.error("加载答案缓存失败:", error);
    return null;
  }
}

// 清除答案数据缓存
export function clearAnswersCache(tableId?: string): void {
  try {
    if (tableId) {
      localStorage.removeItem(`ANSWERS_CACHE_${tableId}`);
    } else {
      // 清除所有答案缓存
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("ANSWERS_CACHE_")) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error("清除答案缓存失败:", error);
  }
}

// 获取缓存数据的同步时间
export function getCacheTimestamp(tableId: string): number | null {
  const cache = loadAnswersCache(tableId);
  return cache ? cache.timestamp : null;
}

// AI 配置相关接口
export interface AiConfig {
  api_key: string;
  base_url: string;
  model_id: string;
  request_timeout?: number;
}

// 设置 AI 配置
export async function setAiConfig(config: {
  api_key: string;
  base_url: string;
  model_id: string;
  request_timeout?: number;
}): Promise<string> {
  return await invoke("set_ai_config", {
    apiKey: config.api_key,
    apiBase: config.base_url,
    model: config.model_id,
  });
}

// 获取 AI 配置
export async function loadAiConfig(): Promise<AiConfig | null> {
  try {
    const config = await invoke<{ api_key: string; api_base: string; model: string } | null>("get_ai_config");
    if (!config) {
      return null;
    }
    return {
      api_key: config.api_key,
      base_url: config.api_base,
      model_id: config.model,
      request_timeout: 30000, // 默认 30 秒
    };
  } catch (error) {
    console.error("加载 AI 配置失败:", error);
    return null;
  }
}

// 测试 AI 连接
export async function testAiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await invoke<string>("test_ai_connection");
    return { success: true, message: result };
  } catch (error: any) {
    return { success: false, message: error?.toString() || "连接失败" };
  }
}

// 获取表格中的单条记录
export async function getBitableRecord(
  appToken: string,
  tableId: string,
  recordId: string
): Promise<AnswerRecord> {
  return await invoke("get_bitable_record", {
    appToken,
    tableId,
    recordId,
  });
}

// 更新答案到飞书
export async function updateAnswerToFeishu(
  appToken: string,
  tableId: string,
  recordId: string,
  fields: Record<string, any>
): Promise<string> {
  return await invoke("update_answer_to_feishu", {
    appToken,
    tableId,
    recordId,
    fields,
  });
}

// AI 优化答案
export async function optimizeAnswerWithAI(
  answer: string,
  context?: string
): Promise<string> {
  return await invoke("optimize_answer_with_ai", { answer, context });
}

// AI 审核答案
export async function reviewAnswerWithAI(
  answer: string,
  context?: string
): Promise<string> {
  return await invoke("review_answer_with_ai", { answer, context });
}

// AI 风险检测
export async function checkAnswerRisk(
  answer: string
): Promise<{ hasRisk: boolean; reason: string }> {
  try {
    const result = await invoke<{ hasRisk: boolean; reason: string }>("check_answer_risk", { answer });
    return result;
  } catch (error: any) {
    return {
      hasRisk: false,
      reason: error?.toString() || "检测失败",
    };
  }
}

// 打开外部链接
export async function openExternalUrl(url: string): Promise<void> {
  return await invoke("open_external_url", { url });
}

