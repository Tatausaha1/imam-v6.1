
import React, { useState, useEffect, useMemo } from 'react';
import { DevicePhoneIcon, MonitorIcon, SignalIcon, WifiIcon, BatteryIcon } from './Icons';

interface MobileContainerProps {
  children: React.ReactNode;
  isDarkTheme?: boolean;
  viewMode: 'phone' | 'full';
  onViewModeChange: (mode: 'phone' | 'full') => void;
}

const MobileContainer: React.FC<MobileContainerProps> = ({ children, isDarkTheme, viewMode, onViewModeChange }) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [time, setTime] = useState(new Date());
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1000);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setWindowHeight(window.innerHeight);
      setWindowWidth(window.innerWidth);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setInterval(() => setTime(new Date()), 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  const effectiveMode = isDesktop ? viewMode : 'full';
  
  // Skala dinamis: Memastikan shell ponsel selalu pas di layar browser tanpa lag
  const scale = useMemo(() => {
    if (effectiveMode !== 'phone') return 1;
    const padding = 40; 
    const shellHeight = 844 + 48; 
    const shellWidth = 390 + 40;  
    
    const scaleH = (windowHeight - padding) / shellHeight;
    const scaleW = (windowWidth - padding) / shellWidth;
    
    return Math.min(1, Math.max(0.4, Math.min(scaleH, scaleW)));
  }, [windowHeight, windowWidth, effectiveMode]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`h-screen w-full transition-all duration-700 flex flex-col relative overflow-hidden ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      
      {/* --- BACKGROUND AMBIENCE (Lightweight) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 ${isDarkTheme ? 'bg-indigo-500/20' : 'bg-indigo-400/20'}`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>
      </div>

      {/* --- FLOATING TOGGLE (DESKTOP) --- */}
      {isDesktop && (
        <div className="fixed top-6 right-6 z-[100] flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/20 shadow-2xl scale-90 origin-right transition-all hover:scale-100 group">
          <button 
            onClick={() => onViewModeChange('phone')}
            className={`p-3 rounded-xl transition-all ${viewMode === 'phone' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            title="Tampilan Ponsel"
          >
            <DevicePhoneIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onViewModeChange('full')}
            className={`p-3 rounded-xl transition-all ${viewMode === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            title="Tampilan Layar Penuh"
          >
            <MonitorIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      <div className="relative z-10 flex-1 flex items-center justify-center h-full w-full overflow-hidden">
        
        {effectiveMode === 'phone' ? (
          /* --- PREMIUM PHONE SHELL (GPU OPTIMIZED) --- */
          <div 
            className="relative select-none flex items-center justify-center transform-gpu transition-transform duration-500 ease-out"
            style={{ 
              transform: `scale(${scale}) translate3d(0,0,0)`,
              willChange: 'transform'
            }}
          >
            {/* Phone Body Shell */}
            <div className="relative w-[390px] h-[844px] bg-[#0c0c0d] rounded-[4.5rem] p-3 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.7),0_0_0_12px_#1f2123,0_0_0_14px_#2a2c2e] border border-white/10 flex flex-col overflow-hidden ring-1 ring-white/10">
                
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none rounded-[4.2rem] z-30 opacity-40"></div>

                {/* --- VIRTUAL SCREEN --- */}
                <div className="flex-1 bg-white dark:bg-[#020617] rounded-[3.8rem] overflow-hidden relative border border-black/60 z-10 flex flex-col shadow-inner">
                    
                    {/* Status Bar */}
                    <div className="h-11 w-full shrink-0 flex items-center justify-between px-10 z-[60] pointer-events-none pt-4 bg-transparent">
                        <span className="text-[14px] font-black text-slate-900 dark:text-white mt-1">{formatTime(time)}</span>
                        
                        {/* Dynamic Island */}
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-[#000] rounded-full flex items-center justify-center gap-2 shadow-2xl border border-white/5">
                            <div className="w-1 h-1 rounded-full bg-blue-500/80 animate-pulse"></div>
                            <div className="w-2 h-0.5 rounded-full bg-white/10"></div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                            <SignalIcon className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                            <WifiIcon className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                            <BatteryIcon className="w-4 h-4 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Content Frame */}
                    <div className="flex-1 relative overflow-hidden z-20">
                        {children}
                    </div>

                    {/* iOS Home Indicator */}
                    <div className="h-6 w-full flex items-center justify-center bg-transparent pointer-events-none z-[60] pb-2">
                        <div className="w-32 h-1.5 bg-slate-900/10 dark:bg-white/15 rounded-full"></div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          /* FULL SCREEN MODE */
          <div className="w-full h-full animate-in fade-in duration-500 flex flex-col bg-white dark:bg-[#020617] overflow-hidden">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileContainer;
