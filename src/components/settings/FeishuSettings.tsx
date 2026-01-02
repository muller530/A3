import { useState, useEffect } from "react";
import { saveFeishuConfig, loadFeishuConfig, testConnection, TableConfig } from "../../lib/api";
import { extractBitableInfo } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { TestTube2, CheckCircle2, XCircle, Loader2, Link2, Cloud } from "lucide-react";

// 定义需要的表格列表
const REQUIRED_TABLES = [
  { key: "answers", label: "ANSWERS 表格", description: "答案数据表" },
  { key: "products", label: "PRODUCTS 表格", description: "产品信息表（可选，用于显示产品详细信息）" },
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

export default function FeishuSettings() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [appToken, setAppToken] = useState("");
  const [appTokenLink, setAppTokenLink] = useState("");
  const [tableLinks, setTableLinks] = useState<Record<string, TableLinkState>>(() => {
    const initial: Record<string, TableLinkState> = {};
    REQUIRED_TABLES.forEach((table) => {
      initial[table.key] = {
        link: "",
        extractedInfo: null,
        appToken: "",
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

  // 从本地存储加载已保存的配置
  useEffect(() => {
    const savedConfig = loadFeishuConfig();
    if (savedConfig) {
      setAppId(savedConfig.appId || "");
      setAppSecret(savedConfig.appSecret || "");
      
      if (savedConfig.appToken) {
        setAppToken(savedConfig.appToken);
      }
      
      if (savedConfig.tables && savedConfig.tables.length > 0) {
        const updatedLinks = { ...tableLinks };
        savedConfig.tables.forEach((table) => {
          // 精确匹配表格名称
          const tableKey = REQUIRED_TABLES.find(
            (rt) => rt.key === table.name || 
                   rt.key === table.name.toLowerCase() ||
                   rt.label.toLowerCase().includes(table.name.toLowerCase())
          )?.key;
          
          if (tableKey && updatedLinks[tableKey]) {
            updatedLinks[tableKey] = {
              ...updatedLinks[tableKey],
              tableId: table.tableId,
            };
          }
        });
        setTableLinks(updatedLinks);
      } else if (savedConfig.tableId) {
        // 兼容旧版本：只有 tableId 时，默认设置为 answers 表格
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
  }, []);

  const handleAppTokenLinkChange = (link: string) => {
    setAppTokenLink(link);
    
    if (link && link.trim()) {
      const info = extractBitableInfo(link);
      if (info.appToken) {
        setAppToken(info.appToken);
      }
    }
  };

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
      
      if (link && link.trim()) {
        const info = extractBitableInfo(link);
        updated[tableKey].extractedInfo = info;
        
        if (info.tableId) {
          updated[tableKey].tableId = info.tableId;
        }
        
        if (info.appToken && !appToken) {
          setAppToken(info.appToken);
        }
      } else {
        updated[tableKey].extractedInfo = null;
      }
      
      return updated;
    });
  };

  const handleTableFieldChange = (tableKey: string, field: "appToken" | "tableId", value: string) => {
    setTableLinks((prev) => {
      const updated = { ...prev };
      if (updated[tableKey]) {
        updated[tableKey][field] = value;
      }
      return updated;
    });
  };

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

  const handleSave = async () => {
    // 检查是否为本地模式（只有 appToken 和 tableId，没有 appId 和 appSecret）
    const isLocalMode = !appId || !appSecret;

    if (isLocalMode) {
      // 本地模式：只需要 appToken 和至少一个 tableId
      if (!appToken) {
        setMessage("请配置 BITABLE_APP_TOKEN（应用级别，所有表格共享）");
        setTestResult(null);
        return;
      }

      const missingTables: string[] = [];
      REQUIRED_TABLES.forEach((table) => {
        const state = tableLinks[table.key];
        // products 表格是可选的，其他表格是必填的
        if (table.key !== "products" && !state?.tableId) {
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
        const tables: TableConfig[] = REQUIRED_TABLES.map((table) => {
          const state = tableLinks[table.key];
          // 只保存已配置的表格
          if (state?.tableId) {
            return {
              name: table.key,
              appToken: appToken,
              tableId: state.tableId,
            };
          }
          return null;
        }).filter((table): table is TableConfig => table !== null);

        const firstTable = tables[0];

        await saveFeishuConfig({
          appId: "", // 本地模式下为空
          appSecret: "", // 本地模式下为空
          appToken: appToken,
          tableId: firstTable.tableId,
          tables,
        });
        
        setMessage("配置保存成功！注意：当前为本地模式，只能使用缓存数据，无法同步最新数据。如需同步功能，请配置完整的飞书凭证（App ID 和 App Secret）");
      } catch (error: any) {
        setMessage(`保存失败: ${error.message || error}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 完整模式：需要所有配置
    if (!appToken) {
      setMessage("请配置 BITABLE_APP_TOKEN（应用级别，所有表格共享）");
      setTestResult(null);
      return;
    }

    const missingTables: string[] = [];
    REQUIRED_TABLES.forEach((table) => {
      const state = tableLinks[table.key];
      // products 表格是可选的，其他表格是必填的
      if (table.key !== "products" && !state?.tableId) {
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
      const tables: TableConfig[] = REQUIRED_TABLES.map((table) => {
        const state = tableLinks[table.key];
        // 只保存已配置的表格
        if (state?.tableId) {
          return {
            name: table.key,
            appToken: appToken,
            tableId: state.tableId,
          };
        }
        return null;
      }).filter((table): table is TableConfig => table !== null);

      const firstTable = tables[0];

      await saveFeishuConfig({
        appId,
        appSecret,
        appToken: appToken,
        tableId: firstTable.tableId,
        tables,
      });
      
      setMessage("配置保存成功！");
    } catch (error: any) {
      setMessage(`保存失败: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          飞书应用配置
        </CardTitle>
        <CardDescription>
          配置飞书应用凭证和多维表格信息
          <br />
          <span className="text-xs text-amber-600 mt-1 block">
            注意：当前使用 localStorage 存储配置，Phase 2 将迁移至 Tauri secure storage
          </span>
          <br />
          <span className="text-xs text-blue-600 mt-1 block">
            提示：如果无法配置 App ID 和 App Secret，可以仅配置 App Token 和 Table ID 使用本地模式（只能查看缓存数据，无法同步最新数据）
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FEISHU_APP_ID */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            FEISHU_APP_ID <span className="text-gray-500 text-xs font-normal">(可选，用于同步功能)</span>
          </label>
          <Input
            type="text"
            placeholder="请输入飞书应用 App ID（留空则使用本地模式）"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          {!appId && (
            <p className="text-xs text-blue-600 mt-1">
              本地模式：不填写 App ID 和 App Secret 时，只能使用缓存数据，无法同步最新数据
            </p>
          )}
        </div>

        {/* FEISHU_APP_SECRET */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            FEISHU_APP_SECRET <span className="text-gray-500 text-xs font-normal">(可选，用于同步功能)</span>
          </label>
          <Input
            type="password"
            placeholder="请输入飞书应用 App Secret（留空则使用本地模式）"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
          />
          {!appSecret && (
            <p className="text-xs text-blue-600 mt-1">
              本地模式：不填写 App ID 和 App Secret 时，只能使用缓存数据，无法同步最新数据
            </p>
          )}
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

        {/* 表格配置 */}
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
                    {table.key === "products" && (
                      <span className="text-gray-500 text-xs font-normal ml-2">(可选)</span>
                    )}
                    <span className="text-gray-500 text-xs font-normal ml-2">
                      {table.description}
                    </span>
                  </label>
                  
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

                  {state.extractedInfo && (state.extractedInfo.tableId || state.extractedInfo.appToken) ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-3">
                      <div className="flex items-start gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 text-xs text-blue-800">
                          已从链接自动提取数据
                        </div>
                      </div>
                      
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
                      
                      {state.extractedInfo.tableId && (
                        <div>
                          <label className="text-xs font-medium text-blue-700 mb-1 block">
                            TABLE_ID {table.key !== "products" && <span className="text-red-500">*</span>}
                            {table.key === "products" && <span className="text-gray-500 text-xs font-normal ml-1">(可选)</span>}
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
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        TABLE_ID {table.key !== "products" && <span className="text-red-500">*</span>}
                        {table.key === "products" && <span className="text-gray-500 text-xs font-normal ml-1">(可选)</span>}
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
  );
}
