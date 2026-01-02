import { useState, useEffect } from "react";
import { setAiConfig, loadAiConfig, testAiConnection } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { TestTube2, CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";

export default function AISettings() {
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

  useEffect(() => {
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
      await setAiConfig({
        api_key: aiApiKey,
        base_url: aiBaseUrl,
        model_id: aiModelId,
        request_timeout: aiRequestTimeout,
      });

      const result = await testAiConnection();
      setAiTestResult(result);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI 设置
        </CardTitle>
        <CardDescription>
          配置火山方舟 Ark AI 参数
          <br />
          <span className="text-xs text-amber-600 mt-1 block">
            注意：当前使用 localStorage 存储配置，Phase 2 将迁移至 Tauri secure storage
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
  );
}
