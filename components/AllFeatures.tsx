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
  SparklesIcon, MegaphoneIcon, UserIcon, PusakaIcon, RdmIcon, EmisIcon, Emis40Icon, PintarIcon, AsnDigitalIcon, SimsdmIcon, AbsensiKemenagIcon, HeadsetIcon, IdentificationIcon, ShieldCheckIcon, ClockIcon,
  // Added ChartBarIcon to imports
  StarIcon, CogIcon, ChartBarIcon
} from './Icons';

interface AllFeaturesProps {
    onBack: () => void;
    onNavigate: (v: ViewState) => void;
    userRole: UserRole;
}

const AllFeatures: React.FC<AllFeaturesProps> = ({ onBack, onNavigate, userRole }) => {
  const menuItems = [
    // --- PORTAL & INFO (4 items) ---
    { label: 'Berita', icon: MegaphoneIcon, view: ViewState.NEWS, section: 'Portal & Informasi', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { label: 'Madrasah', icon: BuildingLibraryIcon, view: ViewState.MADRASAH_INFO, section: 'Portal & Informasi', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Tentang', icon: InfoIcon, view: ViewState.ABOUT, section: 'Portal & Informasi', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'Sesi Login', icon: ShieldCheckIcon, view: ViewState.LOGIN_HISTORY, section: 'Portal & Informasi', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },

    // --- AKADEMIK (8 items for perfect grid) ---
    { label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, section: 'Akademik Madrasah', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { label: 'Jurnal', icon: BookOpenIcon, view: ViewState.JOURNAL, section: 'Akademik Madrasah', color: 'text-pink-600', bg: 'pink-50 dark:bg-pink-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
    { label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, section: 'Akademik Madrasah', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { label: 'Nilai', icon: AcademicCapIcon, view: ViewState.GRADES, section: 'Akademik Madrasah', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Tahun', icon: CalendarDaysIcon, view: ViewState.ACADEMIC_YEAR, section: 'Akademik Madrasah', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Naik Kelas', icon: ArrowTrendingUpIcon, view: ViewState.PROMOTION, section: 'Akademik Madrasah', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER] },
    { label: 'Rapor', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, section: 'Akademik Madrasah', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Cetak', icon: ChartBarIcon, view: ViewState.REPORTS, section: 'Akademik Madrasah', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.KEPALA_MADRASAH] },

    // --- PRESENSI & DATA (8 items) ---
    { label: 'Scan QR', icon: CameraIcon, view: ViewState.SCANNER, section: 'Sistem Presensi & Data', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF, UserRole.WALI_KELAS, UserRole.KEPALA_MADRASAH] },
    { label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, section: 'Sistem Presensi & Data', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'Riwayat', icon: ClockIcon, view: ViewState.ATTENDANCE_HISTORY, section: 'Sistem Presensi & Data', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Poin', icon: ShieldCheckIcon, view: ViewState.POINTS, section: 'Sistem Presensi & Data', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Siswa', icon: UsersIcon, view: ViewState.STUDENTS, section: 'Sistem Presensi & Data', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'Guru', icon: BriefcaseIcon, view: ViewState.TEACHERS, section: 'Sistem Presensi & Data', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, section: 'Sistem Presensi & Data', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.STAF] },
    { label: 'ID Card', icon: IdentificationIcon, view: ViewState.ID_CARD, section: 'Sistem Presensi & Data', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },

    // --- ALAT AI & SISTEM (7 items) ---
    { label: 'Live Chat', icon: HeadsetIcon, view: ViewState.ADVISOR, section: 'Alat & Konfigurasi', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { label: 'Alat Guru', icon: SparklesIcon, view: ViewState.CONTENT_GENERATION, section: 'Alat & Konfigurasi', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.GURU, UserRole.WALI_KELAS] },
    { label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, section: 'Alat & Konfigurasi', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { label: 'Profil', icon: UserIcon, view: ViewState.PROFILE, section: 'Alat & Konfigurasi', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800' },
    { label: 'Premium', icon: StarIcon, view: ViewState.PREMIUM, section: 'Alat & Konfigurasi', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/30', roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.KEPALA_MADRASAH] },
    { label: 'Console', icon: CommandLineIcon, view: ViewState.DEVELOPER, section: 'Alat & Konfigurasi', color: 'text-slate-600', bg: 'bg-slate-900 text-white', roles: [UserRole.DEVELOPER] },
    { label: 'Settings', icon: CogIcon, view: ViewState.SETTINGS, section: 'Alat & Konfigurasi', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },

    // --- INTEGRASI KEMENAG (8 items) ---
    { label: 'Pusaka', icon: PusakaIcon, onClick: () => window.open('https://pusaka-v3.kemenag.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'RDM', icon: RdmIcon, onClick: () => window.open('https://hdmadrasah.id/login/auth', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'Emis 4.0', icon: Emis40Icon, onClick: () => window.open('https://emis.kemenag.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'Emis GTK', icon: EmisIcon, onClick: () => window.open('https://emisgtk.kemenag.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'SIMSDM', icon: SimsdmIcon, onClick: () => window.open('https://simpeg5.kemenag.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'Absensi', icon: AbsensiKemenagIcon, onClick: () => window.open('https://sso.kemenag.go.id/auth/signin?appid=42095eeec431ac23eb12d2b772c94be0', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'Pintar', icon: PintarIcon, onClick: () => window.open('https://pintar.kemenag.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true },
    { label: 'ASN Digital', icon: AsnDigitalIcon, onClick: () => window.open('https://asndigital.bkn.go.id/', '_blank'), section: 'Integrasi Layanan Kemenag', isFrameless: true }
  ].filter(item => !item.roles || item.roles.includes(userRole));

  const sections = Array.from(new Set(menuItems.map(item => item.section)));

  return (
    <Layout title="Menu Eksplorasi" subtitle="Integrasi Seluruh Fitur Madrasah" icon={Squares2x2Icon} onBack={onBack} withBottomNav={true}>
      <div className="p-4 lg:p-8 space-y-10 pb-40 max-w-5xl mx-auto">
        {sections.map(section => (
            <div key={section} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 pl-1">
                    <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">{section}</h3>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6">
                    {menuItems.filter(item => item.section === section).map((item, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => (item as any).onClick ? (item as any).onClick() : (item.view && onNavigate(item.view))} 
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center transition-all active:scale-90 group-hover:-translate-y-1.5 duration-300 ${
                                (item as any).isFrameless 
                                ? 'bg-transparent' 
                                : `${item.bg} ${item.color} rounded-[1.8rem] shadow-sm border border-black/5 dark:border-white/5`
                            }`}>
                                <item.icon className={(item as any).isFrameless ? 'w-full h-full object-contain' : 'w-6 h-6 md:w-7 md:h-7'} />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 text-center uppercase tracking-tighter truncate w-full px-1 group-hover:text-indigo-600 transition-colors">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </Layout>
  );
};

export default AllFeatures;