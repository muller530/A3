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

/**
 * 从 AI 返回的文本中提取优化后的客服回复和说明文本
 * 
 * 识别规则（按优先级）：
 * 1. 新格式：【最终客服回复】和【内部优化说明】（优先）
 * 2. 旧格式兼容：查找明确的标识符（如"优化后的客服回复："等）
 * 3. 引用块格式（> 或 **> 开头的内容）
 * 4. 若未识别到结构，返回整段文本作为客服回复（兜底）
 * 
 * @param aiText AI 返回的完整文本
 * @returns 拆分后的客服回复文本和说明文本
 */
export function extractOptimizedAnswer(aiText: string): {
  answerText: string;
  explanationText?: string;
} {
  if (!aiText || !aiText.trim()) {
    return { answerText: aiText || "" };
  }

  const text = aiText.trim();
  
  // 规则 1（优先）：新格式 - 【最终客服回复】和【内部优化说明】
  // 匹配格式：【最终客服回复】\n<内容>\n【内部优化说明】\n<内容>
  const answerSectionMatch = text.match(/【最终客服回复】/);
  if (answerSectionMatch) {
    const answerSectionStart = answerSectionMatch.index! + answerSectionMatch[0].length;
    const explanationSectionMatch = text.substring(answerSectionStart).match(/【内部优化说明】/);
    
    let answerText = "";
    let explanationText: string | undefined = undefined;
    
    if (explanationSectionMatch) {
      // 有【内部优化说明】部分
      const answerSectionEnd = answerSectionStart + explanationSectionMatch.index!;
      answerText = text.substring(answerSectionStart, answerSectionEnd).trim();
      
      const explanationSectionStart = answerSectionStart + explanationSectionMatch.index! + explanationSectionMatch[0].length;
      const explanationContent = text.substring(explanationSectionStart).trim();
      explanationText = explanationContent || undefined;
    } else {
      // 只有【最终客服回复】部分，没有【内部优化说明】
      answerText = text.substring(answerSectionStart).trim();
    }
    
    // 清理可能残留的格式标记
    answerText = answerText.replace(/^\*\*>\s*/, ""); // 移除开头的 **>
    answerText = answerText.replace(/^\*+\s*/, ""); // 移除开头的多个 *
    answerText = answerText.replace(/^>\s*/, ""); // 移除开头的 >
    answerText = answerText.replace(/\*+$/g, ""); // 移除末尾的 *
    answerText = answerText.trim();
    
    if (answerText) {
      return {
        answerText,
        explanationText,
      };
    }
  }
  
  // 规则 2: 查找明确的标识符模式（包括"如下："格式）- 兼容旧格式
  // 匹配：优化后的客服回复：、优化后的客服回复如下：、**优化后的客服回复：**等
  const answerPatterns = [
    // 匹配 "优化后的客服回复如下：" 格式，提取后面的内容（直到文件末尾或双换行后的说明）
    /(?:优化后的客服回复|优化后的回复|客服回复|回复内容)(?:如下|为)[：:]\s*[\n\r]*([\s\S]*?)(?:\n\n(?:说明|优化说明|字数|规则|要求|注意)|$)/i,
    // 匹配 "优化后的客服回复：" 格式
    /(?:优化后的客服回复|优化后的回复|客服回复|回复内容)[：:]\s*[\n\r]*([\s\S]*?)(?:\n\n(?:说明|优化说明|字数|规则|要求|注意)|$)/i,
    // 匹配 Markdown 格式 "**优化后的客服回复：**"
    /\*\*(?:优化后的客服回复|优化后的回复|客服回复|回复内容)[：:]\*\*\s*[\n\r]*([\s\S]*?)(?:\n\n|\n(?:说明|优化说明|字数|规则|要求|注意)|$)/i,
    // 匹配 【】格式（兼容其他【】格式）
    /【(?:优化后的客服回复|优化后的回复|客服回复|回复内容)】\s*[\n\r]*([\s\S]*?)(?:\n\n|\n(?:说明|优化说明|字数|规则|要求|注意)|$)/i,
  ];

  for (const pattern of answerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let answerText = match[1].trim();
      
      // 清理 Markdown 格式标记（**、> 等）
      answerText = answerText.replace(/^\*\*>\s*/, ""); // 移除开头的 **>
      answerText = answerText.replace(/^\*+\s*/, ""); // 移除开头的多个 *
      answerText = answerText.replace(/^>\s*/, ""); // 移除开头的 >
      answerText = answerText.replace(/\*+$/g, ""); // 移除末尾的 *
      answerText = answerText.trim();
      
      if (answerText) {
        const explanationText = text.replace(match[0], "").trim();
        return {
          answerText,
          explanationText: explanationText || undefined,
        };
      }
    }
  }

  // 规则 2: 查找引用块格式（Markdown > 或 **> 开头）
  // 优先查找 **> 格式，因为这是常见的回复内容格式
  const quotePatterns = [
    /\*\*>\s*([\s\S]*?)(?:\n\n(?!\*\*>)|$)/, // **> 开头（不限制行首）
    /^>\s*([\s\S]*?)(?:\n\n(?!>)|$)/m, // > 开头（行首）
  ];
  
  for (const pattern of quotePatterns) {
    const quoteMatch = text.match(pattern);
    if (quoteMatch && quoteMatch[1]) {
      let quoteText = quoteMatch[1].trim();
      // 移除引用标记
      quoteText = quoteText.replace(/^\*\*>\s*/gm, "");
      quoteText = quoteText.replace(/^>\s*/gm, "");
      quoteText = quoteText.replace(/\*+$/g, ""); // 移除末尾的 *
      quoteText = quoteText.trim();
      
      if (quoteText && quoteText.length > 5) {
        // 提取说明文本（引用块之前的内容）
        const beforeQuote = text.substring(0, quoteMatch.index || 0).trim();
        const afterQuote = text.substring((quoteMatch.index || 0) + quoteMatch[0].length).trim();
        let explanationText = beforeQuote;
        if (afterQuote && afterQuote !== quoteText) {
          explanationText = explanationText 
            ? `${explanationText}\n\n${afterQuote}` 
            : afterQuote;
        }
        
        return {
          answerText: quoteText,
          explanationText: explanationText || undefined,
        };
      }
    }
  }

  // 规则 3: 查找第一个段落（通过双换行分隔）
  // 如果第一个段落包含实际回复内容（不是说明性文字），则作为回复
  const firstParagraphMatch = text.match(/^([\s\S]*?)(\n\n|$)/);
  if (firstParagraphMatch && firstParagraphMatch[1]) {
    let firstPara = firstParagraphMatch[1].trim();
    
    // 如果第一段是说明性文字（包含"好的"、"根据"、"如下"等），跳过
    if (!/(?:好的|根据|如下|说明|优化说明)/i.test(firstPara) && firstPara.length > 20) {
      // 清理格式标记
      firstPara = firstPara.replace(/^\*\*>\s*/, "");
      firstPara = firstPara.replace(/^\*+\s*/, "");
      firstPara = firstPara.replace(/^>\s*/, "");
      firstPara = firstPara.replace(/\*+$/g, "");
      firstPara = firstPara.trim();
      
      if (firstPara) {
        const restText = text.substring(firstParagraphMatch[0].length).trim();
        return {
          answerText: firstPara,
          explanationText: restText || undefined,
        };
      }
    }
  }

  // 规则 4: 查找双换行分隔（通常说明在最后）
  const doubleNewlineIndex = text.lastIndexOf("\n\n");
  if (doubleNewlineIndex > 0 && doubleNewlineIndex < text.length - 2) {
    const potentialAnswer = text.substring(0, doubleNewlineIndex).trim();
    const potentialExplanation = text.substring(doubleNewlineIndex + 2).trim();
    
    // 清理格式标记
    let cleanAnswer = potentialAnswer.replace(/^\*\*>\s*/, "");
    cleanAnswer = cleanAnswer.replace(/^\*+\s*/, "");
    cleanAnswer = cleanAnswer.replace(/^>\s*/, "");
    cleanAnswer = cleanAnswer.replace(/\*+$/g, "");
    cleanAnswer = cleanAnswer.trim();
    
    // 如果说明部分包含明显的说明性关键词，则拆分
    if (potentialExplanation && /(?:说明|优化说明|字数|规则|要求|注意|优化|调整)/i.test(potentialExplanation)) {
      return {
        answerText: cleanAnswer || potentialAnswer,
        explanationText: potentialExplanation,
      };
    }
  }


  // 兜底：清理格式标记后返回整段文本作为客服回复
  let cleanText = text;
  cleanText = cleanText.replace(/^\*\*>\s*/, "");
  cleanText = cleanText.replace(/^\*+\s*/, "");
  cleanText = cleanText.replace(/^>\s*/, "");
  cleanText = cleanText.replace(/\*+$/g, "");
  cleanText = cleanText.trim();
  
  return { answerText: cleanText || text };
}

/**
 * 从 AI 返回的审核结果中解析结构化信息
 * 
 * 解析格式（新版本）：
 * - 【审核结论】= 合理 / 基本合理 / 需修改（位于第一行，固定格式）
 * - 【专业判断说明】（必须详细说明专业理由）
 * - 【潜在风险或注意点】
 * - 【修改建议】（仅在"需修改"或"基本合理但可优化"时提供）
 * - 【修改依据（专家原则）】
 * 
 * @param reviewText AI 返回的完整审核文本
 * @returns 解析后的结构化审核结果
 */
export interface ReviewResult {
  conclusion: "合理" | "基本合理" | "需修改" | "";
  judgmentExplanation: string; // 专业判断说明
  riskPoints: string; // 潜在风险或注意点
  modificationReason?: string; // 需修改原因（仅在需修改时）
  recommendedReply?: string; // 修改后推荐回复（仅在需修改时）
  suggestion?: string; // 修改建议（仅在基本合理但可优化时）
  basis?: string; // 修改依据（专家原则）
  rawText: string; // 原始文本，用于显示
  isComplete?: boolean; // 审核结果是否完整（需修改时必须有修改原因和推荐回复）
}

export function extractReviewResult(reviewText: string): ReviewResult {
  if (!reviewText || !reviewText.trim()) {
    return {
      conclusion: "",
      judgmentExplanation: "",
      riskPoints: "",
      rawText: reviewText || "",
    };
  }

  const text = reviewText.trim();
  const result: ReviewResult = {
    conclusion: "",
    judgmentExplanation: "",
    riskPoints: "",
    rawText: text,
  };

  // 优先提取第一行的【审核结论】（新格式：= 合理 / 基本合理 / 需修改）
  // 只匹配第一行，格式：【审核结论】= 合理/基本合理/需修改
  const firstLineMatch = text.match(/^【审核结论】\s*=\s*(合理|基本合理|需修改)\s*$/m);
  if (firstLineMatch && firstLineMatch[1]) {
    const conclusionValue = firstLineMatch[1].trim();
    if (conclusionValue === "合理") {
      result.conclusion = "合理";
    } else if (conclusionValue === "基本合理") {
      result.conclusion = "基本合理";
    } else if (conclusionValue === "需修改") {
      result.conclusion = "需修改";
    }
  }
  
  // 如果第一行匹配失败，尝试匹配第一行的宽松格式（允许前后有空白）
  if (!result.conclusion) {
    const firstLineLooseMatch = text.match(/^【审核结论】\s*=\s*(合理|基本合理|需修改)/m);
    if (firstLineLooseMatch && firstLineLooseMatch[1]) {
      const conclusionValue = firstLineLooseMatch[1].trim();
      if (conclusionValue === "合理") {
        result.conclusion = "合理";
      } else if (conclusionValue === "基本合理") {
        result.conclusion = "基本合理";
      } else if (conclusionValue === "需修改") {
        result.conclusion = "需修改";
      }
    }
  }
  
  // 如果仍未匹配到，尝试全文匹配（兼容旧格式或格式不标准的情况）
  if (!result.conclusion) {
    const conclusionMatch = text.match(/【审核结论】\s*[\n\r]*=\s*([^\n\r]+)/);
    if (conclusionMatch && conclusionMatch[1]) {
      const conclusionText = conclusionMatch[1].trim();
      if (conclusionText === "合理" || (conclusionText.includes("合理") && !conclusionText.includes("基本") && !conclusionText.includes("需修改"))) {
        result.conclusion = "合理";
      } else if (conclusionText === "基本合理" || conclusionText.includes("基本合理")) {
        result.conclusion = "基本合理";
      } else if (conclusionText === "需修改" || conclusionText.includes("需修改")) {
        result.conclusion = "需修改";
      }
    }
  }
  
  // 最后尝试兼容旧格式【专业审核结论】（向后兼容）
  if (!result.conclusion) {
    const oldConclusionMatch = text.match(/【专业审核结论】\s*[\n\r]+([^\n\r]+)/);
    if (oldConclusionMatch && oldConclusionMatch[1]) {
      const conclusionText = oldConclusionMatch[1].trim();
      if (conclusionText === "合理" || (conclusionText.includes("合理") && !conclusionText.includes("基本") && !conclusionText.includes("需修改"))) {
        result.conclusion = "合理";
      } else if (conclusionText === "基本合理" || conclusionText.includes("基本合理")) {
        result.conclusion = "基本合理";
      } else if (conclusionText === "需修改" || conclusionText.includes("需修改")) {
        result.conclusion = "需修改";
      }
    }
  }

  // 提取【专业判断说明】（新字段）
  const judgmentMatch = text.match(/【专业判断说明】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【潜在风险或注意点】|$)/);
  if (judgmentMatch && judgmentMatch[1]) {
    result.judgmentExplanation = judgmentMatch[1].trim();
  }

  // 提取【潜在风险或注意点】（新字段，替代原来的【问题点说明】）
  const riskMatch = text.match(/【潜在风险或注意点】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【修改建议】|$)/);
  if (riskMatch && riskMatch[1]) {
    result.riskPoints = riskMatch[1].trim();
  }
  
  // 兼容旧格式【问题点说明】
  if (!result.riskPoints) {
    const oldProblemMatch = text.match(/【问题点说明】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【修改建议】|$)/);
    if (oldProblemMatch && oldProblemMatch[1]) {
      result.riskPoints = oldProblemMatch[1].trim();
    }
  }

  // 提取【需修改原因】（仅在需修改时）
  const modificationReasonMatch = text.match(/【需修改原因】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【修改后推荐回复】|$)/);
  if (modificationReasonMatch && modificationReasonMatch[1]) {
    result.modificationReason = modificationReasonMatch[1].trim();
  }

  // 提取【修改后推荐回复】（仅在需修改时）
  const recommendedReplyMatch = text.match(/【修改后推荐回复】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【修改建议】|\s*[\n\r]+【修改依据（专家原则）】|$)/);
  if (recommendedReplyMatch && recommendedReplyMatch[1]) {
    result.recommendedReply = recommendedReplyMatch[1].trim();
  }

  // 提取【修改建议】（仅在基本合理但可优化时提供）
  const suggestionMatch = text.match(/【修改建议】\s*[\n\r]+([\s\S]*?)(?:\s*[\n\r]+【修改依据（专家原则）】|$)/);
  if (suggestionMatch && suggestionMatch[1]) {
    result.suggestion = suggestionMatch[1].trim();
  }

  // 提取【修改依据（专家原则）】（新格式）
  const basisMatch = text.match(/【修改依据（专家原则）】\s*[\n\r]+([\s\S]*?)$/);
  if (basisMatch && basisMatch[1]) {
    result.basis = basisMatch[1].trim();
  }
  
  // 兼容旧格式【修改依据】
  if (!result.basis) {
    const oldBasisMatch = text.match(/【修改依据】\s*[\n\r]+([\s\S]*?)$/);
    if (oldBasisMatch && oldBasisMatch[1]) {
      result.basis = oldBasisMatch[1].trim();
    }
  }

  // 验证审核结果完整性：当结论为"需修改"时，必须同时有修改原因和推荐回复
  if (result.conclusion === "需修改") {
    if (!result.modificationReason || !result.recommendedReply) {
      result.isComplete = false;
    } else {
      result.isComplete = true;
    }
  } else {
    result.isComplete = true; // 非需修改状态视为完整
  }

  return result;
}

/**
 * 解析轻量级专业风险校验结果
 * 
 * 输入格式：
 * RISK = YES / NO
 * REASON = 一句话原因
 * 
 * @param checkText AI 返回的校验结果文本
 * @returns 解析后的风险校验结果
 */
export interface RiskCheckResult {
  hasRisk: boolean;
  reason: string;
}

export function parseRiskCheckResult(checkText: string): RiskCheckResult {
  if (!checkText || !checkText.trim()) {
    return {
      hasRisk: false,
      reason: "",
    };
  }

  const text = checkText.trim();
  let hasRisk = false;
  let reason = "";

  // 提取 RISK 值
  const riskMatch = text.match(/RISK\s*=\s*(YES|NO)/i);
  if (riskMatch && riskMatch[1]) {
    hasRisk = riskMatch[1].toUpperCase() === "YES";
  }

  // 提取 REASON 值
  const reasonMatch = text.match(/REASON\s*=\s*([^\n\r]+)/i);
  if (reasonMatch && reasonMatch[1]) {
    reason = reasonMatch[1].trim();
  }

  return {
    hasRisk,
    reason,
  };
}

/**
 * 校验 feishu_record_id 是否合法
 * 合法条件：
 * 1. 存在且非空
 * 2. 以 "rec" 开头
 * 
 * @param recordId 待校验的记录ID
 * @returns 是否合法
 */
export function isValidFeishuRecordId(recordId: string | null | undefined): boolean {
  if (!recordId || typeof recordId !== "string") {
    return false;
  }
  return recordId.trim().startsWith("rec");
}

/**
 * 获取 feishu_record_id（从 Answer 对象中）
 * 确保返回的是合法的飞书记录ID
 * 
 * @param answer Answer 对象
 * @returns feishu_record_id 或 null
 */
export function getFeishuRecordId(answer: { record_id: string } | null | undefined): string | null {
  if (!answer || !answer.record_id) {
    return null;
  }
  const recordId = answer.record_id.trim();
  if (isValidFeishuRecordId(recordId)) {
    return recordId;
  }
  return null;
}

/**
 * 中文停用词列表（常见无意义词汇）
 */
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这",
  "吗", "什么", "怎么", "如何", "为什么", "哪", "哪个", "哪些", "多少", "几", "多", "少", "能", "可以", "应该", "会", "会", "能", "要", "想", "给", "让", "使",
  "与", "和", "或", "及", "以及", "还有", "而且", "但是", "不过", "然而", "如果", "假如", "要是", "因为", "所以", "因此", "由于", "为了"
]);

/**
 * 同义词映射表（语义相似词）
 */
const SYNONYMS: Record<string, string[]> = {
  "区别": ["差异", "不同", "差别", "区别", "区别是什么", "有什么区别", "有什么不同", "有什么差异"],
  "差异": ["区别", "不同", "差别", "差异", "区别是什么", "有什么区别", "有什么不同", "有什么差异"],
  "不同": ["区别", "差异", "差别", "不同", "区别是什么", "有什么区别", "有什么不同", "有什么差异"],
  "差别": ["区别", "差异", "不同", "差别", "区别是什么", "有什么区别", "有什么不同", "有什么差异"],
  "怎么": ["如何", "怎样", "怎么", "怎么用", "如何使用", "怎样使用"],
  "如何": ["怎么", "怎样", "如何", "怎么用", "如何使用", "怎样使用"],
  "怎样": ["怎么", "如何", "怎样", "怎么用", "如何使用", "怎样使用"],
  "功效": ["作用", "效果", "功能", "功效", "有什么作用", "有什么效果", "有什么功能"],
  "作用": ["功效", "效果", "功能", "作用", "有什么作用", "有什么效果", "有什么功能"],
  "效果": ["功效", "作用", "功能", "效果", "有什么作用", "有什么效果", "有什么功能"],
  "功能": ["功效", "作用", "效果", "功能", "有什么作用", "有什么效果", "有什么功能"],
  "可以": ["能", "能够", "能否", "可以", "能不能", "能否"],
  "能": ["可以", "能够", "能否", "能", "能不能", "能否"],
  "配": ["搭配", "配合", "一起", "配", "和", "与"],
  "搭配": ["配", "配合", "一起", "搭配", "和", "与"],
  "一起": ["配", "搭配", "配合", "一起", "和", "与"],
  "普通": ["一般", "常规", "普通", "常见", "通常"],
  "一般": ["普通", "常规", "一般", "常见", "通常"],
  "天然": ["自然", "天然", "有机", "纯天然"],
  "自然": ["天然", "自然", "有机", "纯天然"],
};

/**
 * 提取关键词（去除停用词和标点）
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // 移除标点符号，保留中英文和数字
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s,\.!?;:\(\)\[\]<>]/g, " ");
  
  // 分割成词（中文字符单独成词，英文单词按空格分割）
  const words: string[] = [];
  let currentWord = "";
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const isChinese = /[\u4e00-\u9fa5]/.test(char);
    const isEnglish = /[a-zA-Z0-9]/.test(char);
    
    if (isChinese) {
      if (currentWord) {
        words.push(currentWord.toLowerCase());
        currentWord = "";
      }
      words.push(char);
    } else if (isEnglish) {
      currentWord += char;
    } else {
      if (currentWord) {
        words.push(currentWord.toLowerCase());
        currentWord = "";
      }
    }
  }
  
  if (currentWord) {
    words.push(currentWord.toLowerCase());
  }
  
  // 过滤停用词和空词
  return words.filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

/**
 * 获取同义词组（包括自身）
 */
function getSynonymGroup(word: string): string[] {
  const lowerWord = word.toLowerCase();
  const synonyms: string[] = [lowerWord];
  
  // 查找同义词
  for (const [key, values] of Object.entries(SYNONYMS)) {
    if (key === lowerWord || values.includes(lowerWord)) {
      synonyms.push(...values);
      synonyms.push(key);
    }
  }
  
  return [...new Set(synonyms)];
}

/**
 * 计算关键词匹配度（基于语义理解）
 */
function calculateKeywordMatch(searchKeywords: string[], targetKeywords: string[]): number {
  if (searchKeywords.length === 0 || targetKeywords.length === 0) {
    return 0;
  }
  
  let matchedCount = 0;
  let totalScore = 0;
  const matchedKeywords = new Set<string>();
  
  // 对每个搜索关键词，检查是否在目标文本中匹配（包括同义词）
  for (const searchWord of searchKeywords) {
    const synonymGroup = getSynonymGroup(searchWord);
    let bestMatch = 0;
    let matchedWord = "";
    
    for (const targetWord of targetKeywords) {
      let matchScore = 0;
      
      // 完全匹配（最高分）
      if (searchWord === targetWord.toLowerCase()) {
        matchScore = 100;
      }
      // 同义词组匹配（高分）
      else if (synonymGroup.includes(targetWord.toLowerCase())) {
        matchScore = 90;
      }
      // 同义词匹配（中高分）
      else {
        const targetSynonymGroup = getSynonymGroup(targetWord);
        if (synonymGroup.some(syn => targetSynonymGroup.includes(syn))) {
          matchScore = 85;
        }
        // 包含匹配（中分，仅对较长词）
        else if (searchWord.length >= 2 && targetWord.length >= 2) {
          if (targetWord.includes(searchWord) || searchWord.includes(targetWord)) {
            matchScore = 60;
          }
        }
      }
      
      if (matchScore > bestMatch) {
        bestMatch = matchScore;
        matchedWord = targetWord;
      }
    }
    
    if (bestMatch > 0) {
      matchedCount++;
      totalScore += bestMatch;
      if (matchedWord) {
        matchedKeywords.add(matchedWord);
      }
    }
  }
  
  // 基础匹配度：匹配的关键词数 / 搜索关键词总数
  const keywordMatchRatio = matchedCount / searchKeywords.length;
  
  // 平均匹配质量
  const avgMatchQuality = matchedCount > 0 ? totalScore / matchedCount : 0;
  
  // 覆盖率：匹配的关键词数 / 目标关键词总数（额外加分）
  const coverageRatio = Math.min(matchedKeywords.size / targetKeywords.length, 1);
  
  // 综合得分：基础匹配度 * 平均质量 + 覆盖率加分
  const finalScore = keywordMatchRatio * avgMatchQuality * 0.8 + coverageRatio * 20;
  
  return Math.min(Math.round(finalScore * 100) / 100, 100);
}

/**
 * 计算两个字符串的语义相似度
 * 基于关键词提取和语义匹配
 * 
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度百分比 (0-100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) {
    return 0;
  }

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) {
    return 100;
  }

  // 提取关键词
  const keywords1 = extractKeywords(s1);
  const keywords2 = extractKeywords(s2);
  
  if (keywords1.length === 0 || keywords2.length === 0) {
    // 如果无法提取关键词，回退到简单的包含匹配
    if (s1.includes(s2) || s2.includes(s1)) {
      return 50;
    }
    return 0;
  }
  
  // 计算关键词匹配度
  const keywordMatch = calculateKeywordMatch(keywords1, keywords2);
  
  // 计算反向匹配度（取平均值）
  const reverseMatch = calculateKeywordMatch(keywords2, keywords1);
  
  // 综合匹配度
  const semanticScore = (keywordMatch + reverseMatch) / 2;
  
  // 如果完全匹配，返回100
  if (semanticScore >= 95) {
    return 100;
  }
  
  // 如果包含关系，给予额外加分
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.max(semanticScore, 60);
  }
  
  return Math.round(semanticScore * 100) / 100;
}

/**
 * 计算问题与答案的匹配度（基于语义理解）
 * 考虑问题文本和答案文本的语义相似度
 * 
 * @param question 搜索的问题
 * @param answer 答案对象
 * @returns 匹配度百分比 (0-100)
 */
export function calculateAnswerMatchScore(
  question: string,
  answer: { question: string; standard_answer: string }
): number {
  if (!question || !answer) {
    return 0;
  }

  const searchTerm = question.trim();
  const answerQuestion = answer.question?.trim() || "";
  const answerText = answer.standard_answer?.trim() || "";

  // 提取搜索关键词
  const searchKeywords = extractKeywords(searchTerm);
  
  // 计算问题相似度（权重 80%）
  const questionKeywords = extractKeywords(answerQuestion);
  const questionMatch = calculateKeywordMatch(searchKeywords, questionKeywords);
  
  // 计算答案文本相似度（权重 20%）
  const answerKeywords = extractKeywords(answerText);
  const answerMatch = calculateKeywordMatch(searchKeywords, answerKeywords);

  // 加权平均
  const matchScore = questionMatch * 0.8 + answerMatch * 0.2;
  
  // 如果问题完全匹配，给予高分
  if (questionMatch >= 90) {
    return Math.min(matchScore + 10, 100);
  }
  
  // 如果问题高度匹配，给予加分
  if (questionMatch >= 70) {
    return Math.min(matchScore + 5, 100);
  }

  return Math.round(matchScore * 100) / 100;
}

