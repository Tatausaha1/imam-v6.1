/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import { ViewState, UserRole } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, EnvelopeIcon,
  CalendarIcon, BellIcon,
  CameraIcon, HeadsetIcon, SunIcon, MoonIcon
} from './Icons';
import { format } from 'date-fns';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  onLogout: () => void;
  onToggleTheme: () => void;
  isDarkTheme: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userRole, onToggleTheme, isDarkTheme }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [stats, setStats] = useState({ students: 0, teachers: 0, attendanceToday: 0, newLetters: 0 });
  const [loading, setLoading] = useState(true);
  const [myAttendance, setMyAttendance] = useState<any>(null);

  const isSiswa = userRole === UserRole.SISWA;

  useEffect(() => {
    setLoading(true);
    const currentUser = auth.currentUser;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (isMockMode) {
      const timer = setTimeout(() => {
        setStats({ students: 842, teachers: 56, attendanceToday: 92, newLetters: 12 });
        setMyAttendance({ status: 'Hadir', checkIn: '07:15' });
        setLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }

    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    setUserName(currentUser.displayName || 'Pengguna');
    const unsubscribers: Array<() => void> = [];

    if (isSiswa) {
      let isCancelled = false;

      const loadStudentDashboard = async () => {
        try {
          const userDoc = await db.collection('users').doc(currentUser.uid).get();
          const userData = userDoc.exists ? userDoc.data() : null;

          let studentId = userData?.studentId as string | undefined;
          let studentName = userData?.displayName as string | undefined;

          if (!studentId && currentUser.email) {
            const byEmail = await db.collection('students').where('email', '==', currentUser.email).limit(1).get();
            if (!byEmail.empty) {
              studentId = byEmail.docs[0].id;
              studentName = byEmail.docs[0].data().namaLengkap;
            }
          }

          if (!studentId && currentUser.email?.endsWith('@siswa.imam.sch.id')) {
            const nisn = currentUser.email.split('@')[0];
            const byNisn = await db.collection('students').where('nisn', '==', nisn).limit(1).get();
            if (!byNisn.empty) {
              studentId = byNisn.docs[0].id;
              studentName = byNisn.docs[0].data().namaLengkap;
            }
          }

          if (studentName && !isCancelled) {
            setUserName(studentName);
          }

          if (!studentId) {
            if (!isCancelled) setLoading(false);
            return;
          }

          const attDocId = `${studentId}_${todayStr}`;
          const unsubMyAttendance = db.collection('attendance').doc(attDocId).onSnapshot(async (docSnap) => {
            if (isCancelled) return;

            if (docSnap.exists) {
              setMyAttendance(docSnap.data());
              setLoading(false);
              return;
            }

            const fallback = await db.collection('attendance')
              .where('studentId', '==', studentId)
              .where('date', '==', todayStr)
              .limit(1)
              .get();

            if (!fallback.empty) {
              setMyAttendance(fallback.docs[0].data());
            } else {
              setMyAttendance(null);
            }
            setLoading(false);
          }, () => {
            if (!isCancelled) setLoading(false);
          });

          unsubscribers.push(unsubMyAttendance);
        } catch {
          if (!isCancelled) setLoading(false);
        }
      };

      loadStudentDashboard();

      return () => {
        isCancelled = true;
        unsubscribers.forEach((unsub) => unsub());
      };
    }

    unsubscribers.push(
      db.collection('students').where('status', '==', 'Aktif').onSnapshot((snap) => {
        setStats(prev => ({ ...prev, students: snap.size }));
      })
    );

    unsubscribers.push(
      db.collection('teachers').onSnapshot((snap) => {
        setStats(prev => ({ ...prev, teachers: snap.size }));
      })
    );

    unsubscribers.push(
      db.collection('attendance').where('date', '==', todayStr).onSnapshot((snap) => {
        const presentCount = snap.docs.filter((d) => {
          const data = d.data();
          return data.status === 'Hadir' || data.status === 'Haid';
        }).length;

        setStats((prev) => {
          const percent = prev.students > 0 ? Math.round((presentCount / prev.students) * 100) : 0;
          return { ...prev, attendanceToday: percent };
        });

        setLoading(false);
      }, () => setLoading(false))
    );

    unsubscribers.push(
      db.collection('letters').where('status', '==', 'Pending').onSnapshot((snap) => {
        setStats(prev => ({ ...prev, newLetters: snap.size }));
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [userRole, isSiswa]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden pt-[env(safe-area-inset-top)]">
      
      {/* HEADER DESKTOP-ADAPTIVE */}
      <header className="shrink-0 px-6 py-6 lg:py-10 bg-white dark:bg-[#0B1121] border-b border-slate-100 dark:border-slate-800/50 shadow-sm">
        <div className="flex justify-between items-center max-w-md md:max-w-4xl mx-auto w-full">
          <div className="animate-in slide-in-from-left-4 duration-500">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1.5">
                {isSiswa ? 'Siswa Portal' : 'Admin Dashboard'}
            </p>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Halo, {userName.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex gap-3">
             <button onClick={() => onNavigate(ViewState.NOTIFICATIONS)} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-[1.2rem] text-slate-400 relative active:scale-90 transition-all border border-slate-100 dark:border-slate-700">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>
             </button>
             
             {/* THEME TOGGLE REPLACED HAMBURGER */}
             <button 
                onClick={onToggleTheme} 
                className="p-3.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-amber-400 rounded-[1.2rem] border border-indigo-100 dark:border-slate-700 shadow-sm active:scale-90 transition-all lg:hidden"
                aria-label="Ganti Tema"
             >
                {isDarkTheme ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-md md:max-w-4xl mx-auto px-6 py-8 space-y-8 pb-32 w-full">
            
            {/* STATS GRID */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                {isSiswa ? (
                    <div onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                                <CheckCircleIcon className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 mb-1.5">Presensi Hari Ini</p>
                                <h3 className="text-2xl font-black">{myAttendance ? myAttendance.status : 'Belum Absen'}</h3>
                                <p className="text-xs font-bold opacity-60 mt-1">{myAttendance ? `Tercatat pukul ${myAttendance.checkIn}` : 'Segera scan QR Anda di gerbang madrasah'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <StatCard icon={UsersGroupIcon} label="Siswa Aktif" val={loading ? "..." : stats.students} color="text-indigo-600" bg="bg-indigo-50" />
                        <StatCard icon={AcademicCapIcon} label="Total Guru" val={loading ? "..." : stats.teachers} color="text-emerald-600" bg="bg-emerald-50" />
                        <StatCard icon={CheckCircleIcon} label="Kehadiran" val={loading ? "..." : `${stats.attendanceToday}%`} color="text-rose-600" bg="bg-rose-50" />
                        <StatCard icon={EnvelopeIcon} label="Surat Baru" val={loading ? "..." : stats.newLetters} color="text-amber-600" bg="bg-amber-50" />
                    </div>
                )}
            </section>

            {/* QUICK MENU GRID */}
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Menu Pintasan</h3>
                    <button onClick={() => onNavigate(ViewState.ALL_FEATURES)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Lihat Katalog Lengkap</button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-4 lg:gap-8">
                    <QuickMenu icon={CameraIcon} label="Scanner" color="text-teal-500" onClick={() => onNavigate(ViewState.SCANNER)} />
                    <QuickMenu icon={CalendarIcon} label="Jadwal" color="text-orange-500" onClick={() => onNavigate(ViewState.SCHEDULE)} />
                    <QuickMenu icon={AcademicCapIcon} label="Nilai" color="text-indigo-500" onClick={() => onNavigate(ViewState.GRADES)} />
                    <QuickMenu icon={EnvelopeIcon} label="Surat" color="text-rose-500" onClick={() => onNavigate(ViewState.LETTERS)} />
                    <QuickMenu icon={UsersGroupIcon} label="Siswa" color="text-blue-500" onClick={() => onNavigate(ViewState.STUDENTS)} />
                    <QuickMenu icon={ClockIcon} label="Riwayat" color="text-slate-500" onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} />
                </div>
            </section>

            {/* TWO COLUMN ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><ClockIcon className="w-6 h-6" /></div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.3em]">Agenda Akademik</h3>
                    </div>
                    <div className="space-y-6">
                        <AgendaItem time="07:30 - 09:00" title="KBM Sesi Pagi" sub="Jam Ke 1 - 2 (Wajib)" active />
                        <AgendaItem time="09:15 - 10:45" title="KBM Sesi Tengah" sub="Jam Ke 3 - 4" />
                        <AgendaItem time="11:00 - 12:30" title="KBM Sesi Siang" sub="Jam Ke 5 - 6" />
                    </div>
                </section>

                <section className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600"><CheckCircleIcon className="w-6 h-6" /></div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.3em]">Informasi Terkini</h3>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase italic">
                            "Selamat datang di portal IMAM v11. Seluruh data akademik Anda tersinkronisasi secara otomatis dengan basis data cloud MAN 1 HST."
                        </p>
                    </div>
                </section>
            </div>
        </div>
      </main>

      {/* FLOATING AI ASSISTANT */}
      <button 
        onClick={() => onNavigate(ViewState.ADVISOR)}
        className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition-all z-40 animate-bounce hover:bg-indigo-700"
        style={{ animationDuration: '3s' }}
      >
        <HeadsetIcon className="w-7 h-7" />
      </button>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, val, color, bg }: any) => (
    <div className={`p-6 lg:p-8 rounded-[2.5rem] bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group`}>
        <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center ${bg} ${color} mb-6 transition-transform group-hover:scale-110 shadow-inner`}><Icon className="w-6 h-6 lg:w-7 lg:h-7" /></div>
        <h4 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{val}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 group-hover:text-indigo-500 transition-colors">{label}</p>
    </div>
);

const QuickMenu = ({ icon: Icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-3 group active:scale-90 transition-all">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[1.8rem] bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:border-indigo-300 group-hover:shadow-indigo-500/10 transition-all">
            <Icon className={`w-7 h-7 lg:w-9 lg:h-9 ${color} transition-transform group-hover:scale-110`} />
        </div>
        <span className="text-[10px] lg:text-[11px] font-black text-slate-50 dark:text-slate-400 uppercase tracking-tighter truncate w-full text-center group-hover:text-slate-800 dark:group-hover:text-white">{label}</span>
    </button>
);

const AgendaItem = ({ time, title, sub, active = false }: any) => (
    <div className="flex gap-5 items-start relative pl-6 border-l-2 border-slate-100 dark:border-slate-800">
        <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${active ? 'bg-indigo-500 ring-4 ring-indigo-500/20' : 'bg-slate-300'}`}></div>
        <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase leading-none ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{time}</p>
            <h4 className="text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 mt-2 uppercase tracking-tight">{title}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{sub}</p>
        </div>
    </div>
);

export default Dashboard;
