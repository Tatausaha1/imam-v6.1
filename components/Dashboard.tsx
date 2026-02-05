
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole, Student, ClassData } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, BriefcaseIcon, UserIcon,
  QrCodeIcon, ArrowRightIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, RobotIcon, BookOpenIcon, CogIcon,
  IdentificationIcon, StarIcon, BuildingLibraryIcon,
  LogOutIcon, CameraIcon, SparklesIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon, HeartIcon, HeadsetIcon
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

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userRole, onLogout }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [userIdUnik, setUserIdUnik] = useState<string | null>(null);
  const [managedClass, setManagedClass] = useState<ClassData | null>(null);
  
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    pendingLetters: 0,
    attendanceToday: 0
  });
  
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [classAttendancePct, setClassAttendancePct] = useState<number>(0);
  
  const [trendData, setTrendData] = useState<{day: string, val: number, fullDate: string}[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showChart, setShowChart] = useState(false);
  
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const isStudent = userRole === UserRole.SISWA;
  const isWaliKelas = userRole === UserRole.WALI_KELAS;
  const isTeacher = userRole === UserRole.GURU || isWaliKelas;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;
  const isKamad = userRole === UserRole.KEPALA_MADRASAH;
  const isStaffAction = isAdmin || isTeacher || userRole === UserRole.STAF;

  const prestigePhoto = "https://lh3.googleusercontent.com/d/1nUuvSSEI4pj7YZd_Hy4iSO62LM-_KuoE";
  const mobileBgImage = "https://lh3.googleusercontent.com/d/1o8KomVWrJbSQi4m3JdJO1WbbeZHWyrrW";

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
                setTodayAttendance({ status: 'Hadir', checkIn: '07:12', duha: '08:05', zuhur: '12:30', ashar: null, checkOut: null });
                if (isWaliKelas) {
                    setManagedClass({ id: 'c1', name: 'XII IPA 1', level: '12', academicYear: '2023/2024' });
                    setClassAttendancePct(96);
                }
                setLoadingStats(false);
                setTimeout(() => setShowChart(true), 300);
            }, 800);
            return;
        }

        if (!db) return;
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const [studentsSnap, teachersSnap, classesSnap, lettersSnap, attendanceTodaySnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get(),
                db.collection('classes').get(),
                db.collection('letters').where('status', '==', 'Pending').get(),
                db.collection('attendance').where('date', '==', todayStr).get()
            ]);

            const sDocs = studentsSnap.docs.map(d => d.data() as Student);
            setStats({ students: studentsSnap.size, teachers: teachersSnap.size, classes: classesSnap.size, pendingLetters: lettersSnap.size, attendanceToday: attendanceTodaySnap.size });
            setTrendData(last7Days.map(d => ({ ...d, val: 90 })));

            if (auth.currentUser) {
                const uid = auth.currentUser.uid;
                const myAtt = attendanceTodaySnap.docs.find(d => d.data().studentId === uid || d.data().idUnik === userIdUnik);
                if (myAtt) setTodayAttendance(myAtt.data());

                if (isWaliKelas) {
                    const myClassDoc = classesSnap.docs.find(d => d.data().teacherId === uid);
                    if (myClassDoc) {
                        const classData = { id: myClassDoc.id, ...myClassDoc.data() } as ClassData;
                        setManagedClass(classData);
                        const classStudents = sDocs.filter(s => s.tingkatRombel === classData.name);
                        const classAttendanceCount = attendanceTodaySnap.docs.filter(d => d.data().class === classData.name).length;
                        setMaleStudents(classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length);
                        setFemaleStudents(classStudents.filter(s => s.jenisKelamin === 'Perempuan').length);
                        if (classStudents.length > 0) {
                            setClassAttendancePct(Math.round((classAttendanceCount / classStudents.length) * 100));
                        }
                    }
                } else {
                    setMaleStudents(sDocs.filter(d => d.jenisKelamin === 'Laki-laki').length);
                    setFemaleStudents(sDocs.filter(d => d.jenisKelamin === 'Perempuan').length);
                }
            }
        } catch (e) { console.error(e); } finally { setLoadingStats(false); setShowChart(true); }
    };
    fetchAllData();
  }, [userIdUnik, userRole, isWaliKelas]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-white dark:bg-slate-800' },
    { show: isWaliKelas || isAdmin || isKamad, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Database', icon: ChartBarIcon, view: ViewState.REPORTS, color: 'text-slate-600', bg: 'bg-white dark:bg-slate-800' }
  ];

  const MiniSessionTracker = ({ data }: { data: any }) => {
    const sessions = [
        { key: 'checkIn', label: 'M' },
        { key: 'duha', label: 'D' },
        { key: 'zuhur', label: 'Z' },
        { key: 'ashar', label: 'A' },
        { key: 'checkOut', label: 'P' }
    ];
    return (
        <div className="flex gap-1 mt-3">
            {sessions.map(s => {
                const val = data ? data[s.key] : null;
                const isHaid = val && String(val).includes('Haid');
                const isFilled = !!val;
                return (
                    <div key={s.key} className={`w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black border transition-all ${
                        isFilled 
                        ? (isHaid ? 'bg-rose-500 border-rose-400 text-white shadow-lg' : 'bg-emerald-500 border-emerald-400 text-white shadow-lg') 
                        : 'bg-white/10 border-white/5 text-white/30'
                    }`}>
                        {s.label}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500 relative">
      
      {/* --- BACKGROUND IMAGE UNTUK MOBILE (GLOBAL DASHBOARD) --- */}
      <div className="absolute inset-0 lg:hidden z-0 pointer-events-none">
          <img 
            src={mobileBgImage} 
            className="w-full h-full object-cover opacity-100" 
            alt="" 
          />
          <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-[1px]"></div>
      </div>

      {/* --- FLOATING ACTION BUTTONS (FIXED POSITION) --- */}
      <div className="absolute bottom-24 right-6 z-[60] flex flex-col gap-3 items-center animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          {isStaffAction && (
            <button 
              onClick={() => onNavigate(ViewState.SCANNER)}
              className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center border-2 border-white/20 active:scale-90 transition-all group relative animate-bounce-slow"
            >
                <CameraIcon className="w-6 h-6" />
            </button>
          )}
          <button 
            onClick={() => onNavigate(ViewState.ADVISOR)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-[0_15px_40px_rgba(79,70,229,0.4)] flex items-center justify-center border-2 border-white/20 active:scale-90 transition-all group relative"
          >
              <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
              <HeadsetIcon className="w-8 h-8 relative z-10" />
          </button>
      </div>

      {/* --- HEADER --- */}
      <div className="px-4 pt-10 pb-4 bg-white/70 dark:bg-[#0B1121]/70 backdrop-blur-xl rounded-b-[2.2rem] border-b border-slate-100 dark:border-slate-800/50 shadow-sm sticky top-0 z-40 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 animate-in fade-in slide-in-from-left-4 duration-1000">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[0.2em]">
                    {isStudent ? 'Portal Siswa' : isKamad ? 'Dashboard Pimpinan' : isWaliKelas ? 'Wali Kelas' : 'Manajemen Madrasah'}
                </p>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                Halo, {userName.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
             <button onClick={() => { if(window.confirm("Keluar sistem?")) onLogout(); }} className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                <LogOutIcon className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing`}
        >
            {isWaliKelas && managedClass && (
                <div 
                    onClick={() => onNavigate(ViewState.CLASSES)} 
                    className="min-w-[240px] snap-center bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[2rem] p-4 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Rombel Binaan</p>
                        <h3 className="text-lg font-black mb-0.5">{managedClass.name}</h3>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-[9px] font-bold">Presensi: {classAttendancePct}%</span>
                            <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-xl">Kelola</span>
                        </div>
                    </div>
                </div>
            )}

            {isStudent && (
                <div 
                    onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} 
                    className="min-w-[240px] snap-center bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-4 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Kehadiran Saya</p>
                        <h3 className="text-lg font-black">{todayAttendance ? todayAttendance.status : 'Belum Scan'}</h3>
                        <MiniSessionTracker data={todayAttendance} />
                    </div>
                </div>
            )}

            {!isStudent && (
                <>
                    <div className="relative min-w-[260px] snap-center cursor-pointer group">
                        <div className="relative z-10 rounded-[2rem] bg-[#0F172A] text-white shadow-2xl h-[160px] flex flex-col justify-end overflow-hidden border border-white/10">
                            <div className="absolute inset-0 z-0">
                                <img src={prestigePhoto} className="w-full h-full object-cover object-top" alt="Pimpinan" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/30 to-transparent"></div>
                            </div>
                            <div className="relative z-10 p-4">
                                <h4 className="text-sm font-black uppercase tracking-tight leading-none">H. Someran, S.Pd.,MM</h4>
                                <p className="text-[7px] font-mono font-bold text-slate-300 mt-1">NIP. 196703021996031001</p>
                            </div>
                        </div>
                    </div>
                    <StatCardMini label={isWaliKelas ? "Siswa Kelas" : "Siswa Aktif"} val={isWaliKelas ? (maleStudents + femaleStudents) : stats.students} icon={UsersGroupIcon} grad="from-blue-600 to-indigo-800" detail={`${maleStudents} L • ${femaleStudents} P`} onPress={() => onNavigate(ViewState.STUDENTS)} />
                </>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide pb-32 z-10">
        
        {isStudent && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                <div onClick={() => onNavigate(ViewState.ID_CARD)} className="bg-white p-6 rounded-[2.5rem] border border-white/40 dark:border-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.1)] flex flex-col items-center gap-3 group cursor-pointer active:scale-95 transition-all">
                    <div className="w-16 h-16 rounded-[1.8rem] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white">
                        <QrCodeIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">KARTU PELAJAR DIGITAL</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Tunjukkan pada Petugas Gerbang</p>
                    </div>
                </div>
            </div>
        )}

        {/* Menu Grid - Solid Background Icons */}
        <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
            {quickMenuItems.map((item, idx) => item.show && (
                <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-12 h-12 rounded-[1.4rem] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-700 active:scale-90 transition-all ${item.bg}`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 text-center truncate w-full px-0.5">{item.label}</span>
                </button>
            ))}
        </div>

        {/* Agenda Section */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <h3 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest px-1">
                {isStudent ? 'JADWAL HARI INI' : 'Agenda Mendatang'}
            </h3>
            <div className="bg-white dark:bg-[#151E32] rounded-[2rem] p-1.5 shadow-md border border-white/40 dark:border-slate-800">
                <div className="flex items-center gap-4 p-3">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-lg shadow-indigo-500/20">
                        <span className="text-[9px]">07:30</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">
                            {isStudent ? 'Matematika Wajib' : 'Kegiatan KBM'}
                        </h4>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center opacity-60 shadow-inner">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[0.3em]">IMAM Management v6.1 • 2025</p>
        </div>

      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const StatCardMini = ({ label, val, icon: Icon, grad, detail, onPress }: any) => (
    <div onClick={onPress} className="relative min-w-[220px] snap-center cursor-pointer group">
        <div className={`relative z-10 p-4 rounded-[2rem] bg-gradient-to-br ${grad} text-white shadow-xl h-[160px] flex flex-col overflow-hidden`}>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg"><Icon className="w-5 h-5" /></div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <h3 className="text-3xl font-black mt-0.5">{val}</h3>
                <div className="mt-auto flex items-center justify-between text-[7px] font-black uppercase tracking-widest opacity-60"><span>{detail}</span><ArrowRightIcon className="w-3 h-3" /></div>
            </div>
        </div>
    </div>
);

export default Dashboard;
