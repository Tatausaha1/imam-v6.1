
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useMemo } from 'react';
import { ViewState, UserRole } from '../types';
import { 
  HomeIcon, UserIcon, QrCodeIcon, ChartBarIcon, AppLogo, 
  BookOpenIcon, EnvelopeIcon, CalendarDaysIcon, UsersIcon, LogOutIcon,
  BriefcaseIcon, CalendarIcon, ArrowTrendingUpIcon, BuildingLibraryIcon,
  InfoIcon, XMarkIcon, CommandLineIcon, ClipboardDocumentListIcon, AcademicCapIcon,
  CogIcon, UserPlusIcon, HeadsetIcon, StarIcon, ClockIcon, ShieldCheckIcon,
  IdentificationIcon, CameraIcon
} from './Icons';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole?: UserRole;
  onLogout?: () => void;
  onClose?: () => void;
}

interface SidebarItem {
    label: string;
    icon: React.ElementType;
    view?: ViewState;
    url?: string;
    roles?: UserRole[]; 
}

interface MenuSection {
    title: string;
    items: SidebarItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, userRole = UserRole.GURU, onLogout, onClose }) => {
  
  const menuSections: MenuSection[] = [
    {
      title: 'Utama',
      items: [
        { label: 'Beranda', icon: HomeIcon, view: ViewState.DASHBOARD },
        { label: 'Berita', icon: StarIcon, view: ViewState.NEWS },
        { label: 'Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO },
      ]
    },
    {
      title: 'Akademik',
      items: [
        { label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE },
        { label: 'Jurnal', icon: BookOpenIcon, view: ViewState.JOURNAL, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS, UserRole.STAF] },
        { label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS },
        { label: 'Input Nilai', icon: AcademicCapIcon, view: ViewState.GRADES, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
        { label: 'Rapor', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS },
      ]
    },
    {
      title: 'Absensi',
      items: [
        { label: 'Scan QR', icon: CameraIcon, view: ViewState.SCANNER, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KETUA_KELAS] },
        { label: 'Poin', icon: ShieldCheckIcon, view: ViewState.POINTS },
      ]
    },
    {
      title: 'Master Data',
      items: [
        { label: 'Siswa', icon: UsersIcon, view: ViewState.STUDENTS, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
        { label: 'Guru', icon: BriefcaseIcon, view: ViewState.TEACHERS, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.KEPALA_MADRASAH] },
        { label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
        { label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS },
      ]
    },
    {
      title: 'Sistem',
      items: [
        { label: 'Chat AI', icon: HeadsetIcon, view: ViewState.ADVISOR },
        { label: 'ID Digital', icon: IdentificationIcon, view: ViewState.ID_CARD },
        { label: 'User', icon: UserPlusIcon, view: ViewState.CREATE_ACCOUNT, roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
        { label: 'Dev Console', icon: CommandLineIcon, view: ViewState.DEVELOPER, roles: [UserRole.DEVELOPER] },
        { label: 'Setelan', icon: CogIcon, view: ViewState.SETTINGS },
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    return menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => !item.roles || item.roles.includes(userRole))
    })).filter(section => section.items.length > 0);
  }, [userRole]);

  return (
    <div className="h-full w-full bg-white dark:bg-[#0B1121] flex flex-col relative overflow-hidden transition-colors">
      <div className="p-5 pt-8 pb-5 flex items-center justify-between shrink-0 border-b border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <AppLogo className="w-full h-full" />
            </div>
            <div>
                <h1 className="font-black text-slate-900 dark:text-white text-lg leading-none tracking-tight">IMAM</h1>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1.5">Enterprise v6.2</p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 active:scale-90 transition-all lg:hidden">
                <XMarkIcon className="w-5 h-5" />
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
                <h3 className="px-4 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-2 mt-4 first:mt-0">{section.title}</h3>
                {section.items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => { 
                            if (item.url) {
                                window.open(item.url, '_blank');
                            } else if (item.view) {
                                onNavigate(item.view); 
                            }
                            if (onClose) onClose(); 
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[1.1rem] transition-all duration-300 group ${
                            !item.url && currentView === item.view
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                    >
                        <item.icon className={`w-4 h-4 shrink-0 transition-all duration-300 ${!item.url && currentView === item.view ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:scale-110'}`} />
                        <span className={`text-[10px] font-bold text-left tracking-wider flex-1 truncate ${!item.url && currentView === item.view ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                        {!item.url && currentView === item.view && (
                          <div className="w-1 h-1 rounded-full bg-white/50 animate-pulse"></div>
                        )}
                    </button>
                ))}
            </div>
        ))}
      </div>

      {/* --- FOOTER SECTION: PROFILE & LOGOUT --- */}
      <div className="p-4 border-t border-slate-50 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2">
        <div 
            className="flex items-center gap-3 px-4 py-3 rounded-[1.5rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer group hover:border-indigo-200 transition-all" 
            onClick={() => { onNavigate(ViewState.PROFILE); if (onClose) onClose(); }}
        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] text-white shadow-md bg-gradient-to-br from-indigo-500 to-indigo-700 transform group-hover:rotate-6 transition-transform shrink-0`}>
                {(userRole || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tight leading-none mb-1">Profil Saya</p>
                <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest truncate leading-none">{userRole}</p>
            </div>
        </div>

        {onLogout && (
            <button 
                onClick={() => { 
                    if(window.confirm("Keluar dari aplikasi IMAM?")) onLogout(); 
                }} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[1.2rem] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-black text-[9px] uppercase tracking-[0.15em] hover:bg-rose-100 dark:hover:bg-rose-900/40 active:scale-[0.98] transition-all border border-rose-100 dark:border-rose-900/30"
            >
                <LogOutIcon className="w-4 h-4 shrink-0" />
                <span>Keluar Akun</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
