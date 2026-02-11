
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
  CameraIcon, Bars3CenterLeftIcon, HeadsetIcon
} from './Icons';
import { format } from 'date-fns';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userRole }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [stats, setStats] = useState({ students: 0, teachers: 0, attendanceToday: 0 });
  const [loading, setLoading] = useState(true);
  const [myAttendance, setMyAttendance] = useState<any>(null);

  const isSiswa = userRole === UserRole.SISWA;

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        if (isMockMode) {
            setTimeout(() => {
                setStats({ students: 842, teachers: 56, attendanceToday: 92 });
                setMyAttendance({ status: 'Hadir', checkIn: '07:15' });
                setLoading(false);
            }, 500);
            return;
        }

        if (auth.currentUser && db) {
            setUserName(auth.currentUser.displayName || 'Pengguna');
            try {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                
                // --- OPTIMASI FIRESTORE: Read Single Summary Document ---
                // Mengganti 3 snapshot query besar dengan 1 read dokumen summary
                const summaryDoc = await db.collection('stats').doc('summary').get();
                
                if (summaryDoc.exists) {
                    const sData = summaryDoc.data();
                    setStats({
                        students: sData?.totalStudents || 0,
                        teachers: sData?.totalTeachers || 0,
                        attendanceToday: sData?.dailyStats?.[todayStr]?.attendancePercent || 0
                    });
                } else {
                   // Fallback jika summary belum dibuat (hanya saat inisialisasi sistem baru)
                   setStats({ students: 0, teachers: 0, attendanceToday: 0 });
                }

                // Tetap fetch presensi pribadi (1 Read)
                if (isSiswa) {
                    const attId = `${auth.currentUser.uid}_${todayStr}`;
                    const myAttDoc = await db.collection('attendance').doc(attId).get();
                    if (myAttDoc.exists) setMyAttendance(myAttDoc.data());
                }

            } catch (e) {
                console.warn("Dashboard stats error:", e);
            }
        }
        setLoading(false);
    };
    fetchData();
  }, [userRole, isSiswa]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
      
      {/* --- PREMIUM HEADER --- */}
      <header className="shrink-0 px-6 pt-12 pb-8 bg-white dark:bg-[#0B1121] border-b border-slate-100 dark:border-slate-800/50 shadow-sm">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <div className="animate-in slide-in-from-left-4 duration-500">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-1">
                {isSiswa ? 'Student Portal' : 'Administrator Control'}
            </p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Halo, {userName.split(' ')[0]}!
            </h1>
          </div>
          <div className="flex gap-2.5">
             <button onClick={() => onNavigate(ViewState.NOTIFICATIONS)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 relative active:scale-90 transition-all border border-slate-100 dark:border-slate-700">
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>
             </button>
             <button onClick={() => onNavigate(ViewState.ALL_FEATURES)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-90 transition-all">
                <Bars3CenterLeftIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 pb-32">
            
            {/* --- PRIMARY WIDGET: STATUS TIKET / ABSENSI --- */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                {isSiswa ? (
                    <div onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Presensi Hari Ini</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                                    <CheckCircleIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{myAttendance ? myAttendance.status : 'Belum Terdeteksi'}</h3>
                                    <p className="text-xs font-bold opacity-60 mt-1">{myAttendance ? `Masuk: ${myAttendance.checkIn}` : 'Tunjukkan ID Card Digital Anda'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard icon={UsersGroupIcon} label="Siswa Aktif" val={stats.students} color="text-indigo-600" bg="bg-indigo-50" />
                        <StatCard icon={CheckCircleIcon} label="Presensi Hari Ini" val={`${stats.attendanceToday}%`} color="text-emerald-600" bg="bg-emerald-50" />
                    </div>
                )}
            </section>

            {/* --- GRID MENU: QUICK ACCESS --- */}
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Akses Cepat</h3>
                    <button onClick={() => onNavigate(ViewState.ALL_FEATURES)} className="text-[10px] font-black text-indigo-600 uppercase">Lihat Semua</button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    <QuickMenu icon={CameraIcon} label="Scanner" color="text-teal-500" onClick={() => onNavigate(ViewState.SCANNER)} />
                    <QuickMenu icon={CalendarIcon} label="Jadwal" color="text-orange-500" onClick={() => onNavigate(ViewState.SCHEDULE)} />
                    <QuickMenu icon={AcademicCapIcon} label="Nilai" color="text-indigo-500" onClick={() => onNavigate(ViewState.GRADES)} />
                    <QuickMenu icon={EnvelopeIcon} label="Surat" color="text-rose-500" onClick={() => onNavigate(ViewState.LETTERS)} />
                </div>
            </section>

            {/* --- SECONDARY WIDGET: TIMELINE / INFO --- */}
            <section className="bg-white dark:bg-[#151E32] rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><ClockIcon className="w-5 h-5" /></div>
                    <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Agenda Aktif</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-4 items-start relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-900">
                        <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-indigo-600 uppercase leading-none">07:30 - 09:00</p>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase">KBM Jam Pertama</h4>
                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Sesuai Jadwal Akademik</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
      </main>

      {/* --- AI FLOATING ACTION --- */}
      <button 
        onClick={() => onNavigate(ViewState.ADVISOR)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition-all z-40 animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <HeadsetIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, val, color, bg }: any) => (
    <div className={`p-5 rounded-[2rem] bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 shadow-sm`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color} mb-4`}><Icon className="w-5 h-5" /></div>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{val}</h4>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
);

const QuickMenu = ({ icon: Icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group active:scale-90 transition-all">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:border-indigo-200 transition-colors">
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate w-full text-center">{label}</span>
    </button>
);

export default Dashboard;
