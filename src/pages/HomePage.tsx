import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, TrendingUp, X } from "lucide-react";
import Navigation from "../components/Navigation";

interface SearchHistoryItem {
  term: string;
  count: number;
  lastUsed: number;
}

const MAX_HISTORY_ITEMS = 12;
const STORAGE_KEY = "search_history";

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const navigate = useNavigate();

  // 加载搜索历史
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const history: SearchHistoryItem[] = JSON.parse(stored);
          // 按使用次数和最后使用时间排序
          const sorted = history
            .sort((a, b) => {
              // 先按使用次数排序，再按最后使用时间排序
              if (b.count !== a.count) return b.count - a.count;
              return b.lastUsed - a.lastUsed;
            })
            .slice(0, MAX_HISTORY_ITEMS);
          setSearchHistory(sorted);
        }
      } catch (error) {
        console.error("Failed to load search history:", error);
      }
    };
    loadHistory();
  }, []);

  // 保存搜索历史
  const saveSearchHistory = (term: string) => {
    if (!term.trim()) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let history: SearchHistoryItem[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = history.findIndex(item => item.term === term);
      const now = Date.now();
      
      if (existingIndex >= 0) {
        // 更新现有项
        history[existingIndex].count += 1;
        history[existingIndex].lastUsed = now;
      } else {
        // 添加新项
        history.push({
          term,
          count: 1,
          lastUsed: now,
        });
      }
      
      // 限制数量并排序
      history = history
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.lastUsed - a.lastUsed;
        })
        .slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const handleSearch = (term?: string) => {
    const finalTerm = term || searchTerm.trim();
    if (finalTerm) {
      saveSearchHistory(finalTerm);
      // 标记跳过答案列表页面的重复保存
      navigate("/answers", { state: { searchTerm: finalTerm, skipSaveHistory: true } });
    } else {
      navigate("/answers");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
    handleSearch(term);
  };

  const handleRemoveHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history: SearchHistoryItem[] = JSON.parse(stored);
        const filtered = history.filter(item => item.term !== term);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        setSearchHistory(filtered);
      }
    } catch (error) {
      console.error("Failed to remove search history:", error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 animate-gradient"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      
      <Navigation />
      
      {/* 主要内容区域 */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-4xl">
          {/* Logo区域 - 更简洁酷炫 */}
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex flex-col items-center gap-3 group cursor-default">
              {/* Logo图标和文字组合 */}
              <div className="relative">
                {/* 背景光晕 */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                
                {/* Logo容器 */}
                <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl px-8 py-6 shadow-xl border border-white/60 group-hover:shadow-2xl group-hover:border-blue-200/50 transition-all duration-500">
                  {/* 渐变装饰条 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl"></div>
                  
                  {/* Logo文字 */}
                  <div className="relative">
                    <h1 className="text-5xl font-black tracking-tight">
                      <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm group-hover:drop-shadow-md transition-all duration-500">
                        A3
                      </span>
                    </h1>
                  </div>
                </div>
              </div>
              
              {/* 副标题 */}
              <p className="text-sm text-gray-500 font-medium tracking-wider uppercase relative z-10">knowledge base</p>
            </div>
          </div>
          
          {/* 搜索框 - 更简洁酷炫 */}
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 mb-8">
            <div className="glass rounded-2xl p-1 shadow-xl border border-white/40">
              <div className="relative flex items-center">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <Input
                  type="text"
                  placeholder="搜索问题、标准回答或对应产品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-11 pr-32 h-14 text-base bg-white/90 backdrop-blur-sm border-0 focus-visible:ring-0 shadow-inner rounded-2xl"
                />
                <Button
                  onClick={() => handleSearch()}
                  size="lg"
                  className="absolute right-2 h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105 rounded-xl text-base font-semibold"
                >
                  <Search className="w-4 h-4 mr-2" />
                  搜索
                </Button>
              </div>
            </div>
          </div>
          
          {/* 搜索历史 - 更小更简洁 */}
          {searchHistory.length > 0 && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="flex flex-wrap justify-center gap-2">
                {searchHistory.slice(0, 8).map((item, index) => (
                  <button
                    key={item.term}
                    onClick={() => handleHistoryClick(item.term)}
                    className="group relative px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40 hover:bg-white/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 hover:scale-105 text-left"
                    style={{
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors truncate max-w-[120px]">
                        {item.term}
                      </span>
                      <div className="flex items-center gap-1 opacity-60">
                        <TrendingUp className="w-2.5 h-2.5 text-gray-400" />
                        <span className="text-[10px] text-gray-500">
                          {item.count}
                        </span>
                      </div>
                      <div
                        onClick={(e) => handleRemoveHistory(item.term, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-all duration-200 ml-1 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRemoveHistory(item.term, e as any);
                          }
                        }}
                      >
                        <X className="w-2.5 h-2.5 text-gray-400 hover:text-red-500" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 底部版本号和版权信息 */}
      <div className="relative pb-8 text-center">
        <div className="inline-flex items-center gap-4 px-6 py-3 glass rounded-full border border-white/30 shadow-lg backdrop-blur-xl group cursor-default transition-all duration-300 hover:shadow-xl hover:border-blue-300/50 hover:scale-105">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300">
              v.1.0
            </span>
            <span className="text-gray-400 group-hover:text-gray-500 transition-colors">•</span>
            <span className="text-sm text-gray-600 group-hover:text-gray-800 font-medium transition-colors duration-300">
              版权：<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300 font-semibold">云集创想</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
