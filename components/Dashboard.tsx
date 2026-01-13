import React, { useState, useEffect, useRef } from 'react';
import { ViewState, UserRole } from '../types';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  UsersGroupIcon, BriefcaseIcon, SunIcon, MoonIcon, SparklesIcon, UserIcon,
  BuildingLibraryIcon, ClipboardDocumentListIcon, QrCodeIcon, BellIcon, 
  ArrowRightIcon, ShieldCheckIcon, AcademicCapIcon, ClockIcon,
  CheckCircleIcon, InfoIcon, XCircleIcon, CommandLineIcon, ChartBarIcon, EnvelopeIcon,
  CalendarIcon, RobotIcon, BookOpenIcon, ArrowTrendingUpIcon, PencilIcon, CogIcon,
  // Fix: Added missing Squares2x2Icon import to resolve "Cannot find name 'Squares2x2Icon'" error
  Squares2x2Icon
} from './Icons';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userRole: UserRole;
  onLogout: () => void;
  onOpenSidebar?: () => void;
}

interface Notification {
  id: string;
  title: string;
  date: string;
  type: 'alert' | 'info' | 'success';
}

// IDs for customizable widgets
type WidgetId = 'metrics' | 'quickActions' | 'trend' | 'agenda';

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, isDarkMode, onToggleTheme, userRole, onLogout, onOpenSidebar }) => {
  const [userName, setUserName] = useState<string>('Pengguna');
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalTeachers, setTotalTeachers] = useState<number>(0);
  const [pendingAssignments, setPendingAssignments] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(false);
  
  // Customization State
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetId, boolean>>({
    metrics: true,
    quickActions: true,
    trend: true,
    agenda: true
  });

  useEffect(() => {
      // Load saved widget preferences
      const savedPrefs = localStorage.getItem('dashboard_widgets');
      if (savedPrefs) {
          try {
              setVisibleWidgets(JSON.parse(savedPrefs));
          } catch (e) {
              console.error("Failed to load widget preferences");
          }
      }

      const timer = setTimeout(() => setShowChart(true), 100);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (auth.currentUser) {
          setUserName(auth.currentUser.displayName || 'Pengguna');
      }
  }, []);

  const toggleWidget = (id: WidgetId) => {
      const newPrefs = { ...visibleWidgets, [id]: !visibleWidgets[id] };
      setVisibleWidgets(newPrefs);
      localStorage.setItem('dashboard_widgets', JSON.stringify(newPrefs));
  };

  const getRoleLabel = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN: return 'Administrator';
          case UserRole.GURU: return 'Guru / Tendik';
          case UserRole.STAF: return 'Tata Usaha';
          case UserRole.SISWA: return 'Siswa';
          case UserRole.KEPALA_MADRASAH: return 'Kepala Madrasah';
          default: return role;
      }
  };

  const isStudent = userRole === UserRole.SISWA;
  const isTeacher = userRole === UserRole.GURU;
  const isAdmin = userRole === UserRole.ADMIN;
  const isDeveloper = userRole === UserRole.DEVELOPER;

  useEffect(() => {
    let notifs: Notification[] = [];
    if (isStudent) {
      notifs = [
        { id: '1', title: 'Tugas Matematika Baru', date: 'Hari ini, 08:00', type: 'alert' },
        { id: '2', title: 'Jadwal Ujian Semester', date: 'Kemarin', type: 'info' },
      ];
    } else {
        notifs = [
            { id: '1', title: 'Backup Sistem Berhasil', date: 'Hari ini', type: 'success' },
            { id: '2', title: 'Update Data Siswa', date: 'Senin', type: 'info' },
        ];
    }
    setNotifications(notifs);
  }, [userRole]);

  useEffect(() => {
    if (isMockMode) {
        setTotalStudents(842);
        setTotalTeachers(56);
        setPendingAssignments(3);
        return;
    }
    if (!db) return;
    if (!isStudent) {
        const unsubTeachers = db.collection('teachers').onSnapshot(snap => setTotalTeachers(snap.size));
        const unsubStudents = db.collection('students').onSnapshot(snap => setTotalStudents(snap.size));
        return () => { unsubTeachers(); unsubStudents(); };
    } 
  }, [isStudent]);

  const getStatusConfig = (status: string) => {
      switch (status) {
          case 'Hadir': return { icon: CheckCircleIcon, sub: 'Tepat Waktu', gradient: 'bg-emerald-600' };
          case 'Terlambat': return { icon: ClockIcon, sub: 'Telat Hadir', gradient: 'bg-orange-500' };
          default: return { icon: QrCodeIcon, sub: 'Silakan Scan', gradient: 'bg-indigo-600' };
      }
  };

  const statusConfig = getStatusConfig(attendanceStatus);
  const StatusIcon = statusConfig.icon;

  const weeklyData = [
      { day: 'Sen', val: 92 }, { day: 'Sel', val: 88 }, { day: 'Rab', val: 95 },
      { day: 'Kam', val: 90 }, { day: 'Jum', val: 85 }, { day: 'Sab', val: 98 },
  ];

  const quickMenuItems = [
    { show: true, label: 'Jadwal', icon: CalendarIcon, view: ViewState.SCHEDULE, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { show: isStudent || isTeacher, label: 'Tugas', icon: ClipboardDocumentListIcon, view: ViewState.ASSIGNMENTS, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' },
    { show: !isStudent, label: 'Presensi', icon: QrCodeIcon, view: ViewState.PRESENSI, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
    { show: isTeacher || isAdmin, label: 'AI', icon: RobotIcon, view: ViewState.CONTENT_GENERATION, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    { show: !isStudent, label: 'Kelas', icon: BookOpenIcon, view: ViewState.CLASSES, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { show: isStudent, label: 'Nilai', icon: AcademicCapIcon, view: ViewState.REPORT_CARDS, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { show: true, label: 'Surat', icon: EnvelopeIcon, view: ViewState.LETTERS, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
    { show: isDeveloper, label: 'Dev', icon: CommandLineIcon, view: ViewState.DEVELOPER, color: 'text-slate-600', bg: 'bg-slate-200 dark:bg-slate-800' }
  ];

  return (
    <div className="flex flex-col h-full bg-transparent transition-colors">
      
      {/* HEADER AREA */}
      <div className="px-4 pt-8 pb-6 bg-white dark:bg-slate-900/50 rounded-b-[2rem] border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">IMAM Management</p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Halo, {userName.split(' ')[0]}!</h1>
            <span className="inline-block mt-2 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                {getRoleLabel(userRole)}
            </span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setIsCustomizeModalOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors" title="Personalisasi Beranda">
                <PencilIcon className="w-5 h-5" />
             </button>
             <button onClick={onToggleTheme} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
             </button>
             <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 relative">
                <BellIcon className="w-5 h-5" />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
             </button>
          </div>
        </div>

        {/* METRICS ROW - Optimized Scrolling */}
        {visibleWidgets.metrics && (
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x animate-in fade-in slide-in-from-top-2 duration-500">
              <div className={`min-w-[200px] snap-center p-4 rounded-2xl text-white shadow-lg ${statusConfig.gradient}`}>
                  <p className="text-[10px] font-bold uppercase opacity-80 mb-1">{isStudent ? 'Presensi' : 'Total Siswa'}</p>
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{isStudent ? attendanceStatus : totalStudents}</h3>
                      <StatusIcon className="w-5 h-5 opacity-50" />
                  </div>
              </div>
              <div className="min-w-[200px] snap-center p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{isStudent ? 'Tugas PR' : 'Total Guru'}</p>
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{isStudent ? pendingAssignments : totalTeachers}</h3>
                      <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-500 opacity-50" />
                  </div>
              </div>
          </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        
        {/* QUICK ACTIONS - Native Grid Style */}
        {visibleWidgets.quickActions && (
          <div className="grid grid-cols-4 gap-4 animate-in fade-in duration-700">
              {quickMenuItems.map((item, idx) => item.show && (
                  <button key={idx} onClick={() => onNavigate(item.view)} className="flex flex-col items-center gap-1.5 group">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-black/5 active:scale-90 transition-transform ${item.bg}`}>
                          <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center">{item.label}</span>
                  </button>
              ))}
          </div>
        )}

        {/* ATTENDANCE TREND */}
        {visibleWidgets.trend && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-indigo-500" /> Tren Kehadiran
              </h2>
              <div className="flex items-end justify-between h-24 gap-1.5">
                  {weeklyData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                              className={`w-full rounded-t-lg transition-all duration-1000 ${i === 5 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-700'}`} 
                              style={{ height: showChart ? `${d.val}%` : '0%' }}
                          ></div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{d.day}</span>
                      </div>
                  ))}
              </div>
          </div>
        )}

        {/* DAILY AGENDA */}
        {visibleWidgets.agenda && (isStudent || isTeacher) && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Jadwal Hari Ini</h3>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4 py-2 border-b border-slate-50 dark:border-slate-700/50">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-[10px]">07:30</div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Matematika Wajib</h4>
                            <p className="text-[10px] text-slate-500">Budi Santoso, S.Pd</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 py-2">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 text-slate-500 rounded-xl flex items-center justify-center font-bold text-[10px]">09:15</div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">Bahasa Indonesia</h4>
                            <p className="text-[10px] text-slate-500">Siti Aminah, M.Ag</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Empty State if all hidden */}
        {!Object.values(visibleWidgets).some(v => v) && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                    <CogIcon className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 dark:text-white">Beranda Masih Kosong</h3>
                    <p className="text-xs text-slate-400 max-w-[200px]">Aktifkan widget melalui menu personalisasi di pojok kanan atas.</p>
                </div>
                <button onClick={() => setIsCustomizeModalOpen(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-lg active:scale-95 transition-all">Atur Sekarang</button>
            </div>
        )}

      </div>

      {/* CUSTOMIZATION MODAL */}
      {isCustomizeModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#151E32] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative border border-white/20">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.02] -rotate-12"><CogIcon className="w-40 h-40" /></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Layout Beranda</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Widget Tampilan</p>
                      </div>
                      <button onClick={() => setIsCustomizeModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                          <XCircleIcon className="w-7 h-7" />
                      </button>
                  </div>

                  <div className="space-y-3 relative z-10">
                      {[
                        { id: 'metrics', label: 'Ringkasan Statistik', desc: 'Siswa, Guru, dan Status Kehadiran', icon: ChartBarIcon },
                        { id: 'quickActions', label: 'Menu Akses Cepat', desc: 'Grid ikon navigasi fitur utama', icon: Squares2x2Icon },
                        { id: 'trend', label: 'Grafik Kehadiran', desc: 'Visualisasi tren kehadiran mingguan', icon: ArrowTrendingUpIcon },
                        { id: 'agenda', label: 'Agenda Hari Ini', desc: 'Jadwal mata pelajaran aktif', icon: CalendarIcon }
                      ].map((widget) => (
                        <button 
                            key={widget.id}
                            onClick={() => toggleWidget(widget.id as WidgetId)}
                            className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${
                                visibleWidgets[widget.id as WidgetId] 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' 
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${visibleWidgets[widget.id as WidgetId] ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                <widget.icon className="w-5 h-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className={`text-xs font-black uppercase tracking-tight ${visibleWidgets[widget.id as WidgetId] ? 'text-indigo-900 dark:text-white' : 'text-slate-500'}`}>{widget.label}</p>
                                <p className="text-[9px] text-slate-400 font-bold leading-tight">{widget.desc}</p>
                            </div>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${visibleWidgets[widget.id as WidgetId] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${visibleWidgets[widget.id as WidgetId] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </button>
                      ))}
                  </div>

                  <button 
                    onClick={() => setIsCustomizeModalOpen(false)}
                    className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl active:scale-95 transition-all shadow-xl shadow-black/10"
                  >
                      Selesai
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
