
import React, { useState, useEffect } from 'react';
import { DevicePhoneIcon, MonitorIcon, SignalIcon, WifiIcon, BatteryIcon } from './Icons';

interface MobileContainerProps {
  children: React.ReactNode;
  isDarkTheme?: boolean;
}

const MobileContainer: React.FC<MobileContainerProps> = ({ children, isDarkTheme }) => {
  // Secara default di web, tampilkan bingkai ponsel
  const [viewMode, setViewMode] = useState<'phone' | 'full'>('phone');
  const [isDesktop, setIsDesktop] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
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
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`h-screen w-full transition-all duration-700 flex flex-col relative overflow-hidden ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      
      {/* --- PREMIUM AMBIENCE --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-30 transition-colors duration-1000 ${isDarkTheme ? 'bg-indigo-500/20' : 'bg-indigo-400/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[150px] opacity-30 transition-colors duration-1000 ${isDarkTheme ? 'bg-blue-500/20' : 'bg-blue-400/20'}`}></div>
      </div>

      {/* --- FLOATING TOGGLE (DESKTOP) --- */}
      {isDesktop && (
        <div className="fixed top-6 right-6 z-[100] flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/20 shadow-2xl scale-90 origin-right transition-transform hover:scale-100">
          <button 
            onClick={() => setViewMode('phone')}
            className={`p-3 rounded-xl transition-all ${viewMode === 'phone' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            title="Tampilan Ponsel"
          >
            <DevicePhoneIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('full')}
            className={`p-3 rounded-xl transition-all ${viewMode === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            title="Tampilan Layar Penuh"
          >
            <MonitorIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* --- CONTENT AREA --- */}
      <div className={`relative z-10 flex-1 flex items-center justify-center transition-all duration-700 h-full w-full`}>
        
        {effectiveMode === 'phone' ? (
          /* --- HIGH-END PHONE SHELL (IPHONE STYLE) --- */
          <div className="relative group animate-in zoom-in-95 duration-700">
            
            {/* Phone Body with Realistic Bezels */}
            <div className="relative w-[393px] h-[852px] bg-[#0c0c0d] rounded-[4.5rem] p-3 shadow-[0_80px_120px_-20px_rgba(0,0,0,0.5),0_0_0_10px_#2c2e30,0_0_0_12px_#1a1c1e] border-[1px] border-white/10 flex flex-col overflow-hidden">
                
                {/* Reflective Screen Polish */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none rounded-[4rem] z-20"></div>

                {/* --- VIRTUAL SCREEN --- */}
                <div className="flex-1 bg-white dark:bg-[#020617] rounded-[3.8rem] overflow-hidden relative border border-black/40 z-10 flex flex-col shadow-inner">
                    
                    {/* Status Bar */}
                    <div className="h-12 w-full shrink-0 flex items-center justify-between px-10 z-50 pointer-events-none">
                        <span className="text-[13px] font-black text-slate-900 dark:text-white mt-1">{formatTime(time)}</span>
                        
                        {/* Dynamic Island (Interactive Style) */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full flex items-center justify-center gap-1.5 shadow-lg border border-white/5">
                            <div className="w-1 h-1 rounded-full bg-blue-500/60 blur-[1px]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                            <SignalIcon className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                            <WifiIcon className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                            <BatteryIcon className="w-4 h-4 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Content Frame */}
                    <div className="flex-1 relative overflow-hidden">
                        {children}
                    </div>

                    {/* iOS Home Indicator */}
                    <div className="h-6 w-full flex items-center justify-center bg-transparent pointer-events-none">
                        <div className="w-32 h-1.5 bg-slate-900/10 dark:bg-white/10 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Subtle Aura for Phone Focus */}
            <div className="absolute -inset-40 bg-indigo-500/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
          </div>
        ) : (
          /* FULL SCREEN MODE */
          <div className="w-full h-full animate-in fade-in duration-500 flex flex-col bg-white dark:bg-[#020617]">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileContainer;
