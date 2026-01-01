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

