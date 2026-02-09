
import React, { useState, useEffect } from 'react';
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
      // Deteksi layar lebar (desktop)
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  const renderSwitcher = () => (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[200] animate-in slide-in-from-right-4 fade-in duration-700">
        <div className="flex flex-col bg-[#0f172a]/40 dark:bg-[#0f172a]/60 backdrop-blur-2xl p-2 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10 gap-3">
            <button 
                onClick={() => onViewModeChange('phone')}
                className={`p-4 rounded-[2rem] transition-all duration-300 ${String(viewMode) === 'phone' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/40' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                title="Mode Ponsel"
            >
                <DevicePhoneIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={() => onViewModeChange('full')}
                className={`p-4 rounded-[2rem] transition-all duration-300 ${String(viewMode) === 'full' ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/40' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                title="Mode Monitor"
            >
                <MonitorIcon className="w-6 h-6" />
            </button>
        </div>
    </div>
  );

  // --- LOGIKA TERBAIK: JIKA MOBILE ATAU MODE FULL, JANGAN GUNAKAN FRAME ---
  if (!isDesktop || viewMode === 'full') {
    return (
      <div className={`min-h-screen w-full flex flex-col relative transition-colors duration-500 ${isDarkTheme ? 'bg-[#020617]' : 'bg-[#f8fafc]'}`}>
        {isDesktop && renderSwitcher()}
        <div className="flex-1 flex flex-col">
            {children}
        </div>
      </div>
    );
  }

  // --- HANYA UNTUK PREVIEW SMARTPHONE DI DESKTOP ---
  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700 ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      
      {/* Background Ambience */}
      {!isDarkTheme && <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-200 z-0"></div>}
      
      {renderSwitcher()}

      {/* Bingkai Ponsel Mewah */}
      <div className="relative select-none animate-in zoom-in duration-1000 z-10">
        {/* Glow behind phone */}
        <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-[5rem] animate-pulse"></div>

        <div className="relative w-[400px] h-[864px] bg-[#0c0c0d] rounded-[4.5rem] p-4 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8),0_0_0_2px_#2a2c2e,0_0_0_8px_#1f2123] border border-white/10 ring-1 ring-white/20 flex flex-col">
            {/* Inner Content Screen */}
            <div className="w-full h-full bg-white dark:bg-[#020617] rounded-[3.5rem] overflow-hidden relative flex flex-col shadow-inner border-2 border-black/60">
                
                {/* Simulated Notch & Status Bar */}
                <div className="h-14 w-full flex items-center justify-between px-10 z-[100] pointer-events-none bg-transparent">
                    <span className="text-[12px] font-black text-slate-900 dark:text-white mt-1 w-12">{formatTime(time)}</span>
                    
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-[20px] flex items-center justify-center gap-3 border border-white/5 shadow-2xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 w-12 justify-end">
                        <SignalIcon className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                        <WifiIcon className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                        <BatteryIcon className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden bg-[#f8fafc] dark:bg-[#020617]">
                    {children}
                </div>

                {/* Home Indicator */}
                <div className="h-8 w-full flex items-center justify-center bg-transparent z-[100]">
                    <div className="w-32 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full"></div>
                </div>
            </div>
            
            {/* Side Buttons Decoration */}
            <div className="absolute left-[-12px] top-[180px] w-2 h-12 bg-[#2a2c2e] rounded-l-lg border-r border-black/20 shadow-xl"></div>
            <div className="absolute left-[-12px] top-[240px] w-2 h-20 bg-[#2a2c2e] rounded-l-lg border-r border-black/20 shadow-xl"></div>
            <div className="absolute left-[-12px] top-[320px] w-2 h-20 bg-[#2a2c2e] rounded-l-lg border-r border-black/20 shadow-xl"></div>
            <div className="absolute right-[-12px] top-[240px] w-2 h-32 bg-[#2a2c2e] rounded-r-lg border-l border-black/20 shadow-xl"></div>
        </div>
      </div>
      
      {/* Reflection */}
      <div className="absolute bottom-[-150px] w-[500px] h-[300px] bg-indigo-500/5 blur-[80px] rounded-full -rotate-12 pointer-events-none"></div>
    </div>
  );
};

export default MobileContainer;
