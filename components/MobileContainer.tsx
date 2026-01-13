
import React from 'react';

interface MobileContainerProps {
  children: React.ReactNode;
  isDarkTheme?: boolean;
  deviceView?: 'mobile' | 'tablet' | 'full';
}

const MobileContainer: React.FC<MobileContainerProps> = ({ children, isDarkTheme, deviceView = 'full' }) => {
  
  // Ukuran dimensi simulator
  const dimensions = {
    mobile: 'w-[375px] h-[812px]',
    tablet: 'w-[768px] h-[1024px]',
    full: 'w-full h-full'
  };

  const isSimulated = deviceView !== 'full';

  return (
    <div className={`fixed inset-0 transition-all duration-500 flex items-center justify-center overflow-hidden ${isDarkTheme ? 'bg-[#020617]' : 'bg-slate-200'}`}>
      
      {/* Background Ambience (Hanya terlihat jika mode simulator aktif atau di desktop lebar) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-20 transition-colors duration-1000 ${isDarkTheme ? 'bg-indigo-900' : 'bg-indigo-300'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-20 transition-colors duration-1000 ${isDarkTheme ? 'bg-blue-900' : 'bg-blue-300'}`}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>
      </div>

      {/* Main Content Wrapper / Device Frame */}
      <div 
        className={`relative z-10 transition-all duration-700 ease-in-out flex flex-col bg-white dark:bg-[#020617] overflow-hidden 
          ${isSimulated ? 'shadow-[0_50px_100px_rgba(0,0,0,0.4)] border-[10px] border-slate-900 dark:border-slate-800' : ''}
          ${deviceView === 'mobile' ? 'rounded-[3.5rem] ' + dimensions.mobile : ''}
          ${deviceView === 'tablet' ? 'rounded-[2.5rem] ' + dimensions.tablet : ''}
          ${deviceView === 'full' ? dimensions.full : ''}
        `}
      >
        {/* Notch / Speaker bar for simulated mobile */}
        {deviceView === 'mobile' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 dark:bg-slate-800 rounded-b-2xl z-[60] flex items-center justify-center">
             <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
          </div>
        )}

        <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
          {children}
        </div>
      </div>

      {/* Watermark (Hanya terlihat di layar simulator desktop) */}
      {isSimulated && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.3em] text-[10px] pointer-events-none">
          IMAM V6.1 Responsive Preview
        </div>
      )}
      
    </div>
  );
};

export default MobileContainer;
