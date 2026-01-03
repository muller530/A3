import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listAnswers, loadFeishuConfig, getBitableTables, Answer, optimizeAnswerWithAI, reviewAnswerWithAI, checkAnswerRisk, updateAnswerToFeishu, createAnswerToFeishu, saveAnswersCache, loadAnswersCache, getBitableRecord, AnswerRecord, getAnswersData, openExternalUrl, canSyncToday, saveLastSyncTimeForUser } from "../lib/api";
import { extractOptimizedAnswer, extractReviewResult, ReviewResult, getFeishuRecordId, calculateAnswerMatchScore } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Search, Eye, Loader2, AlertCircle, FileText, RefreshCw, Sparkles, Shield, AlertTriangle, CheckCircle2, Copy, ThumbsUp, ThumbsDown, Edit, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Navigation from "./Navigation";

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
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null); // 最后同步时间
  const [productInfo, setProductInfo] = useState<AnswerRecord | null>(null); // 产品信息
  const [loadingProductInfo, setLoadingProductInfo] = useState(false); // 加载产品信息中
  const [productTableId, setProductTableId] = useState<string | null>(null); // 产品表格ID
  const [productInfoExpanded, setProductInfoExpanded] = useState(false); // 产品信息是否展开
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false); // 是否显示新增问题对话框
  const [newQuestion, setNewQuestion] = useState(""); // 新问题内容
  const [creatingQuestion, setCreatingQuestion] = useState(false); // 正在创建问题
  const [matchScores, setMatchScores] = useState<Record<string, number>>({}); // 匹配度分数
  const { role, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 页面加载时自动从缓存加载数据
  useEffect(() => {
    const loadCachedData = async () => {
      const config = loadFeishuConfig();
      if (!config || !config.appToken) {
        return;
      }

      const tableId = selectedTableId || config.tableId;
      if (!tableId) {
        // 如果没有表格ID，先加载表格列表
        await loadTables();
        return;
      }

      // 尝试从缓存加载数据
      const cache = loadAnswersCache(tableId);
      if (cache && cache.data.length > 0) {
        setAnswers(cache.data);
        setLoadingState("success");
        setLastSyncTime(cache.timestamp);
      } else {
        setLoadingState("idle");
        setLastSyncTime(null);
      }
    };

    loadCachedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId]);

  // 保存搜索历史到本地存储
  const saveSearchHistory = (term: string) => {
    if (!term.trim()) return;
    
    try {
      const STORAGE_KEY = "search_history";
      const MAX_HISTORY_ITEMS = 12;
      const stored = localStorage.getItem(STORAGE_KEY);
      let history: Array<{ term: string; count: number; lastUsed: number }> = stored ? JSON.parse(stored) : [];
      
      const existingIndex = history.findIndex(item => item.term === term);
      const now = Date.now();
      
      if (existingIndex >= 0) {
        history[existingIndex].count += 1;
        history[existingIndex].lastUsed = now;
      } else {
        history.push({
          term,
          count: 1,
          lastUsed: now,
        });
      }
      
      history = history
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastUsed - a.lastUsed;
        })
        .slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  // 如果从首页跳转过来并带有搜索关键词或选中答案ID
  useEffect(() => {
    const state = location.state as { searchTerm?: string; selectedAnswerId?: string; skipSaveHistory?: boolean } | null;
    
    // 处理搜索关键词
    if (state?.searchTerm) {
      const term = state.searchTerm.trim();
      setSearchTerm(term);
      // 如果是从首页跳转过来的，不重复保存搜索历史（首页已经保存过了）
      // 只有在答案列表页面直接搜索时才保存
      if (!state.skipSaveHistory) {
        saveSearchHistory(term);
      }
      // 清除 state，避免重复应用
      window.history.replaceState({}, document.title);
    }
    
    // 处理选中答案ID
    if (state?.selectedAnswerId && answers.length > 0) {
      const answer = answers.find(a => a.record_id === state.selectedAnswerId);
      if (answer) {
        setSelectedAnswer(answer);
        setDialogOpen(true);
        // 重置 AI 结果和草稿
        setOptimizedResult(null);
        setReviewResult(null);
        setRiskResult(null);
        setSubmitMessage("");
        setDraftContent("");
        setShowDraftEditor(false);
        // 清除 state，避免重复打开
        window.history.replaceState({}, document.title);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, answers]);

  // 搜索和过滤
  useEffect(() => {
    filterAnswers();
  }, [searchTerm, answers, showAll]);

  // 加载表格列表（用于查找产品表格和设置答案表格）
  const loadTables = async () => {
    try {
      const config = loadFeishuConfig();
      if (!config || !config.appToken) {
        return;
      }

      // 检查是否为本地模式（没有 appId 和 appSecret）
      const isLocalMode = !config.appId || !config.appSecret;
      
      if (isLocalMode) {
        // 本地模式：只能使用配置中的表格ID，无法获取表格列表
        if (config.tableId) {
          setSelectedTableId(config.tableId);
        }
        
        // 从配置中查找产品表格
        if (config.tables && config.tables.length > 0) {
          const productTableConfig = config.tables.find(
            (t) => t.name === "products" || t.name.toLowerCase().includes("product")
          );
          if (productTableConfig) {
            setProductTableId(productTableConfig.tableId);
          }
        }
        return;
      }

      // 完整配置模式：可以获取表格列表
      const tablesList = await getBitableTables(config.appToken);
      
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
      
      // 从配置中查找产品表格
      if (config.tables && config.tables.length > 0) {
        const productTableConfig = config.tables.find(
          (t) => t.name === "products" || t.name.toLowerCase().includes("product")
        );
        if (productTableConfig) {
          setProductTableId(productTableConfig.tableId);
        }
      }
      
      // 如果没有配置，尝试通过名称匹配查找（兼容旧版本）
      if (!productTableId) {
        const productTable = tablesList.find(
          (t) => t.name.toLowerCase().includes("product") || 
                t.name.toLowerCase().includes("产品") ||
                t.name.toLowerCase().includes("products")
        );
        if (productTable) {
          setProductTableId(productTable.table_id);
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

      // 检查是否为本地模式（没有 appId 和 appSecret）
      const isLocalMode = !config.appId || !config.appSecret;
      
      if (isLocalMode) {
        // 本地模式：只能使用缓存数据
        const cache = loadAnswersCache(tableId);
        if (cache && cache.data.length > 0) {
          setAnswers(cache.data);
          setLoadingState("success");
          setLastSyncTime(cache.timestamp);
          setErrorMessage("当前为本地模式，仅显示缓存数据。如需同步最新数据，请配置完整的飞书凭证（App ID 和 App Secret）");
        } else {
          setLoadingState("error");
          setErrorMessage("本地模式下无缓存数据。请配置完整的飞书凭证（App ID 和 App Secret）以同步数据，或联系管理员获取数据");
        }
        return;
      }

      // 完整配置模式：可以同步数据
      // 检查普通用户的同步频率限制（一天只能同步一次）
      const userId = currentUser?.id || "default";
      if (!canSyncToday(userId, role || null)) {
        // 今天已经同步过，使用缓存数据
        const cache = loadAnswersCache(tableId);
        if (cache && cache.data.length > 0) {
          setAnswers(cache.data);
          setLoadingState("success");
          setLastSyncTime(cache.timestamp);
          const lastSyncDate = new Date(cache.timestamp);
          const today = new Date();
          if (lastSyncDate.getDate() === today.getDate() && 
              lastSyncDate.getMonth() === today.getMonth() && 
              lastSyncDate.getFullYear() === today.getFullYear()) {
            setErrorMessage(`普通用户一天只能同步一次，今天已同步过（${lastSyncDate.toLocaleTimeString("zh-CN")}）。请明天再试或联系管理员。`);
          } else {
            setErrorMessage("普通用户一天只能同步一次，请明天再试或联系管理员。");
          }
        } else {
          setLoadingState("error");
          setErrorMessage("普通用户一天只能同步一次，且无缓存数据。请明天再试或联系管理员。");
        }
        return;
      }

      // 调用后端 list_answers 命令
      const data = await listAnswers(config.appToken, tableId);
      setAnswers(data);
      setLoadingState("success");
      
      // 保存到本地缓存
      saveAnswersCache(tableId, data);
      const syncTime = Date.now();
      setLastSyncTime(syncTime);
      
      // 保存普通用户的同步时间（用于限制一天只能同步一次）
      if (role === "user") {
        saveLastSyncTimeForUser(userId, syncTime);
      }
      
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
    const scores: Record<string, number> = {};

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

    // 搜索过滤：问题、标准回答、对应产品，并计算匹配度
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      
      // 计算每个答案的匹配度
      filtered.forEach((answer) => {
        const score = calculateAnswerMatchScore(term, answer);
        scores[answer.record_id] = score;
      });

      // 按匹配度排序
      filtered = filtered.sort((a, b) => {
        const scoreA = scores[a.record_id] || 0;
        const scoreB = scores[b.record_id] || 0;
        return scoreB - scoreA;
      });

      // 匹配度信息已保存到 matchScores，UI 中会显示提示
    }

    setMatchScores(scores);
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

  // 加载产品信息
  useEffect(() => {
    const loadProductInfo = async () => {
      if (!selectedAnswer?.product_id || selectedAnswer.product_id === "-" || !productTableId) {
        setProductInfo(null);
        setProductInfoExpanded(false);
        return;
      }

      // 切换产品时重置展开状态
      setProductInfoExpanded(false);

      setLoadingProductInfo(true);
      try {
        const config = loadFeishuConfig();
        if (!config || !config.appToken) {
          setProductInfo(null);
          return;
        }

        const productId = selectedAnswer.product_id;
        let productRecord: AnswerRecord | null = null;

        // 方法1: 如果 product_id 以 "rec" 开头，直接作为 record_id 使用
        if (productId.startsWith("rec")) {
          try {
            productRecord = await getBitableRecord(
              config.appToken,
              productTableId,
              productId
            );
          } catch (error) {
            console.log("直接使用 product_id 作为 record_id 失败，尝试通过字段查找");
          }
        }

        // 方法2: 如果方法1失败或 product_id 不是 record_id 格式，获取所有产品记录并查找
        if (!productRecord) {
          try {
            // 获取产品表格的所有原始记录
            const allProducts = await getAnswersData(config.appToken, productTableId);
            
            // 通过多个可能的字段名查找匹配的产品
            // 可能的字段名：产品ID、product_id、编号、ID、产品编号等
            const possibleFieldNames = ["产品ID", "product_id", "编号", "ID", "产品编号", "产品代码"];
            
            for (const product of allProducts) {
              // 检查每个可能的字段名
              for (const fieldName of possibleFieldNames) {
                const fieldValue = product.fields[fieldName];
                if (fieldValue !== undefined && fieldValue !== null) {
                  // 提取字段值（可能是字符串、数字或对象）
                  let valueStr = "";
                  if (typeof fieldValue === "string") {
                    valueStr = fieldValue;
                  } else if (typeof fieldValue === "number") {
                    valueStr = fieldValue.toString();
                  } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
                    const firstItem = fieldValue[0];
                    if (typeof firstItem === "string") {
                      valueStr = firstItem;
                    } else if (typeof firstItem === "object" && firstItem !== null) {
                      valueStr = firstItem.text || firstItem.name || String(firstItem);
                    }
                  } else if (typeof fieldValue === "object") {
                    valueStr = fieldValue.text || fieldValue.name || String(fieldValue);
                  }
                  
                  // 如果字段值匹配 product_id，直接使用该记录
                  if (valueStr === productId || valueStr.trim() === productId.trim()) {
                    productRecord = product;
                    break;
                  }
                }
              }
              if (productRecord) break;
            }
          } catch (error) {
            console.error("通过字段查找产品失败:", error);
          }
        }

        setProductInfo(productRecord);
      } catch (error: any) {
        console.error("加载产品信息失败:", error);
        setProductInfo(null);
      } finally {
        setLoadingProductInfo(false);
      }
    };

    loadProductInfo();
  }, [selectedAnswer?.product_id, productTableId]);

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
    // 重置产品信息展开状态
    setProductInfoExpanded(false);
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

  // 创建新问题到飞书（所有用户都可以）
  const handleCreateNewQuestion = async () => {
    if (!newQuestion.trim()) {
      setSubmitMessage("请输入问题内容");
      return;
    }

    const config = loadFeishuConfig();
    if (!config || !config.appToken) {
      setSubmitMessage("未找到飞书配置，请先前往配置中心设置");
      return;
    }

    const tableId = selectedTableId || config.tableId;
    if (!tableId) {
      setSubmitMessage("请先选择表格");
      return;
    }

    // 检查是否为本地模式
    const isLocalMode = !config.appId || !config.appSecret;
    if (isLocalMode) {
      setSubmitMessage("本地模式下无法创建问题，请配置完整的飞书凭证（App ID 和 App Secret）");
      return;
    }

    setCreatingQuestion(true);
    setSubmitMessage("");

    try {
      // 构建新记录的字段
      const fields: Record<string, any> = {
        "问题": newQuestion.trim(),
        // 标准回答留空，等待后续填写
        "标准回答": "",
        // 状态设置为"待审核"或"未启用"
        "状态": "待审核",
      };

      await createAnswerToFeishu(config.appToken, tableId, fields);
      setSubmitMessage("问题已成功添加到飞书！");
      setShowAddQuestionDialog(false);
      setNewQuestion("");
      
      // 可选：自动同步一次以刷新列表（但受频率限制）
      // await loadAnswersData();
    } catch (error: any) {
      setSubmitMessage(`创建失败: ${error.message || error}`);
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleSubmitToFeishu = async () => {
    // 权限检查：只有管理员可以写回（更新现有记录）
    if (role !== "admin") {
      setSubmitMessage("权限不足：只有管理员可以更新现有记录到飞书");
      return;
    }

    if (!selectedAnswer) return;

    // 检查是否为本地模式
    const config = loadFeishuConfig();
    const isLocalMode = !config || !config.appId || !config.appSecret;
    if (isLocalMode) {
      setSubmitMessage("本地模式下无法写回飞书，请配置完整的飞书凭证（App ID 和 App Secret）");
      return;
    }

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

  const handleGoToConfig = () => {
    navigate("/settings");
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -z-10"></div>
      
      <Navigation />
      
      {/* 固定搜索区域 */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold gradient-text mb-1">知识库</h1>
              {loadingState === "success" && (
                <p className="text-sm text-gray-600">
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
                </p>
              )}
            </div>
            
            {/* 搜索框和同步按钮 */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              {loadingState === "success" && (
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <Input
                    type="text"
                    placeholder="搜索问题、标准回答或对应产品..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTerm.trim()) {
                        saveSearchHistory(searchTerm.trim());
                      }
                    }}
                    className="pl-12 h-12 bg-white/90 backdrop-blur-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl shadow-sm transition-all duration-200"
                  />
                </div>
              )}
              {(() => {
                const config = loadFeishuConfig();
                const isLocalMode = !config || !config.appId || !config.appSecret;
                // 检查普通用户今天是否已经同步过
                const userId = currentUser?.id || "default";
                const canSync = canSyncToday(userId, role || null);
                const isDisabled = loadingState === "loading" || isLocalMode || (!canSync && role === "user");
                
                return (
                  <Button
                    onClick={loadAnswersData}
                    disabled={isDisabled}
                    variant="outline"
                    size="sm"
                    title={
                      isLocalMode 
                        ? "本地模式下无法同步数据，请配置完整的飞书凭证（App ID 和 App Secret）"
                        : !canSync && role === "user"
                        ? "普通用户一天只能同步一次，今天已同步过，请明天再试"
                        : ""
                    }
                  >
                    {loadingState === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        同步中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {isLocalMode ? "本地模式" : !canSync && role === "user" ? "今日已同步" : "同步数据"}
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
          
          {/* 搜索框下方的选项 */}
          {loadingState === "success" && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-600">显示所有数据（包括非启用状态）</span>
              </label>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  最后同步时间：{new Date(lastSyncTime).toLocaleString("zh-CN")}
                </span>
              )}
              {answers.length > 0 && answers[0].enable_status === "-" && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                  <span className="font-medium">提示：</span> 状态字段未识别，请点击任意记录"查看详情"→展开"调试信息"查看原始字段名
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>知识库</CardTitle>
                <CardDescription>
                  {loadingState === "idle" && (() => {
                    const config = loadFeishuConfig();
                    const isLocalMode = !config || !config.appId || !config.appSecret;
                    if (isLocalMode) {
                      return <>本地模式：仅显示缓存数据，无法同步最新数据</>;
                    }
                    return (
                      <>
                        {lastSyncTime ? (
                          <>已加载缓存数据，点击"同步数据"获取最新数据</>
                        ) : (
                          <>点击"同步数据"按钮从飞书拉取最新数据</>
                        )}
                      </>
                    );
                  })()}
                  {loadingState === "error" && '数据加载失败，请点击"同步数据"重试'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {/* 初始态：提示用户同步数据 */}
            {loadingState === "idle" && (() => {
              const config = loadFeishuConfig();
              const isLocalMode = !config || !config.appId || !config.appSecret;
              return (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">尚未同步数据</p>
                  {isLocalMode ? (
                    <>
                      <p className="text-gray-500 text-sm text-center max-w-md mb-4">
                        当前为本地模式，只能使用缓存数据。如需同步最新数据，请前往设置页面配置完整的飞书凭证（App ID 和 App Secret）
                      </p>
                      <Button onClick={() => navigate("/settings?tab=feishu")} variant="outline">
                        前往设置
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm text-center max-w-md mb-4">
                        请点击右上角的"同步数据"按钮，从飞书多维表格拉取最新数据
                      </p>
                      <Button onClick={loadAnswersData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        同步数据
                      </Button>
                    </>
                  )}
                </div>
              );
            })()}

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
                    前往设置
                  </Button>
                </div>
              </div>
            )}

            {/* 空态或低匹配度提示 */}
            {loadingState === "success" && (
              <>
                {filteredAnswers.length === 0 ? (
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
                ) : searchTerm.trim() && filteredAnswers.length > 0 && (() => {
                  const maxScore = Math.max(...filteredAnswers.map(a => matchScores[a.record_id] || 0));
                  return maxScore < 70 && searchTerm.trim().length >= 3 ? (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 mb-1">
                            未找到匹配度高于70%的答案
                          </p>
                          <p className="text-xs text-amber-700 mb-3">
                            最高匹配度：{maxScore.toFixed(1)}%
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNewQuestion(searchTerm.trim());
                              setShowAddQuestionDialog(true);
                            }}
                            className="border-amber-300 text-amber-700 hover:bg-amber-100"
                          >
                            新增这个问题到飞书
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}

            {/* 成功态：列表展示 */}
            {loadingState === "success" && filteredAnswers.length > 0 && (
              <div className="space-y-4">
                {filteredAnswers.map((answer) => (
                  <div
                    key={answer.record_id}
                    className="border border-white/40 rounded-xl p-5 bg-white/60 backdrop-blur-sm hover:bg-white/80 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 cursor-pointer group"
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
                          {searchTerm.trim() && matchScores[answer.record_id] !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              matchScores[answer.record_id] >= 70
                                ? "bg-green-100 text-green-700"
                                : matchScores[answer.record_id] >= 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              匹配度: {matchScores[answer.record_id].toFixed(1)}%
                            </span>
                          )}
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
        </div>

        {/* 详情对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            {/* 顶部标题栏 - 带渐变 */}
            <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
              <DialogHeader className="relative z-10">
                <DialogTitle className="text-2xl font-bold text-white">知识库详情</DialogTitle>
              </DialogHeader>
            </div>
            
            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
            {selectedAnswer && (
              <div className="space-y-6">
                {/* 问题卡片 - 突出显示 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100/50 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">问题</div>
                    </div>
                    <div className="text-lg font-medium text-gray-900 leading-relaxed">
                      {selectedAnswer.question}
                    </div>
                  </div>
                </div>

                {/* 标准回答卡片 - 主要内容 */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-xl"></div>
                  <div className="relative bg-white rounded-xl p-6 border border-gray-200/50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
                        <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">标准回答</div>
                      </div>
                      <Button
                        variant={copySuccess === "标准回答" ? "default" : "outline"}
                        size="sm"
                        onClick={() => copyToClipboard(selectedAnswer.standard_answer, "标准回答")}
                        className={`h-8 transition-all ${
                          copySuccess === "标准回答" 
                            ? "bg-green-500 hover:bg-green-600 text-white border-green-500 shadow-md" 
                            : "border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        {copySuccess === "标准回答" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                      {selectedAnswer.standard_answer}
                    </div>
                  </div>
                </div>

                {/* 产品信息列表 */}
                {selectedAnswer.product_id && selectedAnswer.product_id !== "-" ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-xl blur-xl"></div>
                    <div className="relative bg-white rounded-xl p-6 border border-gray-200/50 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">产品信息</div>
                          <div className="text-xs text-gray-500 ml-2">
                            产品ID: <span className="font-mono">{selectedAnswer.product_id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {productInfo && productTableId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const config = loadFeishuConfig();
                                if (config?.appToken && productInfo?.record_id) {
                                  // 构建飞书表格链接
                                  const feishuUrl = `https://bytedance.feishu.cn/base/${config.appToken}?table=${productTableId}&view=default&recordId=${productInfo.record_id}`;
                                  // 使用 Tauri shell 在默认浏览器中打开链接
                                  try {
                                    await openExternalUrl(feishuUrl);
                                  } catch (error) {
                                    console.error("打开链接失败:", error);
                                    // 降级方案：使用 window.open
                                    window.open(feishuUrl, '_blank');
                                  }
                                }
                              }}
                              className="h-8 text-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              查看飞书详细信息
                            </Button>
                          )}
                          {productInfo && productInfo.fields && Object.keys(productInfo.fields).filter(key => key !== "record_id").length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setProductInfoExpanded(!productInfoExpanded)}
                              className="h-8 text-xs"
                            >
                              {productInfoExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                                  折叠
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                                  展开
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {loadingProductInfo ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                          <span className="text-sm text-gray-600">加载产品信息中...</span>
                        </div>
                      ) : productInfo && productInfo.fields ? (
                        <>
                          {productInfoExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {Object.entries(productInfo.fields)
                                .filter(([key]) => {
                                  // 过滤掉 record_id、PRODUCT_ID、ANSWERS 字段
                                  const upperKey = key.toUpperCase();
                                  return key !== "record_id" && 
                                         upperKey !== "PRODUCT_ID" && 
                                         upperKey !== "ANSWERS" &&
                                         key !== "product_id" &&
                                         key !== "answers";
                                })
                                .map(([fieldName, fieldValue]) => {
                                  // 检测是否为图片字段（attachment 类型）
                                  const isImageField = Array.isArray(fieldValue) && fieldValue.length > 0 && 
                                    fieldValue.some((item: any) => 
                                      item && typeof item === "object" && 
                                      (item.type === "image" || item.token || item.url || item.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                                    );

                                  // 格式化字段值
                                  let displayValue = "";
                                  let isAttachment = false;
                                  
                                  if (fieldValue === null || fieldValue === undefined) {
                                    displayValue = "-";
                                  } else if (typeof fieldValue === "string") {
                                    displayValue = fieldValue;
                                  } else if (typeof fieldValue === "number") {
                                    displayValue = fieldValue.toString();
                                  } else if (typeof fieldValue === "boolean") {
                                    displayValue = fieldValue ? "是" : "否";
                                  } else if (Array.isArray(fieldValue)) {
                                    // 处理数组类型（如选项字段、附件字段）
                                    if (fieldValue.length === 0) {
                                      displayValue = "-";
                                    } else {
                                      // 检查是否为附件数组
                                      if (isImageField || fieldValue.some((item: any) => item && typeof item === "object" && (item.token || item.url))) {
                                        isAttachment = true;
                                        displayValue = fieldValue.map((item: any) => {
                                          if (typeof item === "string") return item;
                                          if (typeof item === "object" && item !== null) {
                                            return item.name || item.text || item.url || JSON.stringify(item);
                                          }
                                          return String(item);
                                        }).join(", ");
                                      } else {
                                        const texts = fieldValue.map((item: any) => {
                                          if (typeof item === "string") return item;
                                          if (typeof item === "object" && item !== null) {
                                            return item.text || item.name || item.option_name || item.label || JSON.stringify(item);
                                          }
                                          return String(item);
                                        });
                                        displayValue = texts.join(", ");
                                      }
                                    }
                                  } else if (typeof fieldValue === "object") {
                                    // 处理对象类型
                                    if (fieldValue.text) {
                                      displayValue = fieldValue.text;
                                    } else if (fieldValue.name) {
                                      displayValue = fieldValue.name;
                                    } else {
                                      displayValue = JSON.stringify(fieldValue);
                                    }
                                  } else {
                                    displayValue = String(fieldValue);
                                  }

                                  const copyFieldValue = () => {
                                    copyToClipboard(displayValue, `${fieldName}的值`);
                                  };

                                  const openFeishuLink = async () => {
                                    const config = loadFeishuConfig();
                                    if (config?.appToken && productTableId && productInfo?.record_id) {
                                      const feishuUrl = `https://bytedance.feishu.cn/base/${config.appToken}?table=${productTableId}&view=default&recordId=${productInfo.record_id}`;
                                      // 使用 Tauri shell 在默认浏览器中打开链接
                                      try {
                                        await openExternalUrl(feishuUrl);
                                      } catch (error) {
                                        console.error("打开链接失败:", error);
                                        // 降级方案：使用 window.open
                                        window.open(feishuUrl, '_blank');
                                      }
                                    }
                                  };

                                  return (
                                    <div
                                      key={fieldName}
                                      className="group relative bg-gray-50 rounded-lg p-4 border border-gray-200/50 hover:border-blue-300/50 transition-all duration-200"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                          {fieldName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {isAttachment && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={openFeishuLink}
                                              className="h-6 px-2 text-xs"
                                              title="在飞书中查看"
                                            >
                                              <ExternalLink className="w-3 h-3 mr-1" />
                                              查看
                                            </Button>
                                          )}
                                          {displayValue !== "-" && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={copyFieldValue}
                                              className={`h-6 px-2 text-xs ${
                                                copySuccess === `${fieldName}的值` 
                                                  ? "text-green-600" 
                                                  : "text-gray-500 hover:text-blue-600"
                                              }`}
                                              title="复制"
                                            >
                                              {copySuccess === `${fieldName}的值` ? (
                                                <CheckCircle2 className="w-3 h-3" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      <div 
                                        className={`text-sm font-medium text-gray-900 break-words ${
                                          isAttachment ? "cursor-pointer hover:text-blue-600" : ""
                                        }`}
                                        onClick={isAttachment ? openFeishuLink : undefined}
                                        title={isAttachment ? "点击在飞书中查看" : undefined}
                                      >
                                        {displayValue !== "-" ? displayValue : <span className="text-gray-400">未设置</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              {Object.keys(productInfo.fields).filter(key => key !== "record_id").length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
                                  该产品暂无详细信息
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-sm text-gray-500 mb-2">
                            {productTableId 
                              ? "无法加载产品信息，请检查产品ID是否正确" 
                              : "未找到产品表格配置"}
                          </div>
                          {!productTableId && (
                            <div className="text-xs text-gray-400">
                              请在设置页面配置 PRODUCTS 表格以显示产品详细信息
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/10 rounded-xl blur-xl"></div>
                    <div className="relative bg-white rounded-xl p-6 border border-gray-200/50 shadow-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gradient-to-b from-gray-600 to-gray-600 rounded-full"></div>
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">产品信息</div>
                      </div>
                      <div className="text-center py-8 text-gray-500 text-sm">
                        该问题未关联产品信息
                      </div>
                    </div>
                  </div>
                )}
                {/* AI 功能区域 - 现代化设计 */}
                <div className="relative mt-8 pt-8 border-t border-gray-200/50">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">AI 智能助手</div>
                        <div className="text-xs text-gray-500 mt-0.5">使用 AI 优化、审核和检测知识库内容</div>
                      </div>
                    </div>
                    <div className="text-xs text-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-lg border border-amber-200/50 shadow-sm">
                      <span className="font-medium">⚠️</span> AI 建议仅供参考，不会直接影响知识库
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mb-6">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleOptimize}
                      disabled={optimizing}
                      className="flex-1 min-w-[140px] border-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      {optimizing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                          <span className="font-semibold">优化中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                          <span className="font-semibold">AI 优化</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleReview}
                      disabled={reviewing}
                      className="flex-1 min-w-[140px] border-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200"
                    >
                      {reviewing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin text-indigo-600" />
                          <span className="font-semibold">审核中...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5 mr-2 text-indigo-600" />
                          <span className="font-semibold">AI 审核</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleCheckRisk}
                      disabled={checkingRisk}
                      className="flex-1 min-w-[140px] border-2 hover:border-red-400 hover:bg-red-50/50 transition-all duration-200"
                    >
                      {checkingRisk ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin text-red-600" />
                          <span className="font-semibold">检测中...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                          <span className="font-semibold">风险检测</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI 优化结果 */}
                  {optimizedResult && (
                    <Card className="mb-6 border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 shadow-lg">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                            <CardTitle className="text-base font-bold text-gray-900">AI 优化结果</CardTitle>
                          </div>
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
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-xl blur-xl"></div>
                          <div className="relative bg-white rounded-xl p-5 border-2 border-blue-100/50 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <div className="text-sm font-semibold text-gray-800">优化后的客服回复</div>
                              </div>
                              <Button
                                variant={copySuccess === "优化后的回复" ? "default" : "outline"}
                                size="sm"
                                onClick={() => copyToClipboard(optimizedResult.answerText, "优化后的回复")}
                                className={`h-8 transition-all ${
                                  copySuccess === "优化后的回复" 
                                    ? "bg-green-500 hover:bg-green-600 text-white border-green-500 shadow-md" 
                                    : "border-gray-300 hover:border-blue-400 hover:text-blue-600"
                                }`}
                              >
                                {copySuccess === "优化后的回复" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                    已复制
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                                    复制
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                              {optimizedResult.answerText}
                            </div>
                          </div>
                        </div>
                        {optimizedResult.explanationText && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl blur-xl"></div>
                            <div className="relative bg-white/80 rounded-xl p-4 border border-indigo-100/50">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
                                <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">内部优化说明</div>
                              </div>
                              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {optimizedResult.explanationText}
                              </div>
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
                    <Card className={`mb-6 border-2 shadow-lg ${
                      reviewResult.conclusion === "合理" ? "border-green-200/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50" :
                      reviewResult.conclusion === "基本合理" ? "border-yellow-200/50 bg-gradient-to-br from-yellow-50/50 to-amber-50/50" :
                      reviewResult.conclusion === "需修改" ? "border-red-200/50 bg-gradient-to-br from-red-50/50 to-rose-50/50" :
                      "border-gray-200/50 bg-gradient-to-br from-gray-50/50 to-slate-50/50"
                    }`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${
                              reviewResult.conclusion === "合理" ? "bg-gradient-to-b from-green-600 to-emerald-600" :
                              reviewResult.conclusion === "基本合理" ? "bg-gradient-to-b from-yellow-600 to-amber-600" :
                              reviewResult.conclusion === "需修改" ? "bg-gradient-to-b from-red-600 to-rose-600" :
                              "bg-gradient-to-b from-gray-600 to-slate-600"
                            }`}></div>
                            <CardTitle className="text-base font-bold text-gray-900">AI 审核结果</CardTitle>
                          </div>
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
            </div>
          </DialogContent>
        </Dialog>

        {/* 新增问题对话框 */}
        <Dialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
          <DialogContent className="max-w-3xl sm:max-w-3xl p-0">
            <DialogHeader className="px-8 pt-8 pb-6 border-b">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    新增问题到飞书
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-2">
                    将新问题添加到知识库中
                  </p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="px-8 py-6 space-y-6">
              {/* 问题输入区域 */}
              <div className="space-y-3">
                <label className="text-base font-medium text-gray-700 flex items-center gap-2">
                  问题内容
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="请输入要新增的问题内容，例如：如何查询订单状态？"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newQuestion.trim() && !creatingQuestion) {
                        handleCreateNewQuestion();
                      }
                    }}
                    className="w-full h-14 pl-5 pr-5 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-gray-500">
                  支持输入中英文问题，建议问题描述清晰明确
                </p>
              </div>

              {/* 提示信息卡片 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-base font-medium text-blue-900 mb-2">
                      提示信息
                    </p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      新增的问题将添加到飞书表格中，标准回答字段将留空，等待后续填写。创建成功后，您可以在下次同步时看到这条新问题。
                    </p>
                  </div>
                </div>
              </div>

              {/* 消息提示 */}
              {submitMessage && (
                <div className={`rounded-lg p-5 border flex items-start gap-4 ${
                  submitMessage.includes("成功")
                    ? "bg-green-50 border-green-200 text-green-800" 
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {submitMessage.includes("成功") ? (
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm font-medium flex-1">
                    {submitMessage}
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddQuestionDialog(false);
                    setNewQuestion("");
                    setSubmitMessage("");
                  }}
                  disabled={creatingQuestion}
                  className="min-w-[110px] h-11 px-6"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateNewQuestion}
                  disabled={!newQuestion.trim() || creatingQuestion}
                  className="min-w-[140px] h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {creatingQuestion ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      创建问题
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
