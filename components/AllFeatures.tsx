
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import Layout from './Layout';
import { ViewState, UserRole } from '../types';
import { 
  QrCodeIcon, BookOpenIcon, EnvelopeIcon, CalendarDaysIcon, UsersIcon, 
  BriefcaseIcon, CalendarIcon, ArrowTrendingUpIcon, BuildingLibraryIcon,
  InfoIcon, AcademicCapIcon, ClipboardDocumentListIcon,
  CommandLineIcon, CameraIcon, Squares2x2Icon, 
  SparklesIcon, MegaphoneIcon, UserIcon, PusakaIcon, RdmIcon, Emis40Icon, EmisIcon,
  SimsdmIcon, AbsensiKemenagIcon, PintarIcon, AsnDigitalIcon, IdentificationIcon, ShieldCheckIcon, ClockIcon,
  StarIcon, CogIcon, ChartBarIcon, HeadsetIcon, LogOutIcon
} from './Icons';

interface AllFeaturesProps {
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
    userRole: UserRole;
    onLogout?: () => void;
}

const AllFeatures: React.FC<AllFeaturesProps> = ({ onBack, onNavigate, userRole, onLogout }) => {
  const menuItems = [
    // --- PORTAL & INFO ---
    { label: 'Berita', icon: MegaphoneIcon, view: ViewState.NEWS, section: 'Portal & Informasi', color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO, section: 'Portal & Informasi', color: 'text-blue-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Tentang', icon: InfoIcon, view: ViewState.ABOUT, section: 'Portal & Informasi', color: 'text-slate-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Sesi Login', icon: ShieldCheckIcon, view: ViewState.LOGIN_HISTORY, section: 'Portal & Informasi', color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },

    // --- AKADEMIK ---
    { label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, section: 'Akademik Madrasah', color: 'text-orange-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Jurnal', icon: BookOpenIcon, view: ViewState.JOURNAL, section: 'Akademik Madrasah', color: 'text-pink-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
    { label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, section: 'Akademik Madrasah', color: 'text-violet-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Nilai', icon: AcademicCapIcon, view: ViewState.GRADES, section: 'Akademik Madrasah', color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Tahun', icon: CalendarDaysIcon, view: ViewState.ACADEMIC_YEAR, section: 'Akademik Madrasah', color: 'text-cyan-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Naik Kelas', icon: ArrowTrendingUpIcon, view: ViewState.PROMOTION, section: 'Akademik Madrasah', color: 'text-fuchsia-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Rapor', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, section: 'Akademik Madrasah', color: 'text-blue-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Cetak', icon: ChartBarIcon, view: ViewState.REPORTS, section: 'Akademik Madrasah', color: 'text-slate-600', bg: 'bg-white dark:bg-slate-800' },

    // --- PRESENSI & DATA ---
    { label: 'Scan QR', icon: CameraIcon, view: ViewState.SCANNER, section: 'Presensi & Data', color: 'text-teal-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
    { label: 'Poin', icon: ShieldCheckIcon, view: ViewState.POINTS, section: 'Presensi & Data', color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Siswa', icon: UsersIcon, view: ViewState.STUDENTS, section: 'Presensi & Data', color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'Alumni', icon: AcademicCapIcon, view: ViewState.ALUMNI, section: 'Presensi & Data', color: 'text-indigo-700', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.STAF] },
    { label: 'Mutasi', icon: BriefcaseIcon, view: ViewState.MUTATION, section: 'Presensi & Data', color: 'text-rose-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.STAF] },
    { label: 'Guru', icon: BriefcaseIcon, view: ViewState.TEACHERS, section: 'Presensi & Data', color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, section: 'Presensi & Data', color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'ID Card', icon: IdentificationIcon, view: ViewState.ID_CARD, section: 'Presensi & Data', color: 'text-amber-600', bg: 'bg-white dark:bg-slate-800' },

    // --- ALAT AI & SISTEM ---
    { label: 'Live Chat', icon: HeadsetIcon, view: ViewState.ADVISOR, section: 'Konfigurasi', color: 'text-violet-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, section: 'Konfigurasi', color: 'text-sky-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Profil', icon: UserIcon, view: ViewState.PROFILE, section: 'Konfigurasi', color: 'text-slate-600', bg: 'bg-white dark:bg-slate-800' },
    { label: 'Settings', icon: CogIcon, view: ViewState.SETTINGS, section: 'Konfigurasi', color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800' },

    // --- INTEGRASI KEMENAG ---
    { label: 'Pusaka', icon: PusakaIcon, onClick: () => window.open('https://pusaka-v3.kemenag.go.id/', '_blank'), section: 'Layanan Eksternal', isFrameless: true },
    { label: 'RDM', icon: RdmIcon, onClick: () => window.open('https://hdmadrasah.id/login/auth', '_blank'), section: 'Layanan Eksternal', isFrameless: true },
    { label: 'Emis 4.0', icon: Emis40Icon, onClick: () => window.open('https://emis.kemenag.go.id/', '_blank'), section: 'Layanan Eksternal', isFrameless: true },
    { label: 'SIMSDM', icon: SimsdmIcon, onClick: () => window.open('https://simpeg5.kemenag.go.id/', '_blank'), section: 'Layanan Eksternal', isFrameless: true },
    { label: 'Absensi', icon: AbsensiKemenagIcon, onClick: () => window.open('https://sso.kemenag.go.id/auth/signin?appid=42095eeec431ac23eb12d2b772c94be0', '_blank'), section: 'Layanan Eksternal', isFrameless: true }
  ].filter(item => !item.roles || item.roles.includes(userRole));

  const sections = Array.from(new Set(menuItems.map(item => item.section)));

  return (
    <Layout title="Menu Eksplorasi" subtitle="Padat & Terintegrasi" icon={Squares2x2Icon} onBack={onBack} withBottomNav={true}>
      <div className="p-3 lg:p-6 space-y-8 pb-32 max-w-5xl mx-auto">
        {sections.map(section => (
            <div key={section} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 pl-1">
                    <div className="h-3 w-1 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em] drop-shadow-sm">{section}</h3>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                    {menuItems.filter(item => item.section === section).map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => (item as any).onClick ? (item as any).onClick() : (item.view && onNavigate(item.view))} 
                            className="flex flex-col items-center gap-2.5 group"
                        >
                            <div className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all active:scale-75 group-hover:-translate-y-1.5 duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] ${
                                (item as any).isFrameless 
                                ? 'bg-white dark:bg-white rounded-2xl p-2' 
                                : `${item.bg} ${item.color} rounded-[1.8rem] border border-white dark:border-slate-700`
                            }`}>
                                <item.icon className={(item as any).isFrameless ? 'w-full h-full object-contain' : 'w-6 h-6 md:w-7 md:h-7'} />
                            </div>
                            <span className="text-[8px] font-black text-slate-800 dark:text-white text-center uppercase tracking-tighter truncate w-full px-0.5 transition-colors drop-shadow-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        ))}

        {/* SECTION KHUSUS LOGOUT DI MOBILE MENU */}
        {onLogout && (
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
             <div className="flex items-center gap-2 pl-1">
                <div className="h-3 w-1 bg-rose-500 rounded-full"></div>
                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">Akun & Keamanan</h3>
             </div>
             <button 
                onClick={() => { if(window.confirm("Keluar dari aplikasi IMAM?")) onLogout(); }}
                className="w-full flex items-center justify-between p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] active:scale-[0.98] transition-all group"
             >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-rose-900/40 flex items-center justify-center text-rose-600 shadow-sm border border-rose-100 dark:border-rose-800">
                    <LogOutIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-tight leading-none">Keluar dari Sesi</p>
                    <p className="text-[8px] font-bold text-rose-500/60 uppercase mt-1">Selesaikan aktivitas Anda</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-rose-900/20 flex items-center justify-center">
                    <LogOutIcon className="w-4 h-4 text-rose-400" />
                </div>
             </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllFeatures;
