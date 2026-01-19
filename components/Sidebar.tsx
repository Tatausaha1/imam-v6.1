/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useMemo } from 'react';
import { ViewState, UserRole } from '../types';
import { 
  HomeIcon, UserIcon, QrCodeIcon, RobotIcon, ChartBarIcon, AppLogo, 
  BookOpenIcon, EnvelopeIcon, CalendarDaysIcon, UsersIcon, LogOutIcon,
  BriefcaseIcon, CalendarIcon, ArrowTrendingUpIcon, BuildingLibraryIcon,
  InfoIcon, XMarkIcon, CommandLineIcon, ClipboardDocumentListIcon, AcademicCapIcon,
  SparklesIcon, CogIcon
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
    view: ViewState;
    roles?: UserRole[]; 
    section?: string;
    highlight?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, userRole = UserRole.GURU, onLogout, onClose }) => {
  
  const menuItems: SidebarItem[] = [
    { label: 'Beranda', icon: HomeIcon, view: ViewState.DASHBOARD, section: 'Utama' },
    { label: 'Profil Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO, section: 'Data Induk' },
    { label: 'Data Siswa', icon: UsersIcon, view: ViewState.STUDENTS, section: 'Data Induk' },
    { label: 'Data Guru', icon: BriefcaseIcon, view: ViewState.TEACHERS, section: 'Data Induk' },
    { label: 'Data Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, section: 'Data Induk' },
    { label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, section: 'Akademik' },
    { label: 'Jurnal', icon: BookOpenIcon, view: ViewState.JOURNAL, section: 'Akademik' },
    { label: 'Tugas & PR', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, section: 'Akademik' },
    { label: 'Rapor Digital', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, section: 'Akademik' },
    { label: 'Scan QR', icon: QrCodeIcon, view: ViewState.SCANNER, section: 'Presensi' },
    { label: 'Input Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, section: 'Presensi' },
    { label: 'Riwayat Absen', icon: CalendarDaysIcon, view: ViewState.ATTENDANCE_HISTORY, section: 'Presensi' },
    { label: 'Panduan AI', icon: RobotIcon, view: ViewState.ADVISOR, section: 'Bantuan' },
    { label: 'Alat Guru AI', icon: RobotIcon, view: ViewState.CONTENT_GENERATION, section: 'Administrasi' },
    { label: 'Layanan Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, section: 'Administrasi' },
    { label: 'Laporan Cetak', icon: ChartBarIcon, view: ViewState.REPORTS, section: 'Administrasi' },
    { label: 'Profil Saya', icon: UserIcon, view: ViewState.PROFILE, section: 'Sistem' },
    { label: 'Pengaturan', icon: CogIcon, view: ViewState.SETTINGS, section: 'Sistem' },
    { label: 'Tentang', icon: InfoIcon, view: ViewState.ABOUT, section: 'Sistem' },
  ];

  const sections = useMemo<Record<string, SidebarItem[]>>(() => {
      const groups: Record<string, SidebarItem[]> = {};
      menuItems.forEach(item => {
          const sec = item.section || 'Lainnya';
          if (!groups[sec]) groups[sec] = [];
          groups[sec].push(item);
      });
      return groups;
  }, []);

  return (
    <div className="h-full w-full bg-white dark:bg-[#0B1121] flex flex-col relative overflow-hidden">
      <div className="p-4 pt-6 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
            <AppLogo className="w-9 h-9" />
            <div>
                <h1 className="font-black text-slate-900 dark:text-white text-lg leading-none">IMAM</h1>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">MAN 1 Hulu Sungai Tengah</p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700">
                <XMarkIcon className="w-4 h-4" />
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-hide">
        {(Object.entries(sections) as [string, SidebarItem[]][]).map(([section, items]) => (
            <div key={section} className="space-y-0.5">
                <div className="px-2 mb-1">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{section}</span>
                </div>
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => { onNavigate(item.view); if (onClose) onClose(); }}
                        className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg transition-all ${
                            currentView === item.view
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <item.icon className={`w-4 h-4 ${currentView === item.view ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="text-[11px] font-bold text-left tracking-tight flex-1">{item.label}</span>
                        {currentView === item.view && <div className="w-1 h-1 rounded-full bg-white"></div>}
                    </button>
                ))}
            </div>
        ))}
      </div>

      <div className="p-2 border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => onNavigate(ViewState.PROFILE)}>
            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-[10px] text-indigo-600">{(userRole || 'G').charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-800 dark:text-white truncate uppercase tracking-tighter">Profil Akun</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{userRole || '-'}</p>
            </div>
            {onLogout && (
                <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                    <LogOutIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;