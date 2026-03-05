import React from 'react';
import { ArrowLeftIcon } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  onBack?: () => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  withBottomNav?: boolean; 
  customHeader?: React.ReactNode; 
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  icon: Icon, 
  onBack, 
  actions, 
  footer,
  className = "",
  withBottomNav = false,
  customHeader
}) => {
  return (
    <div className={`flex flex-col h-full w-full bg-[#f8fafc] dark:bg-[#020617] transition-colors relative overflow-hidden pt-[env(safe-area-inset-top)] ${className}`}>
      
      {/* --- HEADER (SOLID COLOR - HIGH PERFORMANCE) --- */}
      <header className="shrink-0 z-30 sticky top-0 bg-white dark:bg-[#0B1121] border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative z-10 flex items-center justify-between px-4 py-3 md:px-8 md:py-4 gap-4 max-w-md md:max-w-4xl mx-auto w-full">
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            
            {customHeader ? (
              customHeader
            ) : (
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate flex items-center gap-2 transition-colors uppercase tracking-tight">
                  {title}
                  {Icon && <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 shrink-0"><Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /></div>}
                </h1>
                {subtitle && (
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] truncate transition-colors mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className={`flex-1 overflow-y-auto relative w-full z-10 scroll-smooth ${withBottomNav ? 'pb-32' : 'pb-12'}`}>
        <div className="max-w-md md:max-w-4xl mx-auto w-full h-full px-4 md:px-8 py-5">
            {children}
        </div>
      </main>

      {/* --- FOOTER (SOLID) --- */}
      {footer && (
        <footer className="shrink-0 z-30 bg-white dark:bg-[#0B1121] border-t border-slate-200 dark:border-slate-800 p-4 md:px-8 pb-6 safe-pb transition-colors">
          <div className="max-w-md md:max-w-4xl mx-auto w-full">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;