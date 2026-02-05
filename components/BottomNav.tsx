
import React from 'react';
import { ViewState, UserRole } from '../types';
import { 
  HomeIcon, UserIcon, Squares2x2Icon, 
  ClipboardDocumentListIcon, ClockIcon
} from './Icons';

interface BottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole?: UserRole;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, userRole }) => {
  const navItems = [
    { 
        id: 'home', 
        view: ViewState.DASHBOARD, 
        label: 'Beranda', 
        icon: HomeIcon 
    },
    { 
        id: 'assignments', 
        view: ViewState.ASSIGNMENTS, 
        label: 'Tugas', 
        icon: ClipboardDocumentListIcon 
    },
    { 
        id: 'menu', 
        view: ViewState.ALL_FEATURES, 
        label: 'Menu', 
        icon: Squares2x2Icon 
    },
    { 
        id: 'history', 
        view: ViewState.HISTORY, 
        label: 'Akademik', 
        icon: ClockIcon 
    },
    { 
        id: 'profile', 
        view: ViewState.PROFILE, 
        label: 'Akun', 
        icon: UserIcon 
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)] md:hidden">
        {/* Kontainer utama */}
        <div className="pointer-events-auto relative w-full max-w-md px-4 pb-2">
            
            {/* --- DOCK NAV CONTAINER --- */}
            <nav className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-2xl border border-white/40 dark:border-slate-800/60 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex justify-between items-center px-2 py-2 ring-1 ring-black/5">
                
                {navItems.map((item) => {
                    const isActive = currentView === item.view;
                    const Icon = item.icon;

                    return (
                        <button 
                            key={item.id}
                            onClick={() => item.view && onNavigate(item.view)}
                            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-500 group active:scale-90 ${
                                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            <div className={`relative p-2 rounded-xl transition-all duration-500 ${
                                isActive 
                                ? 'bg-indigo-50 dark:bg-indigo-500/10 -translate-y-1 shadow-inner' 
                                : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50'
                            }`}>
                                <Icon className={`w-5 h-5 transition-all duration-500 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
                                
                                {isActive && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600 dark:bg-indigo-400"></span>
                                    </span>
                                )}
                            </div>

                            <span className={`text-[7px] font-black uppercase tracking-widest transition-all duration-500 ${
                                isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95 group-hover:opacity-100'
                            }`}>
                                {item.label}
                            </span>
                            
                            {isActive && (
                                <div className="absolute -bottom-0.5 w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full blur-[1px]"></div>
                            )}
                        </button>
                    );
                })}

            </nav>
        </div>
    </div>
  );
};

export default BottomNav;
