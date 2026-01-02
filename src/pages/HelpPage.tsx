import Navigation from "../components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen, User, Database, Sparkles, Settings, Search, Shield, CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="min-h-screen relative">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -z-10"></div>
      
      <Navigation />
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-blue-600" />
              使用说明
            </h1>
            <p className="text-gray-600 font-medium">A3 客服知识库工具完整使用指南</p>
          </div>

          <div className="space-y-6">
            {/* 软件简介 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  软件简介
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-700">
                <p>
                  <strong>A3 客服知识库工具</strong>是一款基于 Tauri + React 开发的桌面端应用，用于管理和查询客服知识库内容。
                  该工具集成了飞书多维表格（Bitable）作为数据源，支持 AI 优化和审核功能，帮助客服团队更高效地管理和使用知识库。
                </p>
                <p>
                  <strong>主要功能：</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>从飞书 Bitable 同步知识库数据</li>
                  <li>智能搜索和过滤答案</li>
                  <li>AI 优化和审核答案内容</li>
                  <li>用户权限管理（普通用户/管理员）</li>
                  <li>将优化后的内容写回飞书</li>
                </ul>
              </CardContent>
            </Card>

            {/* 快速开始 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  快速开始
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">1. 首次使用</h3>
                  <p className="text-gray-700">
                    应用启动后，您将以<strong>访客用户</strong>身份自动登录，可以浏览首页和知识库内容。
                    如需访问设置功能，需要先登录账号。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">2. 登录账号</h3>
                  <p className="text-gray-700">
                    点击导航栏的<strong>"登录"</strong>按钮，输入您的用户名和密码进行登录。
                    如需账号信息，请联系系统管理员。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">3. 配置飞书</h3>
                  <p className="text-gray-700">
                    登录后，进入<strong>"设置"</strong>页面，配置飞书凭证信息：
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>App ID：飞书应用的 App ID</li>
                    <li>App Secret：飞书应用的 App Secret</li>
                    <li>App Token：Bitable 应用的 Token</li>
                    <li>表格 ID：需要同步的表格 ID</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 功能说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  功能说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    知识库搜索
                  </h3>
                  <p className="text-gray-700">
                    在<strong>"知识库"</strong>页面，您可以：
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>搜索问题、标准回答或对应产品</li>
                    <li>查看答案详情，包括问题、回答、产品信息等</li>
                    <li>使用 AI 优化功能改进答案内容</li>
                    <li>使用 AI 审核功能检查答案质量</li>
                    <li>同步数据以获取最新的知识库内容</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI 功能
                  </h3>
                  <p className="text-gray-700">
                    <strong>AI 优化：</strong>使用 AI 技术优化答案内容，使其更加清晰、准确、易读。
                  </p>
                  <p className="text-gray-700">
                    <strong>AI 审核：</strong>检查答案内容是否存在风险、错误或不合适的内容。
                  </p>
                  <p className="text-gray-700">
                    <strong>注意：</strong>AI 功能需要在<strong>"设置"</strong>页面配置 AI API 信息。
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    数据同步
                  </h3>
                  <p className="text-gray-700">
                    点击<strong>"同步数据"</strong>按钮，从飞书 Bitable 同步最新的知识库数据。
                    同步的数据会缓存在本地，提高访问速度。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 用户权限 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  用户权限说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    普通用户权限
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>查看和搜索知识库答案</li>
                    <li>使用 AI 优化和审核功能</li>
                    <li>查看答案详情</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    管理员权限
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700">
                    <li>所有普通用户权限</li>
                    <li>将 AI 优化/审核结果写回飞书</li>
                    <li>修改答案状态为"已通过"</li>
                    <li>配置飞书和 AI 设置</li>
                    <li>管理用户账号和权限</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 设置说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  设置说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">账号设置</h3>
                  <p className="text-gray-700">
                    查看当前登录用户信息、角色和权限说明。<strong>管理员</strong>可以在此管理用户账号，添加、编辑或删除用户。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">飞书设置</h3>
                  <p className="text-gray-700">
                    配置飞书应用的凭证信息，包括 App ID、App Secret、App Token 和表格 ID。
                    配置完成后可以测试连接是否正常。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">表格选择</h3>
                  <p className="text-gray-700">
                    选择需要同步的飞书 Bitable 表格。可以配置多个表格，切换不同的数据源。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">AI 设置</h3>
                  <p className="text-gray-700">
                    配置 AI 服务的 API 信息，包括 API Key、Base URL 和 Model ID。
                    配置完成后可以测试 AI 连接是否正常。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 常见问题 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  常见问题
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">Q: 如何获取飞书凭证？</h3>
                  <p className="text-gray-700">
                    A: 需要在飞书开放平台创建应用，获取 App ID 和 App Secret。
                    App Token 可以从 Bitable 表格的链接中提取，表格 ID 也需要从链接中获取。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">Q: 数据同步失败怎么办？</h3>
                  <p className="text-gray-700">
                    A: 请检查飞书凭证配置是否正确，确保应用有访问 Bitable 的权限。
                    可以在设置页面测试连接，查看具体错误信息。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">Q: AI 功能无法使用？</h3>
                  <p className="text-gray-700">
                    A: 请确保已在设置页面配置了正确的 AI API 信息。
                    管理员可以在"AI 设置"中配置和测试 AI 连接。
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-800">Q: 如何添加新用户？</h3>
                  <p className="text-gray-700">
                    A: 管理员登录后，进入"设置" → "账号设置" → "管理用户"，
                    可以添加新用户并设置角色（普通用户或管理员）。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 技术支持 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  技术支持
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700">
                <p>
                  如遇到问题或需要帮助，请联系技术支持团队。
                  版本信息：<strong>v0.1.0</strong>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
