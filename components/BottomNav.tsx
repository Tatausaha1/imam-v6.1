
import React from 'react';
import { ViewState } from '../types';
import { 
  HomeIcon, UserIcon, Squares2x2Icon, 
  ClipboardDocumentListIcon, ClockIcon
} from './Icons';

interface BottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'home', view: ViewState.DASHBOARD, label: 'Beranda', icon: HomeIcon },
    { id: 'assignments', view: ViewState.ASSIGNMENTS, label: 'Tugas', icon: ClipboardDocumentListIcon },
    { id: 'menu', view: ViewState.ALL_FEATURES, label: 'Menu', icon: Squares2x2Icon },
    { id: 'history', view: ViewState.HISTORY, label: 'Akademik', icon: ClockIcon },
    { id: 'profile', view: ViewState.PROFILE, label: 'Akun', icon: UserIcon }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden pointer-events-none">
        <nav className="max-w-md mx-auto flex justify-between items-center bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-2xl border border-white/20 dark:border-slate-800/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-2 pointer-events-auto ring-1 ring-black/5">
            {navItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                    <button 
                        key={item.id}
                        onClick={() => onNavigate(item.view)}
                        className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-500 group active:scale-90 ${
                            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        <div className={`p-2 rounded-2xl transition-all duration-500 ${
                            isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 -translate-y-1' : ''
                        }`}>
                            <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 scale-50'}`}>
                            {item.label}
                        </span>
                        {isActive && (
                            <div className="absolute -bottom-1 w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full blur-[0.5px]"></div>
                        )}
                    </button>
                );
            })}
        </nav>
    </div>
  );
};

export default BottomNav;
