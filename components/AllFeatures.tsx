import React, { useState } from 'react';
import Layout from './Layout';
import { ViewState, UserRole } from '../types';
import { 
  QrCodeIcon, RobotIcon, ChartBarIcon, 
  BookOpenIcon, EnvelopeIcon, CalendarDaysIcon, UsersIcon, 
  BriefcaseIcon, CalendarIcon, ArrowTrendingUpIcon, BuildingLibraryIcon,
  InfoIcon, AcademicCapIcon, ClipboardDocumentListIcon,
  CommandLineIcon, UserPlusIcon, CameraIcon, Squares2x2Icon, Search, XCircleIcon,
  SparklesIcon, MegaphoneIcon, UserIcon
} from './Icons';

const AllFeatures: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { label: 'Berita', icon: MegaphoneIcon, view: ViewState.NEWS, section: 'Utama', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, section: 'Akademik', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Jurnal', icon: BookOpenIcon, view: ViewState.JOURNAL, section: 'Akademik', color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, section: 'Akademik', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    { label: 'Nilai', icon: AcademicCapIcon, view: ViewState.GRADES, section: 'Akademik', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Tahun', icon: BuildingLibraryIcon, view: ViewState.ACADEMIC_YEAR, section: 'Akademik', color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'Naik Kelas', icon: ArrowTrendingUpIcon, view: ViewState.PROMOTION, section: 'Akademik', color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
    { label: 'Scan QR', icon: CameraIcon, view: ViewState.SCANNER, section: 'Presensi', color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, section: 'Presensi', color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Riwayat', icon: CalendarDaysIcon, view: ViewState.ATTENDANCE_HISTORY, section: 'Presensi', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Siswa', icon: UsersIcon, view: ViewState.STUDENTS, section: 'Data', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Guru', icon: BriefcaseIcon, view: ViewState.TEACHERS, section: 'Data', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Data Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, section: 'Data', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Layanan AI', icon: RobotIcon, view: ViewState.CONTENT_GENERATION, section: 'Alat', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    { label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, section: 'Alat', color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    { label: 'User', icon: UserPlusIcon, view: ViewState.CREATE_ACCOUNT, section: 'Sistem', color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' },
    { label: 'Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO, section: 'Sistem', color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Profil', icon: UserIcon, view: ViewState.PROFILE, section: 'Sistem', color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' },
    { label: 'Premium', icon: SparklesIcon, view: ViewState.PREMIUM, section: 'Sistem', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { label: 'Console', icon: CommandLineIcon, view: ViewState.DEVELOPER, section: 'Sistem', color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800', roles: [UserRole.DEVELOPER] }
  ].filter(item => (!item.roles || item.roles.includes(userRole)) && item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const sections = Array.from(new Set(menuItems.map(item => item.section)));

  return (
    <Layout title="Semua Fitur" subtitle="Modul Terintegrasi" icon={Squares2x2Icon} onBack={onBack} withBottomNav={true}>
      <div className="p-3 lg:p-6 space-y-4 pb-32">
        <div className="sticky top-0 z-20 -mx-3 px-3 pb-3 pt-1 bg-[#f8fafc]/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
                <input type="text" placeholder="Cari Fitur..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-[9px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm" />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
        </div>

        {sections.map(section => (
            <div key={section} className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{section}</h3>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                    {menuItems.filter(item => item.section === section).map((item, idx) => (
                        <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-1.5 group">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.bg} ${item.color} shadow-sm border border-black/5 active:scale-90 transition-all`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 text-center uppercase tracking-tighter truncate w-full px-1">{item.label}</span>
                        </button>
                    ))}
                </div>
                <div className="h-px bg-slate-50 dark:bg-slate-800/50 mt-4"></div>
            </div>
        ))}
      </div>
    </Layout>
  );
};

export default AllFeatures;