use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct FeishuCredentials {
    pub app_id: String,
    pub app_secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessTokenResponse {
    pub code: i32,
    pub msg: String,
    pub tenant_access_token: Option<String>,
    pub expire: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BitableTable {
    pub table_id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BitableTablesResponse {
    pub code: i32,
    pub msg: String,
    pub data: Option<BitableTablesData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BitableTablesData {
    pub items: Vec<BitableTable>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnswerRecord {
    pub record_id: String,
    pub fields: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BitableRecordsResponse {
    pub code: i32,
    pub msg: String,
    pub data: Option<BitableRecordsData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BitableRecordsData {
    pub items: Vec<AnswerRecord>,
    pub has_more: bool,
    pub page_token: Option<String>,
}

// Answers 表的结构化数据
#[derive(Debug, Serialize, Deserialize)]
pub struct Answer {
    pub record_id: String,
    pub question: String,           // 问题
    pub standard_answer: String,     // 标准回答
    pub enable_status: String,       // 状态（启用 / 停用）
    pub scene: String,              // 使用场景
    pub tone: String,               // 语气
    pub product_name: String,       // 对应产品
    pub product_id: String,         // product_id
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_fields: Option<HashMap<String, serde_json::Value>>, // 原始字段数据（用于调试）
}

// AI 配置结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiConfig {
    pub api_key: String,
    pub api_base: String,
    pub model: String,
}

// 存储飞书凭证（内存中，实际应该持久化）
static CREDENTIALS: Mutex<Option<FeishuCredentials>> = Mutex::new(None);
static ACCESS_TOKEN: Mutex<Option<(String, i64)>> = Mutex::new(None); // (token, expire_timestamp)
static AI_CONFIG: Mutex<Option<AiConfig>> = Mutex::new(None);

const FEISHU_API_BASE: &str = "https://open.feishu.cn/open-apis";

#[tauri::command]
pub async fn set_feishu_credentials(app_id: String, app_secret: String) -> Result<String, String> {
    let creds = FeishuCredentials { app_id, app_secret };
    *CREDENTIALS.lock().unwrap() = Some(creds);
    // 清除旧的 token
    *ACCESS_TOKEN.lock().unwrap() = None;
    Ok("凭证已保存".to_string())
}

#[tauri::command]
pub async fn get_feishu_access_token() -> Result<String, String> {
    // 检查是否有缓存的 token
    {
        let token_guard = ACCESS_TOKEN.lock().unwrap();
        if let Some((token, expire_at)) = token_guard.as_ref() {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            if now < *expire_at - 60 {
                // 提前 60 秒刷新
                return Ok(token.clone());
            }
        }
    }

    // 获取凭证（在 await 之前克隆数据并释放锁）
    let (app_id, app_secret) = {
        let creds = CREDENTIALS.lock().unwrap();
        let creds = creds.as_ref().ok_or("请先配置飞书凭证")?;
        (creds.app_id.clone(), creds.app_secret.clone())
    };

    // 请求 access_token
    let client = reqwest::Client::new();
    let url = format!("{}/auth/v3/tenant_access_token/internal", FEISHU_API_BASE);
    let body = serde_json::json!({
        "app_id": app_id,
        "app_secret": app_secret,
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            // 提供更友好的错误信息
            let error_msg = e.to_string();
            if error_msg.contains("timeout") || error_msg.contains("timed out") {
                "网络请求超时，请检查网络连接".to_string()
            } else if error_msg.contains("resolve") || error_msg.contains("DNS") {
                "无法解析域名，请检查网络连接或 DNS 设置".to_string()
            } else if error_msg.contains("connection refused") || error_msg.contains("Connection refused") {
                "连接被拒绝，请检查网络连接或防火墙设置".to_string()
            } else {
                format!("网络请求失败: {}", error_msg)
            }
        })?;

    let token_res: AccessTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if token_res.code != 0 {
        return Err(format!("获取 token 失败: {}", token_res.msg));
    }

    let token = token_res.tenant_access_token.ok_or("响应中缺少 token")?;
    let expire = token_res.expire.unwrap_or(7200);
    let expire_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        + expire as i64;

    // 缓存 token
    *ACCESS_TOKEN.lock().unwrap() = Some((token.clone(), expire_at));

    Ok(token)
}

#[tauri::command]
pub async fn get_bitable_tables(app_token: String) -> Result<Vec<BitableTable>, String> {
    let token = get_feishu_access_token().await?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bitable/v1/apps/{}/tables",
        FEISHU_API_BASE, app_token
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let tables_res: BitableTablesResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if tables_res.code != 0 {
        return Err(format!("获取表格列表失败: {}", tables_res.msg));
    }

    let items = tables_res
        .data
        .ok_or("响应中缺少数据")?
        .items;

    Ok(items)
}

#[tauri::command]
pub async fn get_answers_data(
    app_token: String,
    table_id: String,
) -> Result<Vec<AnswerRecord>, String> {
    let token = get_feishu_access_token().await?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bitable/v1/apps/{}/tables/{}/records",
        FEISHU_API_BASE, app_token, table_id
    );

    let mut all_records = Vec::new();
    let mut page_token: Option<String> = None;

    loop {
        let mut request = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token));

        if let Some(token) = &page_token {
            request = request.query(&[("page_token", token)]);
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("网络请求失败: {}", e))?;

        let records_res: BitableRecordsResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        if records_res.code != 0 {
            return Err(format!("获取记录失败: {}", records_res.msg));
        }

        let data = records_res.data.ok_or("响应中缺少数据")?;
        all_records.extend(data.items);

        if !data.has_more {
            break;
        }

        page_token = data.page_token;
        if page_token.is_none() {
            break;
        }
    }

    Ok(all_records)
}

// 从字段中安全获取字符串值，缺失时返回 "-"
fn get_field_string(fields: &HashMap<String, serde_json::Value>, keys: &[&str]) -> String {
    for key in keys {
        if let Some(value) = fields.get(*key) {
            match value {
                serde_json::Value::String(s) if !s.is_empty() => return s.clone(),
                serde_json::Value::Number(n) => return n.to_string(),
                serde_json::Value::Bool(b) => return b.to_string(),
                serde_json::Value::Null => continue,
                _ => {
                    // 尝试从数组中提取文本（处理选项类型字段，如"状态"字段）
                    if let serde_json::Value::Array(arr) = value {
                        if !arr.is_empty() {
                            // 遍历数组中的所有元素
                            for item in arr {
                                // 如果是对象，尝试提取各种可能的属性
                                if let serde_json::Value::Object(obj) = item {
                                    // 优先尝试 text 属性（飞书选项字段常用）
                                    if let Some(text_val) = obj.get("text") {
                                        if let serde_json::Value::String(s) = text_val {
                                            if !s.is_empty() {
                                                return s.clone();
                                            }
                                        }
                                    }
                                    // 尝试 name 属性
                                    if let Some(name_val) = obj.get("name") {
                                        if let serde_json::Value::String(s) = name_val {
                                            if !s.is_empty() {
                                                return s.clone();
                                            }
                                        }
                                    }
                                    // 尝试 option_name 属性
                                    if let Some(option_name_val) = obj.get("option_name") {
                                        if let serde_json::Value::String(s) = option_name_val {
                                            if !s.is_empty() {
                                                return s.clone();
                                            }
                                        }
                                    }
                                    // 尝试 label 属性
                                    if let Some(label_val) = obj.get("label") {
                                        if let serde_json::Value::String(s) = label_val {
                                            if !s.is_empty() {
                                                return s.clone();
                                            }
                                        }
                                    }
                                }
                                // 如果数组元素本身就是字符串，直接返回
                                if let serde_json::Value::String(s) = item {
                                    if !s.is_empty() {
                                        return s.clone();
                                    }
                                }
                            }
                            // 如果数组不为空但没找到有效值，尝试提取第一个元素的字符串表示
                            if let Some(first) = arr.first() {
                                if first.is_object() {
                                    // 尝试序列化为字符串（作为最后手段）
                                    if let Ok(json_str) = serde_json::to_string(first) {
                                        if !json_str.is_empty() && json_str != "{}" {
                                            return json_str;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // 尝试从对象中提取文本
                    if let serde_json::Value::Object(obj) = value {
                        // 飞书选项字段可能的结构
                        if let Some(text) = obj.get("text") {
                            if let Some(s) = text.as_str() {
                                if !s.is_empty() {
                                    return s.to_string();
                                }
                            }
                        }
                        if let Some(name) = obj.get("name") {
                            if let Some(s) = name.as_str() {
                                if !s.is_empty() {
                                    return s.to_string();
                                }
                            }
                        }
                        // 尝试提取 option_id 或 option_name
                        if let Some(option_name) = obj.get("option_name") {
                            if let Some(s) = option_name.as_str() {
                                if !s.is_empty() {
                                    return s.to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    "-".to_string()
}

#[tauri::command]
pub async fn list_answers(
    app_token: String,
    table_id: String,
) -> Result<Vec<Answer>, String> {
    // 获取 access token
    let token = get_feishu_access_token().await?;
    
    // 构建 API URL
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bitable/v1/apps/{}/tables/{}/records",
        FEISHU_API_BASE, app_token, table_id
    );

    let mut all_records = Vec::new();
    let mut page_token: Option<String> = None;

    // 分页获取所有记录
    loop {
        let mut request = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token));

        if let Some(token) = &page_token {
            request = request.query(&[("page_token", token)]);
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("网络请求失败: {}", e))?;

        let records_res: BitableRecordsResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        if records_res.code != 0 {
            return Err(format!("获取记录失败: {}", records_res.msg));
        }

        let data = records_res.data.ok_or("响应中缺少数据")?;
        all_records.extend(data.items);

        if !data.has_more {
            break;
        }

        page_token = data.page_token;
        if page_token.is_none() {
            break;
        }
    }

    // 字段映射和容错处理（使用飞书实际字段名）
    let answers: Vec<Answer> = all_records
        .into_iter()
        .map(|record| {
            Answer {
                record_id: record.record_id.clone(),
                // 问题字段
                question: get_field_string(&record.fields, &["问题"]),
                // 标准回答字段
                standard_answer: get_field_string(&record.fields, &["标准回答"]),
                // 状态字段（选项类型，可能是数组格式）
                enable_status: get_field_string(&record.fields, &["状态"]),
                // 使用场景字段
                scene: get_field_string(&record.fields, &["使用场景"]),
                // 语气字段
                tone: get_field_string(&record.fields, &["语气"]),
                // 对应产品字段
                product_name: get_field_string(&record.fields, &["对应产品"]),
                // product_id字段
                product_id: get_field_string(&record.fields, &["product_id"]),
                raw_fields: Some(record.fields), // 保存原始字段数据用于调试
            }
        })
        .collect();

    Ok(answers)
}

// AI 相关命令

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatResponse {
    choices: Option<Vec<ChatChoice>>,
    error: Option<ChatError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
    finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatError {
    message: String,
    code: Option<String>,
}

async fn call_ai_api(prompt: String) -> Result<String, String> {
    // 在 await 之前克隆配置数据
    let (api_base, api_key, model) = {
        let config_guard = AI_CONFIG.lock().unwrap();
        let config = config_guard.as_ref().ok_or("请先配置 AI 设置")?;
        (config.api_base.clone(), config.api_key.clone(), config.model.clone())
    };

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", api_base);

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: prompt,
    }];

    let request = ChatRequest {
        model: model.clone(),
        messages,
        temperature: Some(0.7),
        max_tokens: Some(2000),
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("API 请求失败 ({}): {}", status, response_text));
    }

    let chat_response: ChatResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(error) = chat_response.error {
        return Err(format!("API 错误: {}", error.message));
    }

    if let Some(choices) = chat_response.choices {
        if let Some(choice) = choices.first() {
            if let Some(message) = &choice.message {
                return Ok(message.content.clone());
            }
        }
    }

    Err("API 响应格式错误".to_string())
}

#[tauri::command]
pub async fn optimize_answer_with_ai(
    answer: String,
    context: Option<String>,
) -> Result<String, String> {
    let context_str = context.unwrap_or_default();
    
    // 计算原回复字数（中文字符数）
    let original_char_count = answer.chars().count();
    let max_char_count = (original_char_count as f64 * 1.5) as usize;
    
    let prompt = format!(
        r#"你是一位专业的客服回复优化专家。这是一项"保守编辑任务（Conservative Editing）"，不是重写。

【核心原则】
1. 保持原有结论与核心语义不变
2. 仅优化表达、语气、专业边界
3. 禁止无理由改变原回复结论
4. 只有在以下情况允许纠正原回复：
   - 明显事实错误
   - 食品/营养专业不严谨
   - 合规或误导风险
   如纠正，必须在【内部优化说明】中标注"纠正原因"

【字数限制（严格）】
- 原回复字数：{} 字
- 优化后回复字数上限：{} 字（不超过原字数的150%）
- 超出上限将被拒绝，请务必控制字数

上下文信息：
{}

原始客服回复：
{}

请按照以下格式输出：
【最终客服回复】
<优化后的客服回复内容（字数≤{}字）>

【内部优化说明】
<优化说明，包括优化点、改进原因等>
<如纠正原回复，必须标注"纠正原因：<具体原因>">

要求：
1. 保持原意的准确性（核心语义不变）
2. 语言更加专业和友好
3. 结构清晰，易于理解
4. 符合客服场景的语气要求
5. 严格控制在{}字以内"#,
        original_char_count, max_char_count, context_str, answer, max_char_count, max_char_count
    );

    let result = call_ai_api(prompt).await?;
    
    // 后处理：检查字数是否超出限制
    if let Some(answer_section) = result.find("【最终客服回复】") {
        let answer_start = answer_section + "【最终客服回复】".len();
        let answer_end = result[answer_start..].find("【内部优化说明】")
            .map(|i| answer_start + i)
            .unwrap_or(result.len());
        let optimized_answer = result[answer_start..answer_end].trim();
        let optimized_char_count = optimized_answer.chars().count();
        
        if optimized_char_count > max_char_count {
            return Err(format!(
                "优化后回复字数（{}字）超出限制（{}字），超出{}%。请压缩内容或重新优化。",
                optimized_char_count,
                max_char_count,
                ((optimized_char_count as f64 / max_char_count as f64 - 1.0) * 100.0) as usize
            ));
        }
    }
    
    Ok(result)
}

#[tauri::command]
pub async fn review_answer_with_ai(
    answer: String,
    context: Option<String>,
) -> Result<String, String> {
    let context_str = context.unwrap_or_default();
    let prompt = format!(
        r#"你是一位专业的客服回复审核专家。请审核以下客服回复，判断其是否合理、专业、准确。

上下文信息：
{}

待审核的客服回复：
{}

请按照以下格式输出：
【审核结论】= 合理 / 基本合理 / 需修改

【专业判断说明】
<详细说明专业判断的理由，包括回复的准确性、专业性、友好度等方面的评估>

【潜在风险或注意点】
<列出可能存在的风险、问题或需要注意的地方>

【修改建议】（仅在"需修改"或"基本合理但可优化"时提供）
<具体的修改建议>

【需修改原因】（仅在"需修改"时提供）
<详细说明为什么需要修改，指出具体的问题>

【修改后推荐回复】（仅在"需修改"时提供）
<提供修改后的推荐回复内容>

【修改依据（专家原则）】
<说明修改依据的专业原则和标准>

要求：
1. 严格审核回复的准确性和专业性
2. 识别潜在的风险和问题
3. 如需修改，必须提供明确的修改原因和推荐回复
4. 判断要客观、专业"#,
        context_str, answer
    );

    call_ai_api(prompt).await
}

#[tauri::command]
pub async fn check_answer_risk(
    answer: String,
) -> Result<HashMap<String, serde_json::Value>, String> {
    let prompt = format!(
        r#"你是一位专业的风险检测专家。请快速检测以下客服回复是否存在风险。

待检测的客服回复：
{}

请按照以下格式输出（必须严格遵循）：
RISK = YES / NO
REASON = 一句话原因说明

要求：
1. 如果存在风险（如误导、错误信息、不当表述等），输出 RISK = YES
2. 如果无风险，输出 RISK = NO
3. REASON 必须是一句话简要说明原因
4. 只输出这两行，不要有其他内容"#,
        answer
    );

    let result = call_ai_api(prompt).await?;
    
    let mut response = HashMap::new();
    let mut has_risk = false;
    let mut reason = String::new();

    for line in result.lines() {
        let line = line.trim();
        if line.starts_with("RISK") {
            if line.contains("YES") || line.contains("yes") || line.contains("Yes") {
                has_risk = true;
            }
        } else if line.starts_with("REASON") {
            if let Some(colon_idx) = line.find('=') {
                reason = line[colon_idx + 1..].trim().to_string();
            }
        }
    }

    response.insert("hasRisk".to_string(), serde_json::json!(has_risk));
    response.insert("reason".to_string(), serde_json::json!(reason));

    Ok(response)
}

#[tauri::command]
pub async fn set_ai_config(
    api_key: String,
    api_base: String,
    model: String,
) -> Result<String, String> {
    let config = AiConfig {
        api_key,
        api_base,
        model,
    };
    *AI_CONFIG.lock().unwrap() = Some(config);
    Ok("AI 配置已保存".to_string())
}

#[tauri::command]
pub async fn get_ai_config() -> Result<Option<AiConfig>, String> {
    Ok(AI_CONFIG.lock().unwrap().clone())
}

#[tauri::command]
pub async fn test_feishu_connection(app_id: String, app_secret: String) -> Result<String, String> {
    if app_id.is_empty() || app_secret.is_empty() {
        return Err("请先填写 App ID 和 App Secret".to_string());
    }

    // 直接请求 access_token 来测试连接
    let client = reqwest::Client::new();
    let url = format!("{}/auth/v3/tenant_access_token/internal", FEISHU_API_BASE);
    let body = serde_json::json!({
        "app_id": app_id,
        "app_secret": app_secret,
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            // 提供更友好的错误信息
            let error_msg = e.to_string();
            if error_msg.contains("timeout") || error_msg.contains("timed out") {
                "连接失败: 网络请求超时，请检查网络连接".to_string()
            } else if error_msg.contains("resolve") || error_msg.contains("DNS") {
                "连接失败: 无法解析域名，请检查网络连接或 DNS 设置".to_string()
            } else if error_msg.contains("connection refused") || error_msg.contains("Connection refused") {
                "连接失败: 连接被拒绝，请检查网络连接或防火墙设置".to_string()
            } else {
                format!("连接失败: {}", error_msg)
            }
        })?;

    let token_res: AccessTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("连接失败: 解析响应失败 - {}", e))?;

    if token_res.code != 0 {
        // 根据错误代码提供更详细的说明
        let error_msg = match token_res.code {
            99991663 => format!("连接失败: App ID 无效或不存在 (错误代码: {})", token_res.code),
            99991664 => format!("连接失败: App Secret 无效或错误 (错误代码: {})", token_res.code),
            _ => format!("连接失败: {} (错误代码: {})", token_res.msg, token_res.code),
        };
        return Err(error_msg);
    }

    if token_res.tenant_access_token.is_none() {
        return Err("连接失败: 响应中缺少 tenant_access_token".to_string());
    }

    Ok("连接测试成功！已成功获取 tenant_access_token".to_string())
}

#[tauri::command]
pub async fn test_ai_connection() -> Result<String, String> {
    // 在 await 之前检查配置
    {
        let config_guard = AI_CONFIG.lock().unwrap();
        if config_guard.is_none() {
            return Err("请先配置 AI 设置".to_string());
        }
    }

    let prompt = "请回复：连接成功".to_string();
    let result = call_ai_api(prompt).await?;
    Ok(format!("AI 连接测试成功！模型回复：{}", result))
}

#[tauri::command]
pub async fn get_bitable_record(
    app_token: String,
    table_id: String,
    record_id: String,
) -> Result<AnswerRecord, String> {
    let token = get_feishu_access_token().await?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bitable/v1/apps/{}/tables/{}/records/{}",
        FEISHU_API_BASE, app_token, table_id, record_id
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;
    
    let result: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(code) = result.get("code").and_then(|v| v.as_i64()) {
        if code != 0 {
            let msg = result.get("msg")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            return Err(format!("获取记录失败: {}", msg));
        }
    }

    let record_data = result.get("data")
        .and_then(|v| v.get("record"))
        .ok_or("响应中缺少记录数据")?;

    let record: AnswerRecord = serde_json::from_value(record_data.clone())
        .map_err(|e| format!("解析记录失败: {}", e))?;

    Ok(record)
}

#[tauri::command]
pub async fn update_answer_to_feishu(
    app_token: String,
    table_id: String,
    record_id: String,
    fields: HashMap<String, serde_json::Value>,
) -> Result<String, String> {
    let token = get_feishu_access_token().await?;
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bitable/v1/apps/{}/tables/{}/records/{}",
        FEISHU_API_BASE, app_token, table_id, record_id
    );

    // 构建更新请求体
    let update_body = serde_json::json!({
        "fields": fields
    });

    let response = client
        .put(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&update_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("更新失败 ({}): {}", status, response_text));
    }

    // 解析响应
    let result: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败: {}", e))?;

    if let Some(code) = result.get("code").and_then(|v| v.as_i64()) {
        if code != 0 {
            let msg = result.get("msg")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            return Err(format!("更新失败: {}", msg));
        }
    }

    Ok("更新成功".to_string())
}

#[tauri::command]
pub async fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    let shell = app.shell();
    shell.open(url, None).map_err(|e| format!("打开链接失败: {}", e))?;
    Ok(())
}
