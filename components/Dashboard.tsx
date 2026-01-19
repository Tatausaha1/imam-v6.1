
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole, Student } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, BriefcaseIcon, SunIcon, MoonIcon, SparklesIcon, UserIcon,
  BuildingLibraryIcon, ClipboardDocumentListIcon, QrCodeIcon, BellIcon, 
  ArrowRightIcon, ShieldCheckIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, InfoIcon, XCircleIcon, CommandLineIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, RobotIcon, BookOpenIcon, ArrowTrendingUpIcon, PencilIcon, CogIcon,
  Squares2x2Icon, IdentificationIcon, StarIcon, HeartIcon,
  Loader2, LogOutIcon
} from './Icons';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userRole: UserRole;
  onLogout: () => void;
  onOpenSidebar?: () => void;
}

type WidgetId = 'metrics' | 'quickActions' | 'agenda' | 'classAnalysis';

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, isDarkMode, onToggleTheme, userRole, onLogout }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [userIdUnik, setUserIdUnik] = useState<string | null>(null);
  
  // Cross-Collection Aggregate States
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    pendingLetters: 0,
    attendanceToday: 0
  });
  
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [classAttendanceData, setClassAttendanceData] = useState<{name: string, pct: number}[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [trendData, setTrendData] = useState<{day: string, val: number, fullDate: string}[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showChart, setShowChart] = useState(false);
  
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>({
    metrics: true,
    quickActions: true,
    agenda: true,
    classAnalysis: true
  });

  const isKamad = userRole === UserRole.KEPALA_MADRASAH;
  const isStudent = userRole === UserRole.SISWA;
  const isTeacher = userRole === UserRole.GURU || userRole === UserRole.WALI_KELAS;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  const startAutoScroll = () => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    autoScrollInterval.current = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        if (scrollLeft >= maxScroll - 5) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        else scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 6000);
  };

  useEffect(() => {
    const savedPrefs = localStorage.getItem('dashboard_widgets');
    if (savedPrefs) { try { setVisibleWidgets(JSON.parse(savedPrefs)); } catch (e) {} }

    const fetchAllData = async () => {
        setLoadingStats(true);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        // Predetermine Trend Holders
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { day: format(d, 'eee'), fullDate: format(d, 'yyyy-MM-dd'), val: 0 };
        });

        if (isMockMode) {
            setTimeout(() => {
                setStats({ students: 842, teachers: 56, classes: 24, pendingLetters: 5, attendanceToday: 92 });
                setMaleStudents(410); setFemaleStudents(432);
                setTrendData(last7Days.map(d => ({ ...d, val: 85 + Math.floor(Math.random() * 15) })));
                setClassAttendanceData([
                    { name: 'XII IPA 1', pct: 98 },
                    { name: 'XII IPA 2', pct: 92 },
                    { name: 'XI IPS 1', pct: 85 },
                    { name: 'X AGAMA 1', pct: 72 }
                ]);
                setLoadingStats(false);
                setTimeout(() => setShowChart(true), 300);
            }, 1000);
            return;
        }

        if (!db) return;

        try {
            // SINKRONISASI LINTAS DATABASE (FIRESTORE)
            const [studentsSnap, teachersSnap, classesSnap, lettersSnap, attendanceTodaySnap, trendSnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get(),
                db.collection('classes').get(),
                db.collection('letters').where('status', '==', 'Pending').get(),
                db.collection('attendance').where('date', '==', todayStr).get(),
                db.collection('attendance').where('date', '>=', last7Days[0].fullDate).get()
            ]);

            // Map Student Details
            const sDocs = studentsSnap.docs.map(d => d.data() as Student);
            setMaleStudents(sDocs.filter(d => d.jenisKelamin === 'Laki-laki').length);
            setFemaleStudents(sDocs.filter(d => d.jenisKelamin === 'Perempuan').length);
            
            // Calculate Class Performance (Visual Bar Chart Source)
            const attendanceTodayDocs = attendanceTodaySnap.docs.map(d => d.data());
            const classPerf = classesSnap.docs.map(cDoc => {
                const className = cDoc.data().name;
                const studentsInClass = sDocs.filter(s => s.tingkatRombel === className);
                const totalInClass = studentsInClass.length || 1;
                const hadirInClass = attendanceTodayDocs.filter(a => 
                    a.class === className && 
                    (a.status === 'Hadir' || a.status === 'Terlambat' || a.status === 'Haid')
                ).length;
                return { name: className, pct: Math.round((hadirInClass / totalInClass) * 100) };
            });
            setClassAttendanceData(classPerf.sort((a,b) => b.pct - a.pct).slice(0, 5));

            // Update Master Stats
            setStats({
                students: studentsSnap.size,
                teachers: teachersSnap.size,
                classes: classesSnap.size,
                pendingLetters: lettersSnap.size,
                attendanceToday: attendanceTodaySnap.size
            });

            // Calculate Trend Percentage
            const totalSiswa = studentsSnap.size || 1;
            const trendRecords = trendSnap.docs.map(d => d.data());
            const calculatedTrend = last7Days.map(dayObj => {
                const dayRecords = trendRecords.filter(r => r.date === dayObj.fullDate);
                const hadirCount = dayRecords.filter(r => r.status === 'Hadir' || r.status === 'Terlambat' || r.status === 'Haid').length;
                return { ...dayObj, val: Math.round((hadirCount / totalSiswa) * 100) };
            });
            setTrendData(calculatedTrend);

        } catch (e) {
            console.error("Dashboard Sync Error:", e);
        } finally {
            setLoadingStats(false);
            setTimeout(() => setShowChart(true), 100);
        }
    };

    fetchAllData();
    if (visibleWidgets.metrics) startAutoScroll();
    return () => { if (autoScrollInterval.current) clearInterval(autoScrollInterval.current); };
  }, [visibleWidgets.metrics]);

  useEffect(() => {
      if (auth.currentUser) {
          setUserName(auth.currentUser.displayName || 'Pengguna');
          if (db) {
              db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                  if (doc.exists) setUserIdUnik(doc.data()?.idUnik || doc.data()?.nisn || null);
              });
          }
      }
  }, []);

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { show: isStudent || isTeacher || isKamad, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { show: !isStudent, label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    { show: isTeacher || isAdmin || isKamad, label: 'AI', icon: RobotIcon, view: ViewState.CONTENT_GENERATION, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { show: !isStudent, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { show: isStudent || isKamad, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: true, label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { show: isAdmin || isKamad, label: 'Laporan', icon: ChartBarIcon, view: ViewState.REPORTS, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' }
  ];

  return (
    <div className="flex flex-col h-full bg-transparent transition-colors">
      <div className="px-5 pt-12 pb-8 bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-b-[2.5rem] border-b border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-40">
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1.5 flex items-center gap-1.5">
                {isKamad && <ShieldCheckIcon className="w-3 h-3" />}
                IMAM Management {isKamad && "• Dashboard Pimpinan"}
            </p>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">Halo, {userName.split(' ')[0]}!</h1>
            <div className="flex items-center gap-2 mt-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    {userRole === UserRole.KEPALA_MADRASAH ? 'Kepala Madrasah' : userRole}
                </span>
                {isStudent && userIdUnik && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black tracking-widest border border-amber-100 dark:border-amber-800 shadow-sm">
                        <IdentificationIcon className="w-3 h-3" /> ID: {userIdUnik}
                    </span>
                )}
            </div>
          </div>
          <div className="flex gap-2.5 shrink-0">
             <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors" title="Settings">
                <CogIcon className="w-5 h-5" />
             </button>
             <button onClick={() => { if(window.confirm("Keluar sistem?")) onLogout(); }} className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all active:scale-90" title="Logout">
                <LogOutIcon className="w-5 h-5" />
             </button>
          </div>
        </div>

        {visibleWidgets.metrics && (
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-8 pb-4 snap-x snap-mandatory scrollbar-hide -mx-2 px-2"
          >
              {/* CARD: TREN REALTIME */}
              <div onClick={() => onNavigate(ViewState.REPORTS)} className="relative min-w-[300px] md:min-w-[340px] snap-center cursor-pointer group">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-[2rem] translate-y-3 scale-90 -rotate-1"></div>
                  <div className="relative z-10 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-700 to-indigo-900 text-white shadow-xl h-[180px] flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-white/10 border border-white/10"><ChartBarIcon className="w-4 h-4 text-white" /></div>
                              <span className="text-[10px] font-black uppercase tracking-widest">Aktivitas Lintas Data</span>
                          </div>
                          <span className="text-[7px] font-black bg-white/20 px-2 py-0.5 rounded-md uppercase">Live Sync</span>
                      </div>
                      <div className="flex-1 flex items-end justify-between gap-1.5 px-1 pb-1">
                            {trendData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                    <div className={`w-full rounded-t-md transition-all duration-1000 ${d.val >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ height: showChart ? `${Math.max(15, d.val * 0.6)}%` : '0%' }}></div>
                                    <span className="text-[7px] font-black opacity-50 uppercase">{d.day.substring(0,1)}</span>
                                </div>
                            ))}
                      </div>
                      <div className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center justify-between">
                          <span>Detail Analitik Terpadu</span>
                          <ArrowRightIcon className="w-3 h-3" />
                      </div>
                  </div>
              </div>

              {/* STAT CARDS: DYNAMIC FROM ALL COLLECTIONS */}
              <StatCardMini 
                label="Total Peserta Didik" 
                val={stats.students} 
                icon={UsersGroupIcon} 
                grad="from-blue-600 to-indigo-800" 
                detail={`${maleStudents} L • ${femaleStudents} P`} 
                onPress={() => onNavigate(ViewState.STUDENTS)}
              />
              <StatCardMini 
                label="Guru & Tenaga Kependidikan" 
                val={stats.teachers} 
                icon={BriefcaseIcon} 
                grad="from-emerald-600 to-teal-800" 
                detail="Direktori GTK" 
                onPress={() => onNavigate(ViewState.TEACHERS)}
              />
              <StatCardMini 
                label="Layanan PTSP (Surat)" 
                val={stats.pendingLetters} 
                icon={EnvelopeIcon} 
                grad="from-rose-600 to-pink-800" 
                detail="Antrean Verifikasi" 
                onPress={() => onNavigate(ViewState.LETTERS)}
              />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-10 scrollbar-hide pb-40">
        {visibleWidgets.quickActions && (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-5">
              {quickMenuItems.map((item, idx) => item.show && (
                  <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-2 group">
                      <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-sm border border-black/5 active:scale-90 transition-all ${item.bg}`}>
                          <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center truncate w-full">{item.label}</span>
                  </button>
              ))}
          </div>
        )}

        {visibleWidgets.classAnalysis && classAttendanceData.length > 0 && (
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Performa Presensi Rombel</h3>
                    <button onClick={() => onNavigate(ViewState.REPORTS)} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">Semua <ArrowRightIcon className="w-3 h-3" /></button>
                </div>
                <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
                    {classAttendanceData.map((cls, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                <span className="text-slate-700 dark:text-slate-300">{cls.name}</span>
                                <span className={cls.pct >= 90 ? 'text-emerald-500' : cls.pct >= 75 ? 'text-amber-500' : 'text-rose-500'}>{cls.pct}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${cls.pct >= 90 ? 'bg-emerald-500' : cls.pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: showChart ? `${cls.pct}%` : '0%' }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {visibleWidgets.agenda && (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Agenda Terintegrasi</h3>
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-5 p-4">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.5rem] flex flex-col items-center justify-center font-black">
                            <span className="text-[10px]">07:30</span>
                            <div className="w-4 h-0.5 bg-indigo-200 my-1"></div>
                            <span className="text-[10px]">09:00</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">KBM Inti Akademik</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Status Database: Live</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const StatCardMini = ({ label, val, icon: Icon, grad, detail, onPress }: any) => (
    <div onClick={onPress} className="relative min-w-[280px] snap-center cursor-pointer group">
        <div className={`absolute inset-0 bg-slate-900/10 rounded-[2rem] translate-y-3 scale-90`}></div>
        <div className={`relative z-10 p-6 rounded-[2rem] bg-gradient-to-br ${grad} text-white shadow-xl h-[180px] flex flex-col`}>
            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10"><Icon className="w-6 h-6" /></div>
                <span className="bg-white/20 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Summary</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</p>
            <h3 className="text-4xl font-black mt-1">{val}</h3>
            <div className="mt-auto flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                <span>{detail}</span>
                <ArrowRightIcon className="w-4 h-4" />
            </div>
        </div>
    </div>
);

export default Dashboard;
