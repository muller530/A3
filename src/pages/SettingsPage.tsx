import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navigation from "../components/Navigation";
import AccountSettings from "../components/settings/AccountSettings";
import FeishuSettings from "../components/settings/FeishuSettings";
import AISettings from "../components/settings/AISettings";
import TableSettings from "../components/settings/TableSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { User, Cloud, Sparkles, Database } from "lucide-react";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const validTabs = ["account", "feishu", "table", "ai"];
  const defaultTab = validTabs.includes(tabParam || "") ? tabParam! : "account";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen relative">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -z-10"></div>
      
      <Navigation />
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">设置中心</h1>
            <p className="text-gray-600 font-medium">管理您的账号、飞书和 AI 配置</p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                账号设置
              </TabsTrigger>
              <TabsTrigger value="feishu" className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                飞书设置
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                表格选择
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI 设置
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="mt-6">
              <AccountSettings />
            </TabsContent>
            
            <TabsContent value="feishu" className="mt-6">
              <FeishuSettings />
            </TabsContent>
            
            <TabsContent value="table" className="mt-6">
              <TableSettings />
            </TabsContent>
            
            <TabsContent value="ai" className="mt-6">
              <AISettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
