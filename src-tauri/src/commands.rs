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

// 存储飞书凭证（内存中，实际应该持久化）
static CREDENTIALS: Mutex<Option<FeishuCredentials>> = Mutex::new(None);
static ACCESS_TOKEN: Mutex<Option<(String, i64)>> = Mutex::new(None); // (token, expire_timestamp)

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
                                if let serde_json::Value::Object(_obj) = first {
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

