import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listAnswers, loadFeishuConfig, getBitableTables, Answer, BitableTable, optimizeAnswerWithAI, reviewAnswerWithAI, checkAnswerRisk, updateAnswerToFeishu } from "../lib/api";
import { extractOptimizedAnswer, extractReviewResult, ReviewResult, isValidFeishuRecordId, getFeishuRecordId } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { LogOut, Search, Eye, Loader2, AlertCircle, FileText, RefreshCw, Sparkles, Shield, AlertTriangle, CheckCircle2, Copy, ThumbsUp, ThumbsDown, Edit } from "lucide-react";

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
  const [optimizing, setOptimizing] = useState(false); // AI 优化中
  const [reviewing, setReviewing] = useState(false); // AI 审核中
  const [checkingRisk, setCheckingRisk] = useState(false); // 风险检测中
  const [optimizedResult, setOptimizedResult] = useState<{ answerText: string; explanationText?: string } | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [riskResult, setRiskResult] = useState<{ hasRisk: boolean; reason: string } | null>(null);
  const [submitting, setSubmitting] = useState(false); // 提交中
  const [submitMessage, setSubmitMessage] = useState<string>(""); // 提交消息
  const [draftContent, setDraftContent] = useState<string>(""); // 草稿内容
  const [showDraftEditor, setShowDraftEditor] = useState(false); // 是否显示草稿编辑器
  const [aiRatings, setAiRatings] = useState<Record<string, { type: "optimize" | "review"; rating: "up" | "down" }>>({}); // AI 评价
  const [copySuccess, setCopySuccess] = useState<string | null>(null); // 复制成功提示
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  // 页面加载时不自动同步数据，需要用户手动点击"同步数据"按钮
  // useEffect(() => {
  //   loadAnswersData();
  // }, []);

  // 搜索和过滤
  useEffect(() => {
    filterAnswers();
  }, [searchTerm, answers, showAll]);

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

  // 加载评价数据
  useEffect(() => {
    if (selectedAnswer?.record_id) {
      const ratings: Record<string, { type: "optimize" | "review"; rating: "up" | "down" }> = {};
      
      // 加载优化评价
      const optimizeKey = `ai_rating_${selectedAnswer.record_id}_optimize`;
      const optimizeSaved = localStorage.getItem(optimizeKey);
      if (optimizeSaved) {
        try {
          const ratingData = JSON.parse(optimizeSaved);
          ratings[`${selectedAnswer.record_id}_optimize`] = {
            type: "optimize",
            rating: ratingData.rating,
          };
        } catch (e) {
          console.error("加载优化评价数据失败:", e);
        }
      }
      
      // 加载审核评价
      const reviewKey = `ai_rating_${selectedAnswer.record_id}_review`;
      const reviewSaved = localStorage.getItem(reviewKey);
      if (reviewSaved) {
        try {
          const ratingData = JSON.parse(reviewSaved);
          ratings[`${selectedAnswer.record_id}_review`] = {
            type: "review",
            rating: ratingData.rating,
          };
        } catch (e) {
          console.error("加载审核评价数据失败:", e);
        }
      }
      
      setAiRatings(ratings);
    } else {
      setAiRatings({});
    }
  }, [selectedAnswer?.record_id]);

  // 保存评价
  const saveRating = (type: "optimize" | "review", rating: "up" | "down") => {
    if (!selectedAnswer?.record_id) return;
    
    const key = `ai_rating_${selectedAnswer.record_id}_${type}`;
    const ratingData = {
      feishu_record_id: selectedAnswer.record_id,
      answer_local_id: selectedAnswer.record_id, // 使用 record_id 作为本地ID
      ai_type: type,
      rating,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(key, JSON.stringify(ratingData));
    
    // 更新本地状态 - 立即更新以显示视觉反馈
    setAiRatings((prev) => ({
      ...prev,
      [`${selectedAnswer.record_id}_${type}`]: { type, rating },
    }));
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string, label: string = "内容") => {
    if (!text || !text.trim()) {
      setSubmitMessage(`没有可复制的${label}`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      // 显示成功提示
      setCopySuccess(label);
      setSubmitMessage(`已复制${label}到剪贴板`);
      // 2秒后清除按钮状态，3秒后清除消息
      setTimeout(() => setCopySuccess(null), 2000);
      setTimeout(() => setSubmitMessage(""), 3000);
    } catch (error: any) {
      setSubmitMessage(`复制失败: ${error.message || error.toString()}`);
    }
  };

  const handleViewDetail = (answer: Answer) => {
    setSelectedAnswer(answer);
    setDialogOpen(true);
    // 重置 AI 结果和草稿
    setOptimizedResult(null);
    setReviewResult(null);
    setRiskResult(null);
    setSubmitMessage("");
    setDraftContent("");
    setShowDraftEditor(false);
  };

  const handleOptimize = async () => {
    if (!selectedAnswer) return;
    setOptimizing(true);
    setOptimizedResult(null);
    try {
      const context = `问题：${selectedAnswer.question}\n产品：${selectedAnswer.product_name}\n场景：${selectedAnswer.scene}\n语气：${selectedAnswer.tone}`;
      const result = await optimizeAnswerWithAI(selectedAnswer.standard_answer, context);
      const extracted = extractOptimizedAnswer(result);
      setOptimizedResult(extracted);
    } catch (error: any) {
      setOptimizedResult({
        answerText: error?.toString() || "优化失败",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleReview = async () => {
    if (!selectedAnswer) return;
    setReviewing(true);
    setReviewResult(null);
    try {
      const context = `问题：${selectedAnswer.question}\n产品：${selectedAnswer.product_name}\n场景：${selectedAnswer.scene}\n语气：${selectedAnswer.tone}`;
      const result = await reviewAnswerWithAI(selectedAnswer.standard_answer, context);
      const extracted = extractReviewResult(result);
      setReviewResult(extracted);
    } catch (error: any) {
      setReviewResult({
        conclusion: "",
        judgmentExplanation: error?.toString() || "审核失败",
        riskPoints: "",
        rawText: error?.toString() || "审核失败",
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleCheckRisk = async () => {
    if (!selectedAnswer) return;
    setCheckingRisk(true);
    setRiskResult(null);
    try {
      const result = await checkAnswerRisk(selectedAnswer.standard_answer);
      setRiskResult(result);
    } catch (error: any) {
      setRiskResult({
        hasRisk: false,
        reason: error?.toString() || "检测失败",
      });
    } finally {
      setCheckingRisk(false);
    }
  };

  // 将 AI 回复作为草稿
  const handleUseAsDraft = () => {
    // 确定要作为草稿的内容：优先使用审核推荐回复，其次使用优化后的回复
    let contentToDraft = "";
    if (reviewResult?.recommendedReply) {
      contentToDraft = reviewResult.recommendedReply;
    } else if (optimizedResult?.answerText) {
      contentToDraft = optimizedResult.answerText;
    } else {
      setSubmitMessage("没有可用的内容");
      return;
    }
    
    setDraftContent(contentToDraft);
    setShowDraftEditor(true);
  };

  // 复制为客服回复（权限控制）
  const handleCopyToClipboard = async () => {
    if (!selectedAnswer) return;
    
    // 权限检查：如果审核状态不是"已通过"，非管理员不能复制
    const reviewStatus = selectedAnswer.raw_fields?.["审核状态"] || 
                        selectedAnswer.raw_fields?.["状态"] || 
                        selectedAnswer.enable_status || "";
    const isApproved = reviewStatus === "已通过" || reviewStatus === "已启用" || reviewStatus === "启用";
    
    if (!isApproved && role !== "admin") {
      setSubmitMessage("权限不足：只有审核状态为'已通过'的回复才能复制，或需要管理员权限");
      return;
    }
    
    // 确定要复制的内容：优先使用草稿，其次使用审核推荐回复，最后使用优化后的回复
    let contentToCopy = "";
    if (draftContent) {
      contentToCopy = draftContent;
    } else if (reviewResult?.recommendedReply) {
      contentToCopy = reviewResult.recommendedReply;
    } else if (optimizedResult?.answerText) {
      contentToCopy = optimizedResult.answerText;
    } else if (selectedAnswer.standard_answer) {
      contentToCopy = selectedAnswer.standard_answer;
    } else {
      setSubmitMessage("没有可复制的内容");
      return;
    }

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setSubmitMessage("已复制到剪贴板，可直接粘贴使用");
      setTimeout(() => setSubmitMessage(""), 3000);
    } catch (error: any) {
      setSubmitMessage(`复制失败: ${error.message || error.toString()}`);
    }
  };

  const handleSubmitToFeishu = async () => {
    // 权限检查：只有管理员可以写回
    if (role !== "admin") {
      setSubmitMessage("权限不足：只有管理员可以写回飞书");
      return;
    }

    if (!selectedAnswer) return;

    // 校验 feishu_record_id
    const feishuRecordId = getFeishuRecordId(selectedAnswer);
    if (!feishuRecordId) {
      setSubmitMessage("错误：无效的记录ID（必须以 rec 开头），无法写回飞书");
      return;
    }

    // 确定要提交的内容：优先使用草稿内容，其次使用审核推荐回复，最后使用优化后的回复
    let contentToSubmit = "";
    if (draftContent) {
      contentToSubmit = draftContent;
    } else if (reviewResult?.recommendedReply) {
      contentToSubmit = reviewResult.recommendedReply;
    } else if (optimizedResult?.answerText) {
      contentToSubmit = optimizedResult.answerText;
    } else {
      setSubmitMessage("没有可提交的内容，请先使用 AI 优化或审核功能");
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    try {
      const config = loadFeishuConfig();
      if (!config || !config.appToken) {
        throw new Error("未找到飞书配置，请先前往配置中心设置");
      }

      const tableId = selectedTableId || config.tableId;
      if (!tableId) {
        throw new Error("请先选择表格");
      }

      // 构建更新字段：标准回答 + 审核状态（管理员直接写为"已通过"）
      const fields: Record<string, any> = {
        "标准回答": contentToSubmit,
      };

      // 管理员写回时直接设置为"已通过"状态
      const reviewStatusFieldNames = ["审核状态", "状态", "启用状态", "enable_status", "status"];
      let statusFieldFound = false;
      
      // 从原始字段中查找审核状态字段名
      if (selectedAnswer.raw_fields) {
        for (const fieldName of reviewStatusFieldNames) {
          if (selectedAnswer.raw_fields[fieldName] !== undefined) {
            fields[fieldName] = "已通过";
            statusFieldFound = true;
            break;
          }
        }
      }
      
      // 如果没有找到，使用默认字段名
      if (!statusFieldFound) {
        fields["状态"] = "已通过";
      }

      // 设置最新版本来源
      // 判断来源：如果有草稿内容且被修改过，则为"人工调整"；否则根据AI结果类型判断
      let sourceValue = "";
      if (draftContent && draftContent !== contentToSubmit) {
        // 如果草稿内容与提交内容不同，说明用户修改过
        sourceValue = "人工调整";
      } else if (draftContent) {
        // 如果有草稿但内容未修改，判断原始来源
        if (reviewResult?.recommendedReply && draftContent === reviewResult.recommendedReply) {
          sourceValue = "AI审核";
        } else if (optimizedResult?.answerText && draftContent === optimizedResult.answerText) {
          sourceValue = "AI优化";
        } else {
          sourceValue = "人工调整";
        }
      } else {
        // 没有草稿，直接使用AI结果
        if (reviewResult?.recommendedReply && contentToSubmit === reviewResult.recommendedReply) {
          sourceValue = "AI审核";
        } else if (optimizedResult?.answerText && contentToSubmit === optimizedResult.answerText) {
          sourceValue = "AI优化";
        } else {
          sourceValue = "AI优化"; // 默认值
        }
      }
      
      const sourceFieldNames = ["最新版本来源", "版本来源", "来源"];
      let sourceFieldFound = false;
      if (selectedAnswer.raw_fields) {
        for (const fieldName of sourceFieldNames) {
          if (selectedAnswer.raw_fields[fieldName] !== undefined) {
            fields[fieldName] = sourceValue;
            sourceFieldFound = true;
            break;
          }
        }
      }
      if (!sourceFieldFound) {
        fields["最新版本来源"] = sourceValue;
      }

      // 使用 feishu_record_id 写回
      await updateAnswerToFeishu(
        config.appToken,
        tableId,
        feishuRecordId,
        fields
      );

      setSubmitMessage("提交成功！已写回飞书（状态：已通过）");
      // 清空草稿
      setDraftContent("");
      setShowDraftEditor(false);
    } catch (error: any) {
      setSubmitMessage(`提交失败: ${error.message || error.toString()}`);
    } finally {
      setSubmitting(false);
    }
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
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm text-gray-700">标准回答</div>
                    <Button
                      variant={copySuccess === "标准回答" ? "default" : "outline"}
                      size="sm"
                      onClick={() => copyToClipboard(selectedAnswer.standard_answer, "标准回答")}
                      className={`h-7 transition-all ${
                        copySuccess === "标准回答" 
                          ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                          : ""
                      }`}
                    >
                      {copySuccess === "标准回答" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </>
                      )}
                    </Button>
                  </div>
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
                {/* AI 功能区域 */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-sm text-gray-700">AI 功能</div>
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                      ⚠️ AI 建议仅供参考，不会直接影响知识库
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOptimize}
                      disabled={optimizing}
                    >
                      {optimizing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          优化中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI 优化
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReview}
                      disabled={reviewing}
                    >
                      {reviewing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          审核中...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          AI 审核
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckRisk}
                      disabled={checkingRisk}
                    >
                      {checkingRisk ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          检测中...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          风险检测
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI 优化结果 */}
                  {optimizedResult && (
                    <Card className="mb-4 border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">AI 优化结果</CardTitle>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRating("optimize", "up");
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                aiRatings[`${selectedAnswer?.record_id}_optimize`]?.rating === "up" 
                                  ? "bg-blue-500 text-white" 
                                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              }`}
                              title="有用"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRating("optimize", "down");
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                aiRatings[`${selectedAnswer?.record_id}_optimize`]?.rating === "down" 
                                  ? "bg-blue-500 text-white" 
                                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              }`}
                              title="不太合适"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-xs text-gray-700">优化后的客服回复</div>
                            <Button
                              variant={copySuccess === "优化后的回复" ? "default" : "outline"}
                              size="sm"
                              onClick={() => copyToClipboard(optimizedResult.answerText, "优化后的回复")}
                              className={`h-6 text-xs transition-all ${
                                copySuccess === "优化后的回复" 
                                  ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                                  : ""
                              }`}
                            >
                              {copySuccess === "优化后的回复" ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  复制
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="text-sm text-gray-900 bg-white p-3 rounded-md whitespace-pre-wrap border border-blue-200">
                            {optimizedResult.answerText}
                          </div>
                        </div>
                        {optimizedResult.explanationText && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">内部优化说明</div>
                            <div className="text-xs text-gray-600 bg-white p-2 rounded-md whitespace-pre-wrap border border-blue-200">
                              {optimizedResult.explanationText}
                            </div>
                          </div>
                        )}
                        {/* 只有管理员可以看到"作为回复草稿"按钮 */}
                        {role === "admin" && (
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleUseAsDraft}
                              className="w-full"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              作为回复草稿
                            </Button>
                          </div>
                        )}
                        {/* 普通用户显示复制按钮 */}
                        {role === "user" && (
                          <div className="pt-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => copyToClipboard(optimizedResult.answerText, "优化后的回复")}
                              className="w-full"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              复制为客服回复
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* AI 审核结果 */}
                  {reviewResult && (
                    <Card className={`mb-4 ${
                      reviewResult.conclusion === "合理" ? "border-green-200 bg-green-50" :
                      reviewResult.conclusion === "基本合理" ? "border-yellow-200 bg-yellow-50" :
                      reviewResult.conclusion === "需修改" ? "border-red-200 bg-red-50" :
                      "border-gray-200 bg-gray-50"
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">AI 审核结果</CardTitle>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRating("review", "up");
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                reviewResult.conclusion === "合理" 
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "up"
                                    ? "bg-green-500 text-white"
                                    : "bg-green-100 text-green-600 hover:bg-green-200"
                                  : reviewResult.conclusion === "基本合理"
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "up"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                                  : reviewResult.conclusion === "需修改"
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "up"
                                    ? "bg-red-500 text-white"
                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                  : aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "up"
                                    ? "bg-gray-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              title="有用"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRating("review", "down");
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                reviewResult.conclusion === "合理" 
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "down"
                                    ? "bg-green-500 text-white"
                                    : "bg-green-100 text-green-600 hover:bg-green-200"
                                  : reviewResult.conclusion === "基本合理"
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "down"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                                  : reviewResult.conclusion === "需修改"
                                  ? aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "down"
                                    ? "bg-red-500 text-white"
                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                  : aiRatings[`${selectedAnswer?.record_id}_review`]?.rating === "down"
                                    ? "bg-gray-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              title="不太合适"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {reviewResult.conclusion && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">审核结论</div>
                            <div className={`text-sm font-semibold p-2 rounded-md ${
                              reviewResult.conclusion === "合理" ? "bg-green-100 text-green-800" :
                              reviewResult.conclusion === "基本合理" ? "bg-yellow-100 text-yellow-800" :
                              reviewResult.conclusion === "需修改" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {reviewResult.conclusion}
                            </div>
                          </div>
                        )}
                        {reviewResult.judgmentExplanation && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">专业判断说明</div>
                            <div className="text-xs text-gray-900 bg-white p-2 rounded-md whitespace-pre-wrap border">
                              {reviewResult.judgmentExplanation}
                            </div>
                          </div>
                        )}
                        {reviewResult.riskPoints && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">潜在风险或注意点</div>
                            <div className="text-xs text-gray-900 bg-white p-2 rounded-md whitespace-pre-wrap border">
                              {reviewResult.riskPoints}
                            </div>
                          </div>
                        )}
                        {reviewResult.modificationReason && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">需修改原因</div>
                            <div className="text-xs text-gray-900 bg-white p-2 rounded-md whitespace-pre-wrap border border-red-200">
                              {reviewResult.modificationReason}
                            </div>
                          </div>
                        )}
                        {reviewResult.recommendedReply && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-xs text-gray-700">修改后推荐回复</div>
                              <Button
                                variant={copySuccess === "推荐回复" ? "default" : "outline"}
                                size="sm"
                                onClick={() => copyToClipboard(reviewResult.recommendedReply || "", "推荐回复")}
                                className={`h-6 text-xs transition-all ${
                                  copySuccess === "推荐回复" 
                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                                    : ""
                                }`}
                              >
                                {copySuccess === "推荐回复" ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    已复制
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    复制
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="text-sm text-gray-900 bg-white p-3 rounded-md whitespace-pre-wrap border border-green-200">
                              {reviewResult.recommendedReply}
                            </div>
                          </div>
                        )}
                        {reviewResult.suggestion && (
                          <div>
                            <div className="font-medium text-xs text-gray-700 mb-1">修改建议</div>
                            <div className="text-xs text-gray-900 bg-white p-2 rounded-md whitespace-pre-wrap border border-yellow-200">
                              {reviewResult.suggestion}
                            </div>
                          </div>
                        )}
                        {reviewResult.recommendedReply && (
                          <>
                            {/* 只有管理员可以看到"作为回复草稿"按钮 */}
                            {role === "admin" && (
                              <div className="pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleUseAsDraft}
                                  className="w-full"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  作为回复草稿
                                </Button>
                              </div>
                            )}
                            {/* 普通用户显示复制按钮 */}
                            {role === "user" && (
                              <div className="pt-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => copyToClipboard(reviewResult.recommendedReply || "", "推荐回复")}
                                  className="w-full"
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  复制为客服回复
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 风险检测结果 */}
                  {riskResult && (
                    <Card className={`mb-4 ${
                      riskResult.hasRisk ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
                    }`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">风险检测结果</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-sm font-semibold mb-2 ${
                          riskResult.hasRisk ? "text-red-800" : "text-green-800"
                        }`}>
                          {riskResult.hasRisk ? "⚠️ 存在风险" : "✅ 无风险"}
                        </div>
                        {riskResult.reason && (
                          <div className="text-xs text-gray-700 bg-white p-2 rounded-md border whitespace-pre-wrap">
                            {riskResult.reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
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

                {/* 草稿编辑器 */}
                {showDraftEditor && (
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-sm text-gray-700 mb-2">回复草稿</div>
                        <textarea
                          value={draftContent}
                          onChange={(e) => setDraftContent(e.target.value)}
                          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={role === "admin" ? "你可以在此基础上修改后再提交，提交后将直接写回飞书并设置为已通过状态" : "你可以在此基础上修改后复制使用"}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          {role === "admin" 
                            ? "你可以在此基础上修改后再提交，提交后将直接写回飞书并设置为已通过状态"
                            : "你可以在此基础上修改后复制使用"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          {submitMessage && (
                            <div className={`text-sm ${
                              submitMessage.includes("成功") || submitMessage.includes("已复制") || submitMessage.includes("已提交")
                                ? "text-green-600 flex items-center gap-1" 
                                : "text-red-600"
                            }`}>
                              {(submitMessage.includes("成功") || submitMessage.includes("已复制") || submitMessage.includes("已提交")) && (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              {submitMessage}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* 管理员：显示采纳并提交按钮 */}
                          {role === "admin" && (
                            <Button
                              onClick={handleSubmitToFeishu}
                              disabled={submitting || !draftContent.trim()}
                              className="flex-shrink-0"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  提交中...
                                </>
                              ) : (
                                "采纳并提交"
                              )}
                            </Button>
                          )}
                          {/* 普通用户：显示复制按钮 */}
                          {role === "user" && (
                            <Button
                              onClick={handleCopyToClipboard}
                              variant="default"
                              className="flex-shrink-0"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              复制为客服回复
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮区域（当没有草稿编辑器时显示） */}
                {!showDraftEditor && (optimizedResult?.answerText || reviewResult?.recommendedReply) && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        {submitMessage && (
                          <div className={`text-sm ${
                            submitMessage.includes("成功") || submitMessage.includes("已复制")
                              ? "text-green-600 flex items-center gap-1" 
                              : "text-red-600"
                          }`}>
                            {(submitMessage.includes("成功") || submitMessage.includes("已复制")) && (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            {submitMessage}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {/* 普通用户：显示复制按钮 */}
                        {role === "user" && (
                          <Button
                            onClick={handleCopyToClipboard}
                            variant="default"
                            className="flex-shrink-0"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            复制为客服回复
                          </Button>
                        )}
                        {/* 管理员：显示写回按钮（已废弃，应该使用草稿编辑器） */}
                        {role === "admin" && (
                          <Button
                            onClick={handleUseAsDraft}
                            variant="outline"
                            className="flex-shrink-0"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            编辑后提交
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
