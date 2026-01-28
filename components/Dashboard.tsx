
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole, Student } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, BriefcaseIcon, UserIcon,
  QrCodeIcon, ArrowRightIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, RobotIcon, BookOpenIcon, CogIcon,
  IdentificationIcon, StarIcon, BuildingLibraryIcon,
  LogOutIcon, CameraIcon, SparklesIcon,
  ClipboardDocumentListIcon
} from './Icons';
import { format } from 'date-fns';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userRole: UserRole;
  onLogout: () => void;
  onOpenSidebar?: () => void;
}

interface ClassStat {
    name: string;
    totalStudents: number;
    presentMale: number;
    presentFemale: number;
    totalMale: number;
    totalFemale: number;
    pct: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userRole, onLogout }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [userIdUnik, setUserIdUnik] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    pendingLetters: 0,
    attendanceToday: 0
  });
  
  const [classDetailedStats, setClassDetailedStats] = useState<ClassStat[]>([]);
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  
  const [trendData, setTrendData] = useState<{day: string, val: number, fullDate: string}[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showChart, setShowChart] = useState(false);
  
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const isStudent = userRole === UserRole.SISWA;
  const isTeacher = userRole === UserRole.GURU || userRole === UserRole.WALI_KELAS;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;
  const isKamad = userRole === UserRole.KEPALA_MADRASAH;

  // Foto Kepala Madrasah High Definition (Full Frame)
  const prestigePhoto = "https://lh3.googleusercontent.com/d/1nUuvSSEI4pj7YZd_Hy4iSO62LM-_KuoE";

  // LOAD DATA
  useEffect(() => {
    const fetchAllData = async () => {
        setLoadingStats(true);
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
                setClassDetailedStats([
                    { name: 'XII IPA 1', totalStudents: 32, totalMale: 14, totalFemale: 18, presentMale: 13, presentFemale: 18, pct: 97 },
                    { name: 'XI IPS 1', totalStudents: 35, totalMale: 20, totalFemale: 15, presentMale: 18, presentFemale: 12, pct: 85 },
                    { name: 'X AGAMA', totalStudents: 28, totalMale: 10, totalFemale: 18, presentMale: 8, presentFemale: 15, pct: 82 }
                ]);
                setTodayAttendance({ status: 'Hadir', checkIn: '07:12' });
                setLoadingStats(false);
                setTimeout(() => setShowChart(true), 300);
            }, 800);
            return;
        }

        if (!db) return;
        try {
            const [studentsSnap, teachersSnap, classesSnap, lettersSnap, attendanceTodaySnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get(),
                db.collection('classes').get(),
                db.collection('letters').where('status', '==', 'Pending').get(),
                db.collection('attendance').where('date', '==', format(new Date(), 'yyyy-MM-dd')).get()
            ]);

            const sDocs = studentsSnap.docs.map(d => d.data() as Student);
            setMaleStudents(sDocs.filter(d => d.jenisKelamin === 'Laki-laki').length);
            setFemaleStudents(sDocs.filter(d => d.jenisKelamin === 'Perempuan').length);
            
            const detailedStats: ClassStat[] = classesSnap.docs.map(cDoc => {
                const className = cDoc.data().name;
                const studentsInClass = sDocs.filter(s => s.tingkatRombel === className);
                const totalInClass = studentsInClass.length;
                const presentInClass = attendanceTodaySnap.docs.filter(a => a.data().class === className && ['Hadir', 'Terlambat', 'Haid'].includes(a.data().status)).length;
                return {
                    name: className, totalStudents: totalInClass, totalMale: studentsInClass.filter(s => s.jenisKelamin === 'Laki-laki').length,
                    totalFemale: studentsInClass.filter(s => s.jenisKelamin === 'Perempuan').length,
                    presentMale: 0, presentFemale: 0,
                    pct: totalInClass > 0 ? Math.round((presentInClass / totalInClass) * 100) : 0
                };
            }).sort((a,b) => b.pct - a.pct);

            setClassDetailedStats(detailedStats);
            setStats({ students: studentsSnap.size, teachers: teachersSnap.size, classes: classesSnap.size, pendingLetters: lettersSnap.size, attendanceToday: attendanceTodaySnap.size });
            setTrendData(last7Days.map(d => ({ ...d, val: 90 })));

            if (auth.currentUser) {
                const myAtt = attendanceTodaySnap.docs.find(d => d.data().studentId === auth.currentUser?.uid || d.data().idUnik === userIdUnik);
                if (myAtt) setTodayAttendance(myAtt.data());
            }
        } catch (e) { console.error(e); } finally { setLoadingStats(false); setShowChart(true); }
    };
    fetchAllData();
  }, [userIdUnik]);

  useEffect(() => {
      if (auth.currentUser) {
          setUserName(auth.currentUser.displayName || 'Pengguna');
          if (db) {
              db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                  if (doc.exists) {
                      const data = doc.data();
                      setUserIdUnik(data?.idUnik || data?.nisn || null);
                  }
              });
          }
      }
  }, []);

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { show: true, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { show: !isStudent, label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    { show: !isStudent && (isTeacher || isAdmin || isKamad), label: 'AI', icon: RobotIcon, view: ViewState.CONTENT_GENERATION, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { show: !isStudent, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { show: true, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: true, label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { show: isAdmin || isKamad, label: 'Laporan', icon: ChartBarIcon, view: ViewState.REPORTS, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      
      {/* --- HEADER --- */}
      <div className="px-6 pt-12 pb-6 bg-white dark:bg-[#0B1121] rounded-b-[2.5rem] border-b border-slate-100 dark:border-slate-800/50 shadow-sm sticky top-0 z-40">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {isStudent ? 'Portal Siswa Digital' : isKamad ? 'Dashboard Pimpinan' : 'Management System'}
                </p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                Halo, {userName.split(' ')[0]}!
            </h1>
            <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 shadow-sm">
                    {userRole === UserRole.KEPALA_MADRASAH ? 'Kepala Madrasah' : userRole}
                </span>
                {isStudent && userIdUnik && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black tracking-widest border border-amber-100 dark:border-amber-800 shadow-sm">
                        <IdentificationIcon className="w-3 h-3" /> {userIdUnik}
                    </span>
                )}
            </div>
          </div>
          <div className="flex gap-2.5 shrink-0">
             <button onClick={() => onNavigate(ViewState.SETTINGS)} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800">
                <CogIcon className="w-5 h-5" />
             </button>
             <button onClick={() => { if(window.confirm("Keluar sistem?")) onLogout(); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all active:scale-90 border border-rose-100 dark:border-rose-900/30">
                <LogOutIcon className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* --- DYNAMIC STATS TRACK (MANUAL SCROLL) --- */}
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-2 px-2 snap-x">
            
            {/* Student Specific Attendance Widget */}
            {isStudent && (
                <div onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} className="min-w-[260px] snap-center bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-5 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"><CheckCircleIcon className="w-24 h-24" /></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Status Kehadiran Hari Ini</p>
                        <h3 className="text-xl font-black mb-4">
                            {todayAttendance ? (todayAttendance.status === 'Hadir' ? 'Hadir Tepat Waktu' : todayAttendance.status) : 'Belum Scan Masuk'}
                        </h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="w-3.5 h-3.5 opacity-60" />
                                <span className="text-[10px] font-bold">{todayAttendance?.checkIn || '--:--'} WIB</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-lg">Detail</span>
                        </div>
                    </div>
                </div>
            )}

            {/* General Metrics for Non-Students */}
            {!isStudent && (
                <>
                    {/* KEPALA MADRASAH IDENTITY CARD - PRESTIGE FULL FRAME */}
                    <div className="relative min-w-[280px] md:min-w-[360px] snap-center cursor-pointer group transition-all duration-700">
                        <div className="relative z-10 rounded-[2.5rem] bg-[#0F172A] text-white shadow-2xl h-[200px] flex flex-col justify-end overflow-hidden border border-white/10 group-hover:scale-[1.02] group-hover:shadow-indigo-500/10">
                            
                            {/* Full Frame Photo with Parallax effect */}
                            <div className="absolute inset-0 z-0">
                                <img 
                                  src={prestigePhoto} 
                                  className="w-full h-full object-cover object-top scale-100 group-hover:scale-110 transition-transform duration-[3000ms]" 
                                  alt="H. Someran, S.Pd.,MM" 
                                />
                                {/* Scrim Overlay for Legibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-indigo-900/10 mix-blend-overlay"></div>
                            </div>
                            
                            {/* Prestige Label (Top Right) */}
                            <div className="absolute top-4 right-4 z-20">
                                <div className="bg-yellow-400 text-indigo-950 p-2 rounded-2xl shadow-xl border border-white/30 animate-pulse">
                                    <StarIcon className="w-5 h-5 fill-current" />
                                </div>
                            </div>

                            {/* Pimpinan Detail Info (Bottom) */}
                            <div className="relative z-10 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-3.5 h-3.5 text-yellow-400" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-yellow-400 drop-shadow-md">Kepala Madrasah</span>
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-tight leading-none drop-shadow-lg">H. Someran, S.Pd.,MM</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10">
                                        <p className="text-[8px] font-mono font-bold text-slate-300 uppercase tracking-tighter">NIP. 196703021996031001</p>
                                    </div>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Realtime Analysis Chart Card */}
                    <div onClick={() => onNavigate(ViewState.REPORTS)} className="relative min-w-[280px] md:min-w-[320px] snap-center cursor-pointer group transition-transform duration-500 hover:scale-[1.02]">
                        <div className="relative z-10 p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-700 to-indigo-900 text-white shadow-xl h-[200px] flex flex-col overflow-hidden border border-white/5">
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white/10 border border-white/10"><ChartBarIcon className="w-4 h-4 text-white" /></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Analitik Realtime</span>
                                    </div>
                                    <span className="text-[7px] font-black bg-white/20 px-2 py-0.5 rounded-md uppercase animate-pulse">Live Sync</span>
                                </div>
                                <div className="flex-1 flex items-end justify-between gap-2 px-1 pb-1">
                                    {trendData.map((d, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                            <div className={`w-full rounded-t-lg transition-all duration-1000 relative ${d.val >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ height: showChart ? `${Math.max(15, d.val * 0.65)}%` : '0%' }}></div>
                                            <span className="text-[7px] font-black opacity-50 uppercase">{d.day.substring(0,1)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center justify-between"><span>Detail Aktifitas</span><ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></div>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Class Analysis */}
                    {classDetailedStats.map((cls, i) => (
                        <div key={`cls-${i}`} className="min-w-[260px] snap-center bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all h-[200px] flex flex-col justify-between">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Rombel Performa</p>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{cls.name}</h4>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${cls.pct >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {cls.pct}%
                                </div>
                            </div>
                            
                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cls.totalStudents} Siswa Terdaftar</span>
                                    <UsersGroupIcon className="w-4 h-4 text-slate-200" />
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${cls.pct >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${cls.pct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <StatCardMini label="Peserta Didik" val={stats.students} icon={UsersGroupIcon} grad="from-blue-600 to-indigo-800" detail={`${maleStudents} L • ${femaleStudents} P`} onPress={() => onNavigate(ViewState.STUDENTS)} />
                    <StatCardMini label="Direktori Guru" val={stats.teachers} icon={BriefcaseIcon} grad="from-emerald-600 to-teal-800" detail="Direktori GTK" onPress={() => onNavigate(ViewState.TEACHERS)} />
                </>
            )}

            {/* Academic Summary for Student */}
            {isStudent && (
                <div onClick={() => onNavigate(ViewState.REPORT_CARDS)} className="min-w-[260px] snap-center bg-white dark:bg-[#151E32] rounded-[2.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] -rotate-12"><AcademicCapIcon className="w-24 h-24" /></div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Indeks Prestasi</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Mutu: A</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[92%]"></div>
                            </div>
                            <span className="text-10px font-black text-emerald-500">92%</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-40">
        
        {/* --- STUDENT QUICK ACCESS --- */}
        {isStudent && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div onClick={() => onNavigate(ViewState.ID_CARD)} className="bg-white dark:bg-[#151E32] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-5 group cursor-pointer active:scale-95 transition-all">
                    <div className="w-20 h-20 rounded-[2.2rem] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                        <QrCodeIcon className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">KARTU PELAJAR DIGITAL</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-[0.2em]">Tunjukkan saat presensi mandiri di gerbang</p>
                    </div>
                    <div className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                        Buka Kartu
                    </div>
                </div>
            </div>
        )}

        {/* --- GRID MENU --- */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-6">
            {quickMenuItems.map((item, idx) => item.show && (
                <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-sm border border-black/5 active:scale-90 transition-all group-hover:-translate-y-1 ${item.bg}`}>
                        <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${item.color}`} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-center truncate w-full px-1">{item.label}</span>
                </button>
            ))}
        </div>

        {/* --- AGENDA WIDGET --- */}
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">
                {isStudent ? 'JADWAL HARI INI' : 'Agenda Terintegrasi'}
            </h3>
            <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-all">
                <div className="flex items-center gap-5 p-4">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.5rem] flex flex-col items-center justify-center font-black shadow-sm group">
                        <span className="text-[11px]">07:30</span>
                        <div className="w-4 h-0.5 bg-indigo-200 dark:bg-indigo-500/30 my-1"></div>
                        <span className="text-[11px]">09:00</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">
                            {isStudent ? 'Matematika Wajib' : 'KBM Inti Akademik'}
                        </h4>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            {isStudent ? <><UserIcon className="w-3 h-3" /> Budi Santoso, S.Pd</> : <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Status: Aktif</>}
                        </div>
                    </div>
                    {isStudent && (
                        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[8px] font-black text-slate-400 border border-slate-100 dark:border-slate-700">
                            R. 12
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- HELP ASSISTANT (AI) --- */}
        <div onClick={() => onNavigate(ViewState.ADVISOR)} className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[2.5rem] p-6 border border-indigo-100 dark:border-indigo-800/50 cursor-pointer group active:scale-[0.98] transition-all">
            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-md"><RobotIcon className="w-6 h-6 text-indigo-600" /></div>
                <div className="flex-1">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Butuh Bantuan Live Chat?</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Tanyakan tentang fitur sistem kepada asisten cerdas IMAM melalui Live Chat.</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCardMini = ({ label, val, icon: Icon, grad, detail, onPress }: any) => (
    <div onClick={onPress} className="relative min-w-[260px] md:min-w-[300px] snap-center cursor-pointer group transition-all duration-500 hover:scale-[1.02]">
        <div className={`relative z-10 p-6 rounded-[2.5rem] bg-gradient-to-br ${grad} text-white shadow-xl h-[200px] flex flex-col overflow-hidden`}>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors shadow-lg"><Icon className="w-6 h-6" /></div><span className="bg-white/20 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest group-hover:bg-white/30 transition-colors">Summary</span></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</p>
                <h3 className="text-4xl font-black mt-1 group-hover:translate-x-1 transition-transform">{val}</h3>
                <div className="mt-auto flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-60"><span>{detail}</span><ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
            </div>
        </div>
    </div>
);

export default Dashboard;
