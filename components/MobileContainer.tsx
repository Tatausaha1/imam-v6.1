
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
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => { window.removeEventListener('resize', handleResize); clearInterval(timer); };
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });

  // Fix: This check narrows viewMode to 'phone' for the rest of the component execution
  if (!isDesktop || viewMode === 'full') {
    return (
      <div className={`min-h-screen w-full flex flex-col relative transition-colors duration-500 ${isDarkTheme ? 'bg-[#020617]' : 'bg-[#f8fafc]'}`}>
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700 ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      <div className="relative w-[400px] h-[864px] bg-[#0c0c0d] rounded-[4.5rem] p-3 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.8)] border border-white/10 ring-4 ring-black flex flex-col animate-in zoom-in duration-700">
            <div className="w-full h-full bg-white dark:bg-[#020617] rounded-[3.8rem] overflow-hidden relative flex flex-col">
                
                {/* STATUS BAR (OVERLAY) */}
                <div className="absolute top-0 inset-x-0 h-14 flex items-center justify-between px-10 z-[100] pointer-events-none text-white/90">
                    <span className="text-[12px] font-black mt-1 w-12">{formatTime(time)}</span>
                    <div className="w-[110px] h-[30px] bg-black rounded-[20px] border border-white/5 shadow-2xl"></div>
                    <div className="flex items-center gap-1.5 mt-1 w-12 justify-end">
                        <SignalIcon className="w-3.5 h-3.5" />
                        <WifiIcon className="w-3.5 h-3.5" />
                        <BatteryIcon className="w-4 h-4" />
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden">{children}</div>

                {/* HOME INDICATOR (OVERLAY) */}
                <div className="absolute bottom-2 inset-x-0 h-1 flex justify-center z-[100] pointer-events-none">
                    <div className="w-32 h-1.5 bg-white/20 rounded-full backdrop-blur-md"></div>
                </div>
            </div>
        </div>
        
        {/* FLOATING SWITCHER */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/10 shadow-2xl">
            {/* Fix: Added type casting to bypass narrowing that causes 'no overlap' comparison errors */}
            <button onClick={() => onViewModeChange('phone')} className={`p-4 rounded-full transition-all ${(viewMode as string) === 'phone' ? 'bg-indigo-600 text-white' : 'text-white/40'}`}><DevicePhoneIcon className="w-6 h-6" /></button>
            {/* Fix: Added type casting to bypass narrowing that causes 'no overlap' comparison errors */}
            <button onClick={() => onViewModeChange('full')} className={`p-4 rounded-full transition-all ${(viewMode as string) === 'full' ? 'bg-indigo-600 text-white' : 'text-white/40'}`}><MonitorIcon className="w-6 h-6" /></button>
        </div>
    </div>
  );
};

export default MobileContainer;
