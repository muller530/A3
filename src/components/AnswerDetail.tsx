import { Answer } from "../types/answer";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface AnswerDetailProps {
  answer: Answer;
}

export function AnswerDetail({ answer }: AnswerDetailProps) {
  return (
    <div className="pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>知识库详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-medium text-sm text-gray-700 mb-1">问题</div>
              <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                {answer.question}
              </div>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-700 mb-1">标准回答</div>
              <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                {answer.standard_answer}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">状态</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {answer.enable_status}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">使用场景</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {answer.scene}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">语气</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {answer.tone}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">对应产品</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {answer.product_name}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">产品ID</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                  {answer.product_id}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">记录ID</div>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                  {answer.record_id}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
