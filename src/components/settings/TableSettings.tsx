import { useState, useEffect } from "react";
import { loadFeishuConfig, getBitableTables, saveFeishuConfig, BitableTable, TableConfig } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Loader2, RefreshCw, CheckCircle2, Database } from "lucide-react";

export default function TableSettings() {
  const [tables, setTables] = useState<BitableTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 加载配置和表格列表
  useEffect(() => {
    loadConfigAndTables();
  }, []);

  const loadConfigAndTables = async () => {
    const config = loadFeishuConfig();
    if (config && config.tableId) {
      setSelectedTableId(config.tableId);
    }
    
    if (config && config.appToken) {
      await loadTables(config.appToken);
    }
  };

  const loadTables = async (appToken?: string) => {
    const config = loadFeishuConfig();
    const token = appToken || config?.appToken;
    
    if (!token) {
      setMessage("请先在飞书设置中配置 BITABLE_APP_TOKEN");
      return;
    }

    setLoadingTables(true);
    setMessage("");
    
    try {
      const tablesList = await getBitableTables(token);
      setTables(tablesList);
      
      // 如果还没有选中表格，尝试自动选择 Answers 表
      if (!selectedTableId && tablesList.length > 0) {
        const answersTable = tablesList.find(
          (t) => t.name.toLowerCase().includes("answer") || 
                t.name.toLowerCase().includes("答案") ||
                t.name === "Answers"
        );
        if (answersTable) {
          setSelectedTableId(answersTable.table_id);
        } else if (config?.tableId) {
          setSelectedTableId(config.tableId);
        }
      }
    } catch (error: any) {
      console.error("加载表格列表失败:", error);
      setMessage(`加载表格列表失败: ${error.message || error}`);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTableId) {
      setMessage("请选择一个表格");
      return;
    }

    const config = loadFeishuConfig();
    if (!config || !config.appToken) {
      setMessage("请先在飞书设置中配置飞书凭证和 BITABLE_APP_TOKEN");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // 更新配置中的 tableId
      const updatedTables: TableConfig[] = config.tables || [];
      
      // 查找或创建 answers 表格配置
      let answersTableIndex = updatedTables.findIndex(
        (t) => t.name === "answers" || t.name.toLowerCase().includes("answer")
      );
      
      if (answersTableIndex >= 0) {
        // 更新现有配置
        updatedTables[answersTableIndex].tableId = selectedTableId;
      } else {
        // 添加新配置
        updatedTables.push({
          name: "answers",
          appToken: config.appToken,
          tableId: selectedTableId,
        });
      }

      await saveFeishuConfig({
        ...config,
        tableId: selectedTableId,
        tables: updatedTables,
      });

      setMessage("表格选择已保存！");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(`保存失败: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          表格选择
        </CardTitle>
        <CardDescription>
          选择要使用的 Answers 表格（包含"问题"、"标准回答"、"状态"等字段）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              当前已选择表格：{selectedTableId ? (
                <span className="font-mono text-blue-600">{selectedTableId}</span>
              ) : (
                <span className="text-gray-400">未选择</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              const config = loadFeishuConfig();
              if (config?.appToken) {
                loadTables(config.appToken);
              }
            }}
            disabled={loadingTables}
            variant="outline"
            size="sm"
          >
            {loadingTables ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                加载中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新列表
              </>
            )}
          </Button>
        </div>

        {loadingTables ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
            <span className="text-gray-600">正在加载表格列表...</span>
          </div>
        ) : tables.length > 0 ? (
          <div className="space-y-2">
            {tables.map((table) => (
              <label
                key={table.table_id}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTableId === table.table_id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="table"
                  value={table.table_id}
                  checked={selectedTableId === table.table_id}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-5 h-5 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{table.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">{table.table_id}</div>
                </div>
                {selectedTableId === table.table_id && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                )}
                {(table.name.toLowerCase().includes("answer") || 
                  table.name.toLowerCase().includes("答案")) && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                    推荐
                  </span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="mb-2">暂无表格数据</p>
            <p className="text-sm text-gray-400">
              请确保已在飞书设置中配置 BITABLE_APP_TOKEN，然后点击"刷新列表"
            </p>
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.includes("成功") || message.includes("已保存")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !selectedTableId || loadingTables}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存选择"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

