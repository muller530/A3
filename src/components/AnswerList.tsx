import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listAnswers, loadFeishuConfig, getBitableTables, Answer, BitableTable } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogOut, Search, Eye, Loader2, AlertCircle, FileText, RefreshCw } from "lucide-react";

type LoadingState = "idle" | "loading" | "success" | "error";

export default function AnswerList() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<Answer[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false); // 调试模式：显示所有数据
  const [tables, setTables] = useState<BitableTable[]>([]); // 表格列表
  const [selectedTableId, setSelectedTableId] = useState<string>(""); // 选中的表格ID
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  // 页面加载时不自动同步数据，需要用户手动点击"同步数据"按钮
  // useEffect(() => {
  //   loadAnswersData();
  // }, []);

  // 搜索和过滤
  useEffect(() => {
    filterAnswers();
  }, [searchTerm, answers]);

  // 加载表格列表
  const loadTables = async () => {
    try {
      const config = loadFeishuConfig();
      if (!config || !config.appToken) {
        return;
      }
      const tablesList = await getBitableTables(config.appToken);
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
        } else if (config.tableId) {
          // 使用配置中的 tableId
          setSelectedTableId(config.tableId);
        }
      }
    } catch (error) {
      console.error("加载表格列表失败:", error);
    }
  };

  const loadAnswersData = async () => {
    setLoadingState("loading");
    setErrorMessage("");

    try {
      // 从设置中心获取配置
      const config = loadFeishuConfig();
      if (!config) {
        setLoadingState("error");
        setErrorMessage("未找到飞书配置，请先前往配置中心设置");
        return;
      }

      if (!config.appToken) {
        setLoadingState("error");
        setErrorMessage("飞书配置不完整，请检查 App Token 是否已配置");
        return;
      }

      // 使用选中的表格ID，如果没有则使用配置中的
      const tableId = selectedTableId || config.tableId;
      if (!tableId) {
        setLoadingState("error");
        setErrorMessage("请先选择 Answers 表格");
        // 自动加载表格列表
        await loadTables();
        return;
      }

      // 调用后端 list_answers 命令
      const data = await listAnswers(config.appToken, tableId);
      setAnswers(data);
      setLoadingState("success");
      
      // 调试：输出字段信息到控制台
      if (data.length > 0 && data[0].raw_fields) {
        console.log("=== 飞书字段调试信息 ===");
        console.log("所有字段名：", Object.keys(data[0].raw_fields));
        console.log("第一条记录的完整字段数据：", data[0].raw_fields);
        console.log("状态字段映射结果：", data[0].enable_status);
        console.log("====================");
      }
    } catch (error: any) {
      setLoadingState("error");
      setErrorMessage(error.message || "加载答案数据失败，请检查网络连接和配置");
      console.error("加载答案数据失败:", error);
    }
  };

  // 页面加载时加载表格列表
  useEffect(() => {
    loadTables();
  }, []);

  const filterAnswers = () => {
    let filtered = [...answers];

    // 默认过滤：状态=启用（除非开启显示所有模式）
    if (!showAll) {
      filtered = filtered.filter((answer) => {
        const status = answer.enable_status.toLowerCase().trim();
        // 支持多种"启用"状态的表示方式
        return (
          status === "启用" ||
          status === "enable" ||
          status === "enabled" ||
          status === "true" ||
          status === "1" ||
          status === "是" ||
          status === "yes" ||
          status === "已启用" ||
          status === "启用中" ||
          status === "active"
        );
      });
    }

    // 搜索过滤：问题、标准回答、对应产品
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((answer) => {
        return (
          answer.question.toLowerCase().includes(term) ||
          answer.standard_answer.toLowerCase().includes(term) ||
          answer.product_name.toLowerCase().includes(term)
        );
      });
    }

    setFilteredAnswers(filtered);
  };

  const handleViewDetail = (answer: Answer) => {
    setSelectedAnswer(answer);
    setDialogOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGoToConfig = () => {
    navigate("/config");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">知识库（Answers）</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">角色: {role}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>

        {/* 表格选择器 */}
        {tables.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>选择表格</CardTitle>
              <CardDescription>请选择 Answers 表格（包含"问题"、"标准回答"、"状态"等字段）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tables.map((table) => (
                  <label
                    key={table.table_id}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTableId === table.table_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="table"
                      value={table.table_id}
                      checked={selectedTableId === table.table_id}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{table.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{table.table_id}</div>
                    </div>
                    {(table.name.toLowerCase().includes("answer") || 
                      table.name.toLowerCase().includes("答案")) && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        推荐
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>答案列表</CardTitle>
                <CardDescription>
                  {loadingState === "success" && (
                    <>
                      共 {answers.length} 条数据
                      {!showAll && (
                        <>，其中状态为"启用"的 {answers.filter(a => {
                          const status = a.enable_status.toLowerCase().trim();
                          return (
                            status === "启用" ||
                            status === "enable" ||
                            status === "enabled" ||
                            status === "true" ||
                            status === "1" ||
                            status === "是" ||
                            status === "yes" ||
                            status === "已启用" ||
                            status === "启用中" ||
                            status === "active"
                          );
                        }).length} 条</>
                      )}
                      {showAll && "（显示全部）"}
                      {searchTerm && `，搜索后显示 ${filteredAnswers.length} 条`}
                    </>
                  )}
                  {loadingState === "idle" && '点击"同步数据"按钮从飞书拉取最新数据'}
                  {loadingState === "error" && '数据加载失败，请点击"同步数据"重试'}
                </CardDescription>
              </div>
              <Button
                onClick={loadAnswersData}
                disabled={loadingState === "loading" || !selectedTableId}
                variant="outline"
                size="sm"
              >
                {loadingState === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    同步数据
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 搜索框和调试按钮 */}
            {loadingState === "success" && (
              <div className="mb-4 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="搜索问题、标准回答或对应产品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={showAll}
                      onChange={(e) => setShowAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-600">显示所有数据（包括非启用状态）</span>
                  </label>
                  {answers.length > 0 && answers[0].enable_status === "-" && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                      <span className="font-medium">提示：</span> 状态字段未识别，请点击任意记录"查看详情"→展开"调试信息"查看原始字段名
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 初始态：提示用户同步数据 */}
            {loadingState === "idle" && (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium mb-2">尚未同步数据</p>
                <p className="text-gray-500 text-sm text-center max-w-md mb-4">
                  请点击右上角的"同步数据"按钮，从飞书多维表格拉取最新数据
                </p>
                <Button onClick={loadAnswersData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  同步数据
                </Button>
              </div>
            )}

            {/* 加载态 */}
            {loadingState === "loading" && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-600">正在从飞书同步答案数据...</p>
              </div>
            )}

            {/* 错误态 */}
            {loadingState === "error" && (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-red-600 font-medium mb-2">加载失败</p>
                <p className="text-gray-600 text-sm mb-4 text-center max-w-md">
                  {errorMessage}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={loadAnswersData}>
                    重试
                  </Button>
                  <Button onClick={handleGoToConfig}>
                    前往配置中心
                  </Button>
                </div>
              </div>
            )}

            {/* 空态 */}
            {loadingState === "success" && filteredAnswers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium mb-2">
                  {answers.length === 0 ? "暂无数据" : "没有符合条件的答案"}
                </p>
                {answers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    请确保飞书多维表格中有数据，且状态为"启用"
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm text-center max-w-md">
                    请尝试调整搜索关键词
                  </p>
                )}
              </div>
            )}

            {/* 成功态：列表展示 */}
            {loadingState === "success" && filteredAnswers.length > 0 && (
              <div className="space-y-3">
                {filteredAnswers.map((answer) => (
                  <div
                    key={answer.record_id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium mb-2 text-gray-900">
                          {answer.question !== "-" ? answer.question : "未命名问题"}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {answer.standard_answer !== "-" ? answer.standard_answer : "无标准回答"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            answer.enable_status.toLowerCase().trim() === "启用" ||
                            answer.enable_status.toLowerCase().trim() === "enable" ||
                            answer.enable_status.toLowerCase().trim() === "enabled"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            状态: {answer.enable_status}
                          </span>
                          {answer.product_name !== "-" && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              产品: {answer.product_name}
                            </span>
                          )}
                          {answer.scene !== "-" && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              场景: {answer.scene}
                            </span>
                          )}
                          {answer.tone !== "-" && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              语气: {answer.tone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(answer)}
                        className="ml-4"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        查看详情
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详情对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>答案详情</DialogTitle>
              <DialogDescription>查看完整的答案信息</DialogDescription>
            </DialogHeader>
            {selectedAnswer && (
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-sm text-gray-700 mb-1">问题</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedAnswer.question}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-700 mb-1">标准回答</div>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                    {selectedAnswer.standard_answer}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">状态</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedAnswer.enable_status}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">使用场景</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedAnswer.scene}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">语气</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedAnswer.tone}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">对应产品</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedAnswer.product_name}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">产品ID</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                      {selectedAnswer.product_id}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1">记录ID</div>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                      {selectedAnswer.record_id}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <details className="cursor-pointer">
                    <summary className="font-medium text-sm text-gray-700 mb-2">
                      调试信息：查看原始字段数据
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="font-medium text-blue-800 mb-1">提示：</div>
                        <div className="text-blue-700">
                          如果状态字段显示为"-"，请查看下方的原始字段数据，找到实际的状态字段名。
                          <br />
                          常见字段名：状态、启用状态、enable_status、status 等
                        </div>
                      </div>
                      {selectedAnswer.raw_fields && (
                        <div className="text-xs bg-gray-100 p-3 rounded-md font-mono overflow-auto max-h-60">
                          <div className="font-medium mb-2 text-gray-700">原始字段数据：</div>
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(selectedAnswer.raw_fields, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="text-xs bg-gray-100 p-3 rounded-md font-mono overflow-auto max-h-60">
                        <div className="font-medium mb-2 text-gray-700">结构化数据：</div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedAnswer, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
