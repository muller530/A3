import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveFeishuConfig, loadFeishuConfig, testConnection, TableConfig, setAiConfig, loadAiConfig, testAiConnection } from "../lib/api";
import { extractBitableInfo } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { TestTube2, CheckCircle2, XCircle, Loader2, Link2 } from "lucide-react";

// 定义需要的表格列表
const REQUIRED_TABLES = [
  { key: "answers", label: "ANSWERS 表格", description: "答案数据表" },
  // 可以在这里添加更多表格，例如：
  // { key: "questions", label: "QUESTIONS 表格", description: "问题数据表" },
];

interface TableLinkState {
  link: string;
  extractedInfo: {
    appToken: string | null;
    tableId: string | null;
  } | null;
  appToken: string;
  tableId: string;
}

export default function Config() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  // BITABLE_APP_TOKEN 是应用级别的，所有表格共享
  const [appToken, setAppToken] = useState("");
  const [appTokenLink, setAppTokenLink] = useState("");
  // 为每个表格维护独立的链接和提取状态（只提取 Table ID）
  const [tableLinks, setTableLinks] = useState<Record<string, TableLinkState>>(() => {
    const initial: Record<string, TableLinkState> = {};
    REQUIRED_TABLES.forEach((table) => {
      initial[table.key] = {
        link: "",
        extractedInfo: null,
        appToken: "", // 不再使用，保留用于兼容
        tableId: "",
      };
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  // AI 配置相关状态
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://ark.cn-beijing.volces.com/api/v3");
  const [aiModelId, setAiModelId] = useState("doubao-pro");
  const [aiRequestTimeout, setAiRequestTimeout] = useState(60);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiTestResult, setAiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const navigate = useNavigate();

  // 从本地存储加载已保存的配置
  useEffect(() => {
    const savedConfig = loadFeishuConfig();
    if (savedConfig) {
      setAppId(savedConfig.appId || "");
      setAppSecret(savedConfig.appSecret || "");
      
      // 加载 BITABLE_APP_TOKEN（应用级别）
      if (savedConfig.appToken) {
        setAppToken(savedConfig.appToken);
      }
      
      // 加载已保存的表格配置
      if (savedConfig.tables && savedConfig.tables.length > 0) {
        const updatedLinks = { ...tableLinks };
        savedConfig.tables.forEach((table) => {
          // 查找对应的表格键（通过 tableId 或 name 匹配）
          const tableKey = REQUIRED_TABLES.find(
            (rt) => rt.key === table.name.toLowerCase() || rt.label.toLowerCase().includes(table.name.toLowerCase())
          )?.key || REQUIRED_TABLES[0].key;
          
          if (updatedLinks[tableKey]) {
            updatedLinks[tableKey] = {
              ...updatedLinks[tableKey],
              tableId: table.tableId,
            };
          }
        });
        setTableLinks(updatedLinks);
      } else if (savedConfig.tableId) {
        // 兼容旧版本：只有一个表格配置
        const firstTableKey = REQUIRED_TABLES[0].key;
        setTableLinks((prev) => ({
          ...prev,
          [firstTableKey]: {
            ...prev[firstTableKey],
            tableId: savedConfig.tableId || "",
          },
        }));
      }
    }
    
    // 加载 AI 配置
    loadAiConfig().then((config) => {
      if (config) {
        setAiApiKey(config.api_key);
        setAiBaseUrl(config.base_url);
        setAiModelId(config.model_id);
        setAiRequestTimeout(config.request_timeout || 60);
      }
    }).catch((error) => {
      console.error("加载 AI 配置失败:", error);
    });
  }, []);

  // 处理 BITABLE_APP_TOKEN 链接变化（应用级别）
  const handleAppTokenLinkChange = (link: string) => {
    setAppTokenLink(link);
    
    if (link && link.trim()) {
      const info = extractBitableInfo(link);
      // 自动填充 App Token
      if (info.appToken) {
        setAppToken(info.appToken);
      }
    }
  };

  // 处理表格链接变化（只提取 Table ID）
  const handleTableLinkChange = (tableKey: string, link: string) => {
    setTableLinks((prev) => {
      const updated = { ...prev };
      if (!updated[tableKey]) {
        updated[tableKey] = {
          link: "",
          extractedInfo: null,
          appToken: "",
          tableId: "",
        };
      }
      
      updated[tableKey].link = link;
      
      // 自动提取信息
      if (link && link.trim()) {
        const info = extractBitableInfo(link);
        updated[tableKey].extractedInfo = info;
        
        // 只提取 Table ID
        if (info.tableId) {
          updated[tableKey].tableId = info.tableId;
        }
        
        // 如果链接中包含 App Token，也自动填充到应用级别（如果还未设置）
        if (info.appToken && !appToken) {
          setAppToken(info.appToken);
        }
      } else {
        updated[tableKey].extractedInfo = null;
      }
      
      return updated;
    });
  };

  // 处理表格字段手动编辑
  const handleTableFieldChange = (tableKey: string, field: "appToken" | "tableId", value: string) => {
    setTableLinks((prev) => {
      const updated = { ...prev };
      if (updated[tableKey]) {
        updated[tableKey][field] = value;
      }
      return updated;
    });
  };

  // 处理连接测试
  const handleTestConnection = async () => {
    if (!appId || !appSecret) {
      setTestResult({
        success: false,
        message: "请先填写 App ID 和 App Secret",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setMessage("");

    try {
      const result = await testConnection(appId, appSecret);
      setTestResult(result);
      if (result.success) {
        setMessage("连接测试成功！");
      } else {
        setMessage(result.message);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "连接测试失败",
      });
      setMessage(error.message || "连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  // 处理保存配置
  const handleSave = async () => {
    if (!appId || !appSecret) {
      setMessage("请填写完整的飞书凭证信息");
      setTestResult(null);
      return;
    }

    // 检查 BITABLE_APP_TOKEN 是否已配置
    if (!appToken) {
      setMessage("请配置 BITABLE_APP_TOKEN（应用级别，所有表格共享）");
      setTestResult(null);
      return;
    }

    // 检查所有必需的表格是否已配置 Table ID
    const missingTables: string[] = [];
    REQUIRED_TABLES.forEach((table) => {
      const state = tableLinks[table.key];
      if (!state?.tableId) {
        missingTables.push(table.label);
      }
    });

    if (missingTables.length > 0) {
      setMessage(`请配置以下表格：${missingTables.join("、")}`);
      setTestResult(null);
      return;
    }

    setLoading(true);
    setMessage("");
    setTestResult(null);

    try {
      // 构建表格配置数组（所有表格共享同一个 appToken）
      const tables: TableConfig[] = REQUIRED_TABLES.map((table) => {
        const state = tableLinks[table.key];
        return {
          name: table.key,
          appToken: appToken, // 所有表格共享同一个 App Token
          tableId: state.tableId,
        };
      });

      // 使用第一个表格作为主表格（兼容旧版本）
      const firstTable = tables[0];

      await saveFeishuConfig({
        appId,
        appSecret,
        appToken: appToken,
        tableId: firstTable.tableId,
        tables,
      });
      
      setMessage("配置保存成功！");
      setTimeout(() => {
        navigate("/answers");
      }, 1000);
    } catch (error: any) {
      setMessage(`保存失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // AI 配置相关处理函数
  const handleTestAiConnection = async () => {
    if (!aiApiKey || !aiBaseUrl || !aiModelId) {
      setAiTestResult({
        success: false,
        message: "请先填写完整的 AI 配置信息",
      });
      return;
    }

    setAiTesting(true);
    setAiTestResult(null);
    setAiMessage("");

    try {
      // 先临时保存配置以进行测试
      await setAiConfig({
        api_key: aiApiKey,
        base_url: aiBaseUrl,
        model_id: aiModelId,
        request_timeout: aiRequestTimeout,
      });

      const result = await testAiConnection();
      setAiTestResult(result);
      // 使用 result.message 显示模型返回的消息（UI 中会通过 aiTestResult.message 显示）
    } catch (error: any) {
      setAiTestResult({
        success: false,
        message: error.message || "AI 连接测试失败",
      });
      setAiMessage(error.message || "AI 连接测试失败");
    } finally {
      setAiTesting(false);
    }
  };

  const handleSaveAiConfig = async () => {
    if (!aiApiKey || !aiBaseUrl || !aiModelId) {
      setAiMessage("请填写完整的 AI 配置信息");
      setAiTestResult(null);
      return;
    }

    if (aiRequestTimeout <= 0) {
      setAiMessage("请求超时时间必须大于 0");
      setAiTestResult(null);
      return;
    }

    setAiLoading(true);
    setAiMessage("");
    setAiTestResult(null);

    try {
      await setAiConfig({
        api_key: aiApiKey,
        base_url: aiBaseUrl,
        model_id: aiModelId,
        request_timeout: aiRequestTimeout,
      });
      
      setAiMessage("AI 配置保存成功！");
    } catch (error: any) {
      setAiMessage(`保存失败: ${error.message || error}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">设置中心</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>飞书应用配置</CardTitle>
            <CardDescription>
              配置飞书应用凭证和多维表格信息
              <br />
              <span className="text-xs text-amber-600 mt-1 block">
                注意：当前使用 localStorage 存储配置，Phase 2 将迁移至 Tauri secure storage
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* FEISHU_APP_ID */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                FEISHU_APP_ID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="请输入飞书应用 App ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>

            {/* FEISHU_APP_SECRET */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                FEISHU_APP_SECRET <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="请输入飞书应用 App Secret"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
              />
            </div>

            {/* BITABLE_APP_TOKEN（应用级别，所有表格共享） */}
            <div className="border-t pt-6">
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  BITABLE_APP_TOKEN <span className="text-red-500">*</span>
                  <span className="text-gray-500 text-xs font-normal ml-2">
                    (应用级别，所有表格共享)
                  </span>
                </label>
                
                {/* App Token 链接输入框 */}
                <div className="relative mb-3">
                  <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="粘贴 Bitable 应用链接或任意表格链接，例如：https://example.feishu.cn/base/xxx 或 https://example.feishu.cn/base/xxx?table=xxx"
                    value={appTokenLink}
                    onChange={(e) => handleAppTokenLinkChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* App Token 输入框 */}
                <Input
                  type="text"
                  placeholder="BITABLE_APP_TOKEN（或从上方链接/下方表格链接自动提取）"
                  value={appToken}
                  onChange={(e) => setAppToken(e.target.value)}
                  className="font-mono text-sm"
                />
                {appTokenLink && appToken && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    已从链接提取 App Token
                  </p>
                )}
                {!appTokenLink && appToken && (
                  <p className="text-xs text-gray-500 mt-1">
                    提示：也可以从下方表格链接中自动提取 BITABLE_APP_TOKEN
                  </p>
                )}
              </div>
            </div>

            {/* 为每个表格提供独立的链接输入框（只配置 Table ID） */}
            <div className="space-y-6 border-t pt-6">
              <div className="text-sm font-medium text-gray-700 mb-4">
                表格配置 <span className="text-red-500">*</span>
              </div>
              
              {REQUIRED_TABLES.map((table) => {
                const state = tableLinks[table.key];
                if (!state) return null;

                return (
                  <div key={table.key} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <label className="text-sm font-medium mb-1 block text-gray-900">
                        {table.label}
                        <span className="text-gray-500 text-xs font-normal ml-2">
                          {table.description}
                        </span>
                      </label>
                      
                      {/* 表格链接输入框 */}
                      <div className="relative mb-3">
                        <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder={`粘贴 ${table.label} 的表格链接，例如：https://example.feishu.cn/base/xxx?table=xxx`}
                          value={state.link}
                          onChange={(e) => handleTableLinkChange(table.key, e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* 提取结果显示 */}
                      {state.extractedInfo && (state.extractedInfo.tableId || state.extractedInfo.appToken) ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                          <div className="flex items-start gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 text-xs text-blue-800">
                              已从链接自动提取数据
                            </div>
                          </div>
                          
                          {/* 如果链接中包含 App Token，显示已自动填充提示 */}
                          {state.extractedInfo.appToken && (
                            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="flex items-center gap-1 text-green-700 mb-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="font-medium">BITABLE_APP_TOKEN 已自动填充</span>
                              </div>
                              <div className="text-green-600 font-mono text-xs">
                                {state.extractedInfo.appToken}
                              </div>
                              <div className="text-green-600 mt-1">
                                已自动填充到上方的 BITABLE_APP_TOKEN 字段（所有表格共享）
                              </div>
                            </div>
                          )}
                          
                          {/* Table ID 显示 */}
                          {state.extractedInfo.tableId && (
                            <div>
                              <label className="text-xs font-medium text-blue-700 mb-1 block">
                                TABLE_ID <span className="text-red-500">*</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={state.tableId}
                                  onChange={(e) => handleTableFieldChange(table.key, "tableId", e.target.value)}
                                  className="bg-white font-mono text-xs h-8"
                                />
                                {state.tableId === state.extractedInfo.tableId && (
                                  <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : state.link && !state.extractedInfo?.tableId ? (
                        <div className="text-xs text-amber-600 flex items-center gap-1 mb-3">
                          <XCircle className="w-3 h-3" />
                          无法从链接中提取 Table ID，请检查链接是否包含 ?table=xxx 参数
                        </div>
                      ) : (
                        // 如果没有链接或未提取，显示手动输入字段
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">
                            TABLE_ID <span className="text-red-500">*</span>
                            <span className="text-gray-500 text-xs font-normal ml-2">
                              (此表格将使用上方的 BITABLE_APP_TOKEN)
                            </span>
                          </label>
                          <Input
                            type="text"
                            placeholder="手动输入 Table ID 或粘贴链接自动提取"
                            value={state.tableId}
                            onChange={(e) => handleTableFieldChange(table.key, "tableId", e.target.value)}
                            className="text-xs h-8 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 连接测试结果 */}
            {testResult && (
              <div
                className={`p-4 rounded-md border ${
                  testResult.success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {testResult.success ? "连接测试成功" : "连接测试失败"}
                    </div>
                    <div className="text-sm whitespace-pre-line">
                      {testResult.message}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 通用消息提示 */}
            {message && !testResult && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.includes("成功")
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {message}
              </div>
            )}

            {/* 按钮组 */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleTestConnection}
                disabled={testing || loading}
                variant="outline"
                className="flex-1"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <TestTube2 className="w-4 h-4 mr-2" />
                    连接测试
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || testing}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存配置"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI 设置 Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>AI 设置</CardTitle>
            <CardDescription>
              配置火山方舟 Ark AI 参数
              <br />
              <span className="text-xs text-amber-600 mt-1 block">
                注意：当前使用 localStorage 存储配置，Phase 2 将迁移至 Tauri secure storage
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ARK_API_KEY */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                ARK_API_KEY <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="请输入火山方舟 Ark API Key"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                注意：API Key 将不会在前端日志中暴露
              </p>
            </div>

            {/* ARK_BASE_URL */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                ARK_BASE_URL <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="例如：https://ark.cn-beijing.volces.com/api/v3"
                value={aiBaseUrl}
                onChange={(e) => setAiBaseUrl(e.target.value)}
              />
            </div>

            {/* ARK_MODEL_ID */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                ARK_MODEL_ID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="例如：doubao-pro"
                value={aiModelId}
                onChange={(e) => setAiModelId(e.target.value)}
              />
            </div>

            {/* AI_REQUEST_TIMEOUT */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                AI_REQUEST_TIMEOUT（秒）
              </label>
              <Input
                type="number"
                min="1"
                placeholder="默认：60"
                value={aiRequestTimeout}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0) {
                    setAiRequestTimeout(value);
                  } else if (e.target.value === "") {
                    setAiRequestTimeout(60);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                请求超时时间（秒），默认 60 秒
              </p>
            </div>

            {/* AI 连接测试结果 */}
            {aiTestResult && (
              <div
                className={`p-4 rounded-md border ${
                  aiTestResult.success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {aiTestResult.success ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {aiTestResult.success ? "AI 连接测试成功" : "AI 连接测试失败"}
                    </div>
                    <div className="text-sm whitespace-pre-line">
                      {aiTestResult.message}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI 配置通用消息提示 */}
            {aiMessage && !aiTestResult && (
              <div
                className={`p-3 rounded-md text-sm ${
                  aiMessage.includes("成功")
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {aiMessage}
              </div>
            )}

            {/* AI 配置按钮组 */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleTestAiConnection}
                disabled={aiTesting || aiLoading}
                variant="outline"
                className="flex-1"
              >
                {aiTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <TestTube2 className="w-4 h-4 mr-2" />
                    AI 连接测试
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveAiConfig}
                disabled={aiLoading || aiTesting}
                className="flex-1"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存 AI 配置"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}