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

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    const timer = setInterval(() => setTime(new Date()), 10000); // Update every 10s for performance

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  const timeString = useMemo(() => {
    return time.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }, [time]);

  if (!isDesktop || viewMode === 'full') {
    return (
      <div className={`min-h-screen w-full flex flex-col relative transition-colors duration-500 ${isDarkTheme ? 'bg-[#020617]' : 'bg-[#f8fafc]'}`}>
        {isDesktop && (
          <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[200]">
            <div className="flex flex-col bg-[#0f172a]/40 dark:bg-[#0f172a]/60 backdrop-blur-xl p-2 rounded-[2.5rem] border border-white/20 shadow-2xl gap-3">
              <button 
                  onClick={() => onViewModeChange('phone')}
                  className="p-4 rounded-[2rem] text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                  <DevicePhoneIcon className="w-6 h-6" />
              </button>
              <button 
                  onClick={() => onViewModeChange('full')}
                  className="p-4 rounded-[2rem] bg-[#10b981] text-white shadow-lg"
              >
                  <MonitorIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700 ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      
      {!isDarkTheme && <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-200 z-0 opacity-50"></div>}
      
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[200]">
        <div className="flex flex-col bg-[#0f172a]/40 dark:bg-[#0f172a]/60 backdrop-blur-xl p-2 rounded-[2.5rem] border border-white/20 shadow-2xl gap-3">
          <button 
              onClick={() => onViewModeChange('phone')}
              className="p-4 rounded-[2rem] bg-[#10b981] text-white shadow-lg"
          >
              <DevicePhoneIcon className="w-6 h-6" />
          </button>
          <button 
              onClick={() => onViewModeChange('full')}
              className="p-4 rounded-[2rem] text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
              <MonitorIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="relative select-none will-change-transform animate-in zoom-in duration-700 z-10">
        <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-[5rem]"></div>

        <div className="relative w-[380px] h-[820px] bg-[#0c0c0d] rounded-[4.5rem] p-3 shadow-2xl border border-white/10 ring-1 ring-white/10 flex flex-col">
            <div className="w-full h-full bg-white dark:bg-[#020617] rounded-[3.5rem] overflow-hidden relative flex flex-col border-2 border-black/40">
                
                <div className="h-12 w-full flex items-center justify-between px-10 z-[100] pointer-events-none bg-transparent">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white mt-1 w-12">{timeString}</span>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-[20px] border border-white/5"></div>
                    <div className="flex items-center gap-1.5 mt-1 w-12 justify-end">
                        <SignalIcon className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                        <WifiIcon className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                        <BatteryIcon className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden bg-[#f8fafc] dark:bg-[#020617]">{children}</div>

                <div className="h-6 w-full flex items-center justify-center bg-transparent z-[100]">
                    <div className="w-28 h-1 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                </div>
            </div>
            
            <div className="absolute left-[-8px] top-[180px] w-1.5 h-10 bg-[#2a2c2e] rounded-l-lg border-r border-black/20"></div>
            <div className="absolute left-[-8px] top-[240px] w-1.5 h-16 bg-[#2a2c2e] rounded-l-lg border-r border-black/20"></div>
            <div className="absolute right-[-8px] top-[240px] w-1.5 h-28 bg-[#2a2c2e] rounded-r-lg border-l border-black/20"></div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MobileContainer);