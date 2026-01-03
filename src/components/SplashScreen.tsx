import { useEffect, useState } from "react";
import { Sparkles, Zap, Rocket } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 动画阶段：0-加载中, 1-完成, 2-淡出
    const phases = [
      { duration: 3000, target: 70 }, // 第一阶段：快速加载到70%
      { duration: 2000, target: 90 },  // 第二阶段：加载到90%
      { duration: 1500, target: 100 }, // 第三阶段：完成加载
    ];

    let currentPhase = 0;
    let startTime = Date.now();
    let currentProgress = 0;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const phase = phases[currentPhase];

      if (elapsed < phase.duration) {
        // 平滑过渡到目标进度
        const progressRatio = elapsed / phase.duration;
        const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
        currentProgress = currentProgress + (phase.target - currentProgress) * easeOutCubic;
        setProgress(Math.min(currentProgress, phase.target));
        requestAnimationFrame(animate);
      } else {
        currentProgress = phase.target;
        setProgress(phase.target);
        currentPhase++;

        if (currentPhase < phases.length) {
          startTime = now;
          setPhase(currentPhase);
          requestAnimationFrame(animate);
        } else {
          // 所有阶段完成，等待一下后淡出
          setTimeout(() => {
            setPhase(3);
            setTimeout(() => {
              onComplete();
            }, 800);
          }, 1000);
        }
      }
    };

    requestAnimationFrame(animate);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        phase === 3 ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
      }}
    >
      {/* 背景动画粒子 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 animate-pulse"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Logo 区域 */}
        <div className="mb-8 relative">
          <div className="relative">
            {/* 外层光晕 */}
            <div className="absolute inset-0 bg-white/30 rounded-full blur-3xl animate-pulse" />
            
            {/* 图标容器 */}
            <div className="relative bg-white/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
              <div className="flex items-center justify-center">
                <Sparkles className="w-20 h-20 text-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* 应用名称 */}
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg animate-fade-in">
          A3 Knowledge Base
        </h1>
        <p className="text-xl text-white/90 mb-12 drop-shadow-md animate-fade-in-delay">
          智能知识库管理系统
        </p>

        {/* 加载动画图标 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Rocket className="w-8 h-8 text-white animate-bounce" style={{ animationDelay: "0s" }} />
          </div>
          <div className="relative">
            <Zap className="w-8 h-8 text-white animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
          <div className="relative">
            <Sparkles className="w-8 h-8 text-white animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-80 h-2 bg-white/20 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-white via-white/90 to-white transition-all duration-300 ease-out rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* 进度条光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* 进度百分比 */}
        <p className="text-white/80 text-sm mt-4 font-medium">
          {Math.round(progress)}%
        </p>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
