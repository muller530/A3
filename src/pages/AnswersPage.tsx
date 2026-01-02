import { useEffect, useState } from "react";
import { listAnswers, loadFeishuConfig, Answer } from "../lib/api";

export function AnswersPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    async function fetchAnswers() {
      try {
        setLoading(true);
        setError(null);

        const config = loadFeishuConfig();
        if (!config || !config.appToken || !config.tableId) {
          throw new Error("请先在设置页面配置飞书凭证和表格信息");
        }

        const data = await listAnswers(config.appToken, config.tableId);
        console.log("answers loaded", data);
        setAnswers(data);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "加载答案列表失败");
        setLoading(false);
      }
    }

    fetchAnswers();
  }, []);

  if (loading) {
    return (
      <div>
        <h1>答案列表</h1>
        <div>加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>答案列表</h1>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div>
      <h1>答案列表</h1>
      <ul>
        {answers.map((answer) => (
          <li key={answer.record_id}>{answer.question}</li>
        ))}
      </ul>
    </div>
  );
}

export default AnswersPage;
