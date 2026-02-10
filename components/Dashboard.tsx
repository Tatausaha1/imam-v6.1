
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole, Student, ClassData } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, QrCodeIcon, ArrowRightIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, BookOpenIcon, BellIcon,
  IdentificationIcon, StarIcon, BuildingLibraryIcon,
  LogOutIcon, CameraIcon, SparklesIcon,
  ClipboardDocumentListIcon,
  HeartIcon, HeadsetIcon, Bars3CenterLeftIcon,
  XMarkIcon,
  BriefcaseIcon,
  ShieldCheckIcon
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
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  
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
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isStudent = userRole === UserRole.SISWA;
  const isWaliKelas = userRole === UserRole.WALI_KELAS;
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;
  const isKamad = userRole === UserRole.KEPALA_MADRASAH;
  const isTeacher = userRole === UserRole.GURU || isWaliKelas;
  
  const isStaffAction = 
    isAdmin || 
    isTeacher || 
    userRole === UserRole.STAF || 
    userRole === UserRole.KETUA_KELAS;

  useEffect(() => {
    if (!auth?.currentUser && !isMockMode) return;

    if (isMockMode) {
        setHasNewNotifications(true);
    } else if (db) {
        db.collection('announcements').limit(1).get()
            .then(snap => {
                if (!snap.empty) setHasNewNotifications(true);
            })
            .catch(() => {});
    }

    const fetchAllData = async () => {
        setLoadingStats(true);
        const uid = auth?.currentUser?.uid;

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
            }, 500);
            return;
        }

        if (!db || !uid) return;
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const [studentsSnap, teachersSnap, classesSnap] = await Promise.all([
                db.collection('students').where('status', '==', 'Aktif').get(),
                db.collection('teachers').get(),
                db.collection('classes').get()
            ]);

            const sDocs = studentsSnap.docs.map(d => d.data() as Student);
            let attendanceTodaySnap;
            let lettersSnap;

            if (isStaffAction || isKamad) {
                [attendanceTodaySnap, lettersSnap] = await Promise.all([
                    db.collection('attendance').where('date', '==', todayStr).get(),
                    db.collection('letters').where('status', '==', 'Pending').get()
                ]);
                
                setStats({ 
                    students: studentsSnap.size, 
                    teachers: teachersSnap.size, 
                    classes: classesSnap.size, 
                    pendingLetters: lettersSnap.size, 
                    attendanceToday: attendanceTodaySnap.size 
                });
            } else {
                [attendanceTodaySnap, lettersSnap] = await Promise.all([
                    db.collection('attendance').where('date', '==', todayStr).where('studentId', '==', uid).get(),
                    db.collection('letters').where('userId', '==', uid).where('status', '==', 'Pending').get()
                ]);
                
                setStats({ 
                    students: studentsSnap.size, 
                    teachers: teachersSnap.size, 
                    classes: classesSnap.size, 
                    pendingLetters: lettersSnap.size, 
                    attendanceToday: 0 
                });
            }

            const myAtt = attendanceTodaySnap.docs.find(d => d.data().studentId === uid || d.data().idUnik === userIdUnik);
            if (myAtt) setTodayAttendance(myAtt.data());

            if (isWaliKelas) {
                const myClassDoc = classesSnap.docs.find(d => d.data().teacherId === uid);
                if (myClassDoc) {
                    const classData = { id: myClassDoc.id, ...myClassDoc.data() } as ClassData;
                    setManagedClass(classData);
                    const classStudents = sDocs.filter(s => s.tingkatRombel === classData.name);
                    const classAttendanceCount = attendanceTodaySnap ? attendanceTodaySnap.docs.filter(d => d.data().class === classData.name).length : 0;
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
        } catch (e: any) { 
            console.error("Dashboard Error:", e.message); 
        } finally { 
            setLoadingStats(false); 
        }
    };
    fetchAllData();
  }, [userIdUnik, userRole, isWaliKelas, isStaffAction, isKamad]);

  useEffect(() => {
      if (auth.currentUser) {
          setUserName(auth.currentUser.displayName || 'Pengguna');
          if (db) {
              db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                  if (doc.exists) {
                      const data = doc.data();
                      setUserIdUnik(data?.idUnik || data?.nisn || null);
                  }
              }).catch(() => {});
          }
      }
  }, []);

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Scan QR', icon: CameraIcon, view: ViewState.SCANNER, color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-white dark:bg-slate-800' },
    { show: isWaliKelas || isAdmin || isKamad, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-indigo-600', bg: 'bg-white dark:bg-slate-800' },
    { show: true, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-teal-600', bg: 'bg-white dark:bg-slate-800' },
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
        <div className="flex gap-1.5 mt-3">
            {sessions.map(s => {
                const val = data ? data[s.key] : null;
                const isHaid = val && String(val).includes('Haid');
                const isFilled = !!val;
                return (
                    <div key={s.key} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all ${
                        isFilled 
                        ? (isHaid ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600') 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'
                    }`}>
                        {s.label}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors">
      
      {/* --- HEADER --- */}
      <header className="px-5 py-6 md:py-10 bg-white dark:bg-[#0B1121] border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                {isStudent ? 'Portal Siswa' : isKamad ? 'Pimpinan' : isWaliKelas ? 'Wali Kelas' : 'Manajemen'}
            </p>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
                Halo, {(userName || 'Pengguna').split(' ')[0]}!
            </h1>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => onNavigate(ViewState.NOTIFICATIONS)}
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 relative"
             >
                <BellIcon className="w-5 h-5" />
                {hasNewNotifications && <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-800"></span>}
             </button>
             <button 
                onClick={() => onNavigate(ViewState.ALL_FEATURES)}
                className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none"
             >
                <Bars3CenterLeftIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-7xl mx-auto px-5 py-6 space-y-8 pb-32">
            
            {/* --- STATS CARDS --- */}
            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Laporan Singkat</h3>
                <div 
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-2 px-2 snap-x"
                >
                    {isWaliKelas && managedClass && (
                        <div onClick={() => onNavigate(ViewState.CLASSES)} className="min-w-[260px] snap-center bg-indigo-600 rounded-3xl p-6 text-white shadow-lg cursor-pointer transition-transform active:scale-95">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Rombel Binaan</p>
                            <h3 className="text-lg font-black">{managedClass.name}</h3>
                            <div className="mt-8 flex items-end justify-between">
                                <div>
                                    <span className="text-[8px] font-black uppercase opacity-60 block">Kehadiran</span>
                                    <span className="text-2xl font-black">{classAttendancePct}%</span>
                                </div>
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><ArrowRightIcon className="w-4 h-4" /></div>
                            </div>
                        </div>
                    )}

                    {isStudent && (
                        <div onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} className="min-w-[260px] snap-center bg-emerald-600 rounded-3xl p-6 text-white shadow-lg cursor-pointer transition-transform active:scale-95">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Status Kehadiran</p>
                            <h3 className="text-lg font-black">{todayAttendance ? todayAttendance.status : 'Belum Absen'}</h3>
                            <MiniSessionTracker data={todayAttendance} />
                        </div>
                    )}

                    {!isStudent && (
                        <StatCardSmall 
                            label={isWaliKelas ? "Siswa Kelas" : "Total Siswa"} 
                            val={isWaliKelas ? (maleStudents + femaleStudents) : stats.students} 
                            icon={UsersGroupIcon} 
                            color="text-indigo-600" 
                            bg="bg-indigo-50 dark:bg-indigo-900/30"
                            onPress={() => onNavigate(ViewState.STUDENTS)}
                        />
                    )}
                    
                    <StatCardSmall 
                        label="Data Guru" 
                        val={stats.teachers} 
                        icon={BriefcaseIcon} 
                        color="text-emerald-600" 
                        bg="bg-emerald-50 dark:bg-emerald-900/30"
                        onPress={() => onNavigate(ViewState.TEACHERS)}
                    />
                </div>
            </section>

            {/* --- QUICK MENU --- */}
            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Menu Utama</h3>
                <div className="grid grid-cols-4 gap-4">
                    {quickMenuItems.map((item, idx) => item.show && (
                        <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-2 group transition-all active:scale-90">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm ${item.bg}`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-700 dark:text-slate-300 text-center truncate w-full">{item.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* --- AGENDA --- */}
            <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jadwal Aktif</h3>
                <div className="bg-white dark:bg-[#151E32] rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-800 dark:text-white">07:30</span>
                        <div className="w-4 h-0.5 bg-indigo-500 mt-1 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">{isStudent ? 'Matematika' : 'Jam Operasional'}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Mulai Pembelajaran</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                        <CheckCircleIcon className="w-5 h-5 opacity-40" />
                    </div>
                </div>
            </section>

            {/* --- FOOTER INFO CARD --- */}
            <section className="mt-4">
                <div 
                    onClick={() => onNavigate(ViewState.ABOUT)}
                    className="bg-slate-900 dark:bg-indigo-950 rounded-[2.5rem] p-6 flex items-center gap-5 cursor-pointer active:scale-[0.98] transition-all border border-slate-800 shadow-xl"
                >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                        <ShieldCheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xs font-black text-white uppercase tracking-tight">Status Operasional</h4>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        </div>
                        <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-[0.15em] leading-relaxed">
                            Kernel v6.2 Terenkripsi • MAN 1 Hulu Sungai Tengah <br/> Seluruh Sistem Normal
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <ArrowRightIcon className="w-4 h-4 text-white" />
                    </div>
                </div>
            </section>
        </div>
      </main>

      {/* Floating Button (Minimal) */}
      <button 
        onClick={() => onNavigate(ViewState.ADVISOR)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 z-40"
      >
        <HeadsetIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

const StatCardSmall = ({ label, val, icon: Icon, color, bg, onPress }: any) => (
    <div onClick={onPress} className="min-w-[140px] snap-center bg-white dark:bg-[#151E32] p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between active:scale-95 transition-transform">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="mt-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">{val}</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</p>
        </div>
    </div>
);

export default Dashboard;
