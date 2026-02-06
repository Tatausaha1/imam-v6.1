
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
    pendingLetters: 5,
    attendanceToday: 0
  });
  
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [classAttendancePct, setClassAttendancePct] = useState<number>(0);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const isStudent = userRole === UserRole.SISWA;
  const isWaliKelas = userRole === UserRole.WALI_KELAS;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;
  const isKamad = userRole === UserRole.KEPALA_MADRASAH;
  // Fix: Move isTeacher declaration before isStaffAction to avoid "used before declaration" error
  const isTeacher = userRole === UserRole.GURU || isWaliKelas;
  const isStaffAction = isAdmin || isTeacher || userRole === UserRole.STAF;

  // Foto Developer untuk pusat Dashboard
  const devPhoto = "https://lh3.googleusercontent.com/d/1N61n6BzZXDnRCGA3BcmTpFYS0MYh6o4E";
  const mobileBgImage = "https://lh3.googleusercontent.com/d/1o8KomVWrJbSQi4m3JdJO1WbbeZHWyrrW";

  useEffect(() => {
    const fetchAllData = async () => {
        setLoadingStats(true);
        if (isMockMode) {
            setTimeout(() => {
                setStats({ students: 842, teachers: 56, classes: 24, pendingLetters: 5, attendanceToday: 92 });
                setMaleStudents(410); setFemaleStudents(432);
                setTodayAttendance({ status: 'Hadir', checkIn: '07:12', duha: '08:05', zuhur: '12:30', ashar: null, checkOut: null });
                if (isWaliKelas) {
                    setManagedClass({ id: 'c1', name: 'XII IPA 1', level: '12', academicYear: '2024/2025' });
                    setClassAttendancePct(96);
                }
                setLoadingStats(false);
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
        } catch (e) { console.error(e); } finally { setLoadingStats(false); }
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
    { show: true, label: 'Poin', icon: ShieldCheckIcon, view: ViewState.POINTS, color: 'text-rose-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-white dark:bg-slate-800' },
    { show: isWaliKelas || isAdmin || isKamad, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Database', icon: ChartBarIcon, view: ViewState.REPORTS, color: 'text-slate-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'AI Chat', icon: HeadsetIcon, view: ViewState.ADVISOR, color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800' }
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
          <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[2px]"></div>
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
      <div className="px-4 pt-10 pb-6 bg-white/70 dark:bg-[#0B1121]/70 backdrop-blur-xl rounded-b-[2.5rem] border-b border-slate-100 dark:border-slate-800/50 shadow-sm sticky top-0 z-40 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 animate-in fade-in slide-in-from-left-4 duration-1000">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-[0.2em]">
                    {isStudent ? 'Portal Siswa' : isKamad ? 'Dashboard Pimpinan' : isWaliKelas ? 'Wali Kelas' : 'Manajemen Madrasah'}
                </p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                Halo, {userName.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
             <button onClick={() => { if(window.confirm("Keluar sistem?")) onLogout(); }} className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 active:scale-90 transition-all">
                <LogOutIcon className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* --- CENTRAL PROFILE AVATAR WITH SPINNING RING --- */}
        <div className="flex flex-col items-center justify-center py-4 mb-2 animate-in zoom-in duration-1000 relative">
            <div className="relative group">
                {/* Rotating Glow Ring */}
                <div className="absolute inset-[-12px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 opacity-40 blur-md animate-spin-slow"></div>
                
                {/* Fixed Border Ring */}
                <div className="absolute inset-[-4px] rounded-full border-2 border-white/50 dark:border-white/10 z-10"></div>

                {/* Developer Avatar */}
                <div 
                    onClick={() => onNavigate(ViewState.PROFILE)}
                    className="w-28 h-28 rounded-full border-[6px] border-white dark:border-[#0B1121] shadow-2xl relative z-20 overflow-hidden cursor-pointer active:scale-95 transition-all"
                >
                    <img 
                        src={devPhoto} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt="Profile" 
                    />
                </div>

                {/* Floating Badge (Poin Focus) */}
                <div className="absolute -bottom-2 -right-2 z-30 bg-white dark:bg-[#151E32] p-2.5 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-1.5 animate-bounce-slow">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">100 Poin</span>
                </div>
            </div>
            
            <div className="text-center mt-6">
                <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.4em] mb-1">Status Kedisiplinan</p>
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sangat Baik</span>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide pb-32 z-10">
        
        {/* --- HORIZONTAL CARDS --- */}
        <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={`flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing`}
        >
            {isWaliKelas && managedClass && (
                <div 
                    onClick={() => onNavigate(ViewState.CLASSES)} 
                    className="min-w-[280px] snap-center bg-gradient-to-br from-indigo-700 to-indigo-950 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70 mb-1">Rombel Binaan</p>
                        <h3 className="text-xl font-black mb-1">{managedClass.name}</h3>
                        <div className="flex items-center justify-between mt-6">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase opacity-60">Kehadiran Hari Ini</span>
                                <span className="text-lg font-black">{classAttendancePct}%</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md">Kelola</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-10 rotate-12"><UsersGroupIcon className="w-32 h-32" /></div>
                </div>
            )}

            {isStudent && (
                <div 
                    onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} 
                    className="min-w-[280px] snap-center bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 cursor-pointer group relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70 mb-1">Kehadiran Saya</p>
                        <h3 className="text-xl font-black">{todayAttendance ? todayAttendance.status : 'Belum Absen'}</h3>
                        <MiniSessionTracker data={todayAttendance} />
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-10"><ClockIcon className="w-32 h-32" /></div>
                </div>
            )}

            {!isStudent && (
                <>
                    <div className="relative min-w-[280px] snap-center cursor-pointer group">
                        <div className="relative z-10 rounded-[2.5rem] bg-[#0F172A] text-white shadow-2xl h-[180px] flex flex-col justify-end overflow-hidden border border-white/10">
                            <div className="absolute inset-0 z-0">
                                <img src="https://lh3.googleusercontent.com/d/1nUuvSSEI4pj7YZd_Hy4iSO62LM-_KuoE" className="w-full h-full object-cover object-top" alt="Pimpinan" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent"></div>
                            </div>
                            <div className="relative z-10 p-5">
                                <h4 className="text-base font-black uppercase tracking-tight leading-none">H. Someran, S.Pd.,MM</h4>
                                <p className="text-[8px] font-mono font-bold text-slate-300 mt-1.5 uppercase">Kepala Madrasah</p>
                            </div>
                        </div>
                    </div>
                    <StatCardMini label={isWaliKelas ? "Siswa Kelas" : "Siswa Aktif"} val={isWaliKelas ? (maleStudents + femaleStudents) : stats.students} icon={UsersGroupIcon} grad="from-blue-600 to-indigo-900" detail={`${maleStudents} L • ${femaleStudents} P`} onPress={() => onNavigate(ViewState.STUDENTS)} />
                </>
            )}
        </div>

        {/* Menu Grid - Solid Background Icons */}
        <div className="grid grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400 px-1">
            {quickMenuItems.map((item, idx) => item.show && (
                <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-[1.6rem] flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-800 active:scale-90 transition-all duration-300 ${item.bg}`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 text-center truncate w-full px-0.5">{item.label}</span>
                </button>
            ))}
        </div>

        {/* Status Section for Students */}
        {isStudent && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                <div onClick={() => onNavigate(ViewState.ID_CARD)} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><QrCodeIcon className="w-5 h-5" /></div>
                    <span className="text-[9px] font-black uppercase text-center text-slate-800 dark:text-white leading-none">ID Digital</span>
                </div>
                <div onClick={() => onNavigate(ViewState.POINTS)} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600"><ShieldCheckIcon className="w-5 h-5" /></div>
                    <span className="text-[9px] font-black uppercase text-center text-slate-800 dark:text-white leading-none">Poin Disiplin</span>
                </div>
            </div>
        )}

        {/* Agenda Section */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-600">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                    Agenda Hari Ini
                </h3>
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{format(new Date(), 'dd MMM yyyy')}</span>
            </div>
            <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-2 shadow-md border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-5 p-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.4rem] flex flex-col items-center justify-center font-black shrink-0 shadow-xl shadow-indigo-500/20">
                        <span className="text-[11px]">07:30</span>
                        <div className="w-4 h-0.5 bg-indigo-400 mt-1 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">
                            {isStudent ? 'Matematika Wajib' : 'Jam Masuk Kerja'}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Mulai Pembelajaran</p>
                    </div>
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500 opacity-30" />
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center opacity-60 shadow-inner">
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">IMAM Management v6.2 • 2025</p>
        </div>

      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const StatCardMini = ({ label, val, icon: Icon, grad, detail, onPress }: any) => (
    <div onClick={onPress} className="relative min-w-[240px] snap-center cursor-pointer group">
        <div className={`relative z-10 p-5 rounded-[2.5rem] bg-gradient-to-br ${grad} text-white shadow-xl h-[180px] flex flex-col overflow-hidden`}>
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg"><Icon className="w-6 h-6" /></div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-2">{label}</p>
                <h3 className="text-4xl font-black tracking-tight">{val}</h3>
                <div className="mt-auto flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                    <span>{detail}</span>
                    <ArrowRightIcon className="w-4 h-4" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 scale-150"><Icon className="w-32 h-32" /></div>
        </div>
    </div>
);

export default Dashboard;
