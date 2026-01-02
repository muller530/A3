import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Home, Settings, FileText, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function Navigation() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = [useRef<HTMLAnchorElement>(null), useRef<HTMLAnchorElement>(null), useRef<HTMLAnchorElement>(null)];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 更新滑动指示器位置
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;
      
      const activeIndex = isActive("/") ? 0 : isActive("/answers") ? 1 : isActive("/settings") ? 2 : 0;
      const activeButton = buttonRefs[activeIndex]?.current;
      
      if (activeButton && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        setIndicatorStyle({
          width: buttonRect.width,
          left: buttonRect.left - navRect.left,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20 shadow-lg backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - 左侧 */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              {/* 背景光晕 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              
              {/* Logo图标容器 */}
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg px-3 py-1.5 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <span className="text-lg font-black text-white tracking-tight">A3</span>
              </div>
            </div>
            
            {/* Logo文字 */}
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                knowledge
              </span>
              <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors duration-300">
                base
              </span>
            </div>
          </Link>
          
          {/* 右侧内容 */}
          <div className="flex items-center gap-3">
            <div ref={navRef} className="relative inline-flex items-center bg-white/50 rounded-lg p-1 backdrop-blur-sm">
              {/* 滑动指示器 - 使用实际测量位置 */}
              <div 
                className="absolute h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-lg shadow-blue-500/40"
                style={{
                  width: `${indicatorStyle.width}px`,
                  left: `${indicatorStyle.left}px`,
                }}
              />
              
              {/* 导航按钮 */}
              <Link ref={buttonRefs[0]} to="/" className="relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 transition-all duration-300 relative px-4 ${
                    isActive("/") 
                      ? "text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Home className={`w-4 h-4 transition-all duration-300 ${isActive("/") ? "text-white" : "text-gray-500"}`} />
                  <span className={`transition-all duration-300 ${isActive("/") ? "font-semibold" : "font-medium"}`}>首页</span>
                </Button>
              </Link>
              <Link ref={buttonRefs[1]} to="/answers" className="relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 transition-all duration-300 relative px-4 ${
                    isActive("/answers") 
                      ? "text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileText className={`w-4 h-4 transition-all duration-300 ${isActive("/answers") ? "text-white" : "text-gray-500"}`} />
                  <span className={`transition-all duration-300 ${isActive("/answers") ? "font-semibold" : "font-medium"}`}>知识库</span>
                </Button>
              </Link>
              <Link ref={buttonRefs[2]} to="/settings" className="relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 transition-all duration-300 relative px-4 ${
                    isActive("/settings") 
                      ? "text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Settings className={`w-4 h-4 transition-all duration-300 ${isActive("/settings") ? "text-white" : "text-gray-500"}`} />
                  <span className={`transition-all duration-300 ${isActive("/settings") ? "font-semibold" : "font-medium"}`}>设置</span>
                </Button>
              </Link>
            </div>
            <span className="text-sm font-medium text-gray-700 bg-white/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              角色: <span className="text-blue-600 font-semibold">{role}</span>
            </span>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              size="sm"
              className="bg-white/60 backdrop-blur-sm hover:bg-white/80 border-white/40 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

