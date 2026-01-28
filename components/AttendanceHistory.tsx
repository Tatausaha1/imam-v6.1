import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './Layout';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  BuildingLibraryIcon,
  Search,
  ArrowPathIcon,
  PencilIcon,
  FileSpreadsheet,
  FileText,
  PrinterIcon,
  ChartBarIcon,
  ChevronDownIcon,
  Loader2,
  HeartIcon,
  SparklesIcon,
  UserIcon,
  UsersGroupIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from './Icons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ViewState, AttendanceStatus, Student, UserRole } from '../types';

interface AttendanceHistoryProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
}

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    gender?: string;
    class: string;
    date: string;
    status: AttendanceStatus;
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

interface ClassAnalysis {
    className: string;
    total: number;
    totalMale: number;
    totalFemale: number;
    present: number;
    presentMale: number;
    presentFemale: number;
    pct: number;
    absentStudents: { name: string, gender: string }[];
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onBack, onNavigate, userRole }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedSession, setSelectedSession] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hyper-Load Engine States
  const [loadTime, setLoadTime] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});

  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const isInteractingAnalysis = useRef(false);

  const isStudent = userRole === UserRole.SISWA;

  const sessionMap: Record<string, 'checkIn' | 'duha' | 'zuhur' | 'ashar' | 'checkOut'> = {
    'Masuk': 'checkIn',
    'Duha': 'duha',
    'Zuhur': 'zuhur',
    'Ashar': 'ashar',
    'Pulang': 'checkOut'
  };

  useEffect(() => {
    const el = analysisScrollRef.current;
    if (!el || expandedClass) return;

    const interval = setInterval(() => {
        if (isInteractingAnalysis.current) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (el.scrollLeft >= maxScroll - 1) {
            el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            el.scrollBy({ left: 1, behavior: 'auto' });
        }
    }, 50);

    return () => clearInterval(interval);
  }, [loading, expandedClass]);

  useEffect(() => {
    if (isMockMode) {
        setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA']);
        setStudents([
            { id: 's1', namaLengkap: 'AHMAD DAHLAN', jenisKelamin: 'Laki-laki', tingkatRombel: 'X IPA 1', status: 'Aktif', nisn: '1' },
            { id: 's2', namaLengkap: 'SITI AMINAH', jenisKelamin: 'Perempuan', tingkatRombel: 'X IPA 1', status: 'Aktif', nisn: '2' },
            { id: 's3', namaLengkap: 'BUDI UTOMO', jenisKelamin: 'Laki-laki', tingkatRombel: 'X IPA 1', status: 'Aktif', nisn: '3' },
            { id: 's4', namaLengkap: 'RATNA SARI', jenisKelamin: 'Perempuan', tingkatRombel: 'X IPA 1', status: 'Aktif', nisn: '4' }
        ] as Student[]);
        return;
    }
    if (db) {
        db.collection('classes').get().then(s => setClasses(s.docs.map(d => d.data().name).sort()));
        db.collection('students').where('status', '==', 'Aktif').get().then(s => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    }
  }, []);

  useEffect(() => {
    const startTime = performance.now();
    setLoading(true);
    setSyncStatus('syncing');

    if (isMockMode) {
        setTimeout(() => {
            const mockData: AttendanceRecord[] = [];
            for (let i = 0; i < 40; i++) {
                const isHaid = i % 8 === 0;
                mockData.push({
                    id: `rec-${i}`,
                    studentId: `s${i}`,
                    studentName: `Siswa Contoh ${i + 1}`,
                    gender: i % 2 === 0 ? 'Laki-laki' : 'Perempuan',
                    class: selectedClass === 'All' ? (i % 2 === 0 ? 'X IPA 1' : 'XII AGAMA') : selectedClass,
                    date: selectedDate,
                    status: isHaid ? 'Haid' : (i % 5 === 1 ? 'Terlambat' : 'Hadir'),
                    checkIn: isHaid ? 'Haid' : '07:15',
                    duha: isHaid ? 'Haid' : (i % 3 === 0 ? '09:45' : null),
                    zuhur: isHaid ? 'Haid' : (i % 4 === 0 ? '12:45' : null),
                    ashar: null, 
                    checkOut: isHaid ? null : '16:00'
                });
            }
            setRecords(mockData);
            setLoading(false);
            setSyncStatus('synced');
            setLoadTime(Math.round(performance.now() - startTime));
        }, 300);
        return;
    }

    if (!db || !auth.currentUser) return;
    
    let query = db.collection('attendance').where('date', '==', selectedDate);
    
    // SECURITY FILTER: Firestore rules are not filters. 
    // If not staff, must explicitly query only own records.
    if (isStudent) {
        query = query.where('studentId', '==', auth.currentUser.uid);
    } else if (selectedClass !== 'All') {
        query = query.where('class', '==', selectedClass);
    }

    const unsubscribe = query.onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        data.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
        setRecords(data);
        setLoading(false);
        setSyncStatus('synced');
        setLoadTime(Math.round(performance.now() - startTime));
    }, err => {
        console.error("Firestore Query Error:", err.message);
        toast.error("Izin akses database ditolak.");
        setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedDate, selectedClass, isStudent]);

  const filteredRecords = useMemo(() => {
      return records.filter(r => {
          const name = String(r.studentName || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          const matchesSearch = name.includes(query);
          const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
          
          let matchesSession = true;
          if (selectedSession !== 'All') {
              const sessionField = sessionMap[selectedSession];
              matchesSession = !!r[sessionField];
          }

          return matchesSearch && matchesStatus && matchesSession;
      });
  }, [records, searchQuery, filterStatus, selectedSession]);

  const classAnalyses = useMemo(() => {
      if (isStudent) return [];
      const targetClasses = selectedClass === 'All' ? classes : [selectedClass];
      const sessionField: any = selectedSession !== 'All' ? sessionMap[selectedSession] : 'checkIn';
      
      return targetClasses.map(clsName => {
          const classStudents = students.filter(s => s.tingkatRombel === clsName);
          const classAtt = records.filter(r => r.class === clsName && r[sessionField] && r[sessionField] !== 'Alpha');
          
          const totalMale = classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length;
          const totalFemale = classStudents.filter(s => s.jenisKelamin === 'Perempuan').length;
          const presentMale = classAtt.filter(a => {
              const s = classStudents.find(st => st.id === a.studentId);
              return s?.jenisKelamin === 'Laki-laki' || a.gender === 'Laki-laki';
          }).length;
          const presentFemale = classAtt.filter(a => {
              const s = classStudents.find(st => st.id === a.studentId);
              return s?.jenisKelamin === 'Perempuan' || a.gender === 'Perempuan';
          }).length;

          const totalPresent = presentMale + presentFemale;
          const totalStudents = classStudents.length;
          const presentStudentIds = new Set(classAtt.map(a => a.studentId));
          const absentStudents = classStudents.filter(s => !presentStudentIds.has(s.id!)).map(s => ({ name: s.namaLengkap, gender: s.jenisKelamin })).sort((a,b) => a.name.localeCompare(b.name));

          return { className: clsName, total: totalStudents, totalMale, totalFemale, present: totalPresent, presentMale, presentFemale, pct: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0, absentStudents } as ClassAnalysis;
      }).filter(a => a.total > 0 || a.present > 0).sort((a,b) => b.pct - a.pct);
  }, [classes, students, records, selectedClass, selectedSession, isStudent]);

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord(record);
      setEditForm({ status: record.status, checkIn: record.checkIn?.substring(0,5), checkOut: record.checkOut?.substring(0,5) });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingRecord) return;
      if (isMockMode) toast.success("Simulasi Update Berhasil");
      else {
          try {
              await db!.collection('attendance').doc(editingRecord.id).update(editForm);
              toast.success("Data Diperbarui");
          } catch (e) { toast.error("Gagal update"); }
      }
      setIsEditModalOpen(false);
  };

  const getStatusBadgeClass = (status: AttendanceStatus) => {
    switch (status) {
        case 'Hadir': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'Haid': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
        case 'Terlambat': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        case 'Alpha': return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <Layout title="Database Absensi" subtitle={isStudent ? "Riwayat Saya" : "Hyper-Load Engine Active"} icon={CalendarIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-24 space-y-5">
        
        {/* HYPER-LOAD ENGINE STATUS */}
        <div className="bg-[#020617] rounded-[2rem] p-5 border border-slate-800 shadow-2xl flex items-center justify-between overflow-hidden relative group">
            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                    {syncStatus === 'synced' ? <ShieldCheckIcon className="w-5 h-5" /> : <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Database Sync Status</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className={`w-1 h-1 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                        Mode: {isMockMode ? 'Simulation Engine' : 'Live Firestore'} • Latency: {loadTime}ms
                    </p>
                </div>
            </div>
            <div className="flex gap-2 relative z-10">
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[60px]">
                    <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Paging</p>
                    <p className="text-[9px] font-mono text-indigo-400 font-bold">O(1)</p>
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[60px]">
                    <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Search</p>
                    <p className="text-[9px] font-mono text-emerald-400 font-bold">Instant</p>
                </div>
            </div>
        </div>

        {/* FILTERS CARD */}
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                </div>
                {!isStudent && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Rombel</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none appearance-none cursor-pointer"
                        >
                            <option value="All">SEMUA KELAS</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {!isStudent && (
                <>
                    <div className="space-y-2.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Sesi (Mode)</label>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {['All', 'Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSession(s)}
                                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap active:scale-95 ${
                                        selectedSession === s 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' 
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-transparent hover:bg-slate-100'
                                    }`}
                                >
                                    {s === 'All' ? 'SEMUA SESI' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                        <input 
                            type="text" 
                            placeholder="CARI NAMA SISWA (INSTANT SEARCH)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-transparent rounded-[1.5rem] text-[10px] font-black focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner"
                        />
                    </div>
                </>
            )}
        </div>

        {classAnalyses.length > 0 && !isStudent && (
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-indigo-500" />
                    Analisis Kehadiran {selectedSession !== 'All' ? `Sesi ${selectedSession}` : ''}
                </h4>
                <div 
                    ref={analysisScrollRef}
                    onMouseEnter={() => isInteractingAnalysis.current = true}
                    onMouseLeave={() => isInteractingAnalysis.current = false}
                    className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-1 px-1 touch-pan-x"
                >
                    {classAnalyses.map((analysis, i) => (
                        <div key={i} className="min-w-[280px] bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group animate-in zoom-in duration-500 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="min-w-0 flex-1">
                                    <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tight">{analysis.className}</h5>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <UsersGroupIcon className="w-3 h-3 text-slate-300" />
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{analysis.total} Peserta</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[9px] font-black ${analysis.pct >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {analysis.pct}%
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="p-2.5 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50">
                                    <div className="flex items-center gap-1 mb-1">
                                        <UserIcon className="w-2.5 h-2.5 text-blue-500" />
                                        <span className="text-[7px] font-black text-blue-400 uppercase">Putra</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-800 dark:text-white">{analysis.presentMale} <span className="text-[8px] text-slate-400">/ {analysis.totalMale}</span></p>
                                </div>
                                <div className="p-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50">
                                    <div className="flex items-center gap-1 mb-1">
                                        <UserIcon className="w-2.5 h-2.5 text-rose-500" />
                                        <span className="text-[7px] font-black text-rose-400 uppercase">Putri</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-800 dark:text-white">{analysis.presentFemale} <span className="text-[8px] text-slate-400">/ {analysis.totalFemale}</span></p>
                                </div>
                            </div>

                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div className={`h-full transition-all duration-1000 ${analysis.pct >= 90 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${analysis.pct}%` }}></div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Belum Scan Sesi Ini</span>
                                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black">{analysis.absentStudents.length}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                                    {analysis.absentStudents.length > 0 ? (
                                        analysis.absentStudents.map((s, idx) => (
                                            <div key={idx} className={`px-2 py-1 rounded-lg text-[7px] font-bold uppercase flex items-center gap-1 ${s.gender === 'Perempuan' ? 'bg-rose-50 text-rose-400 border border-rose-100' : 'bg-blue-50 text-blue-400 border border-blue-100'}`}>
                                                <div className={`w-1 h-1 rounded-full ${s.gender === 'Perempuan' ? 'bg-rose-400' : 'bg-blue-400'}`}></div>
                                                {s.name.split(' ')[0]}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full text-center py-2 flex items-center justify-center gap-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[7px] font-black text-emerald-600 uppercase">Kelas Tuntas Presensi</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Log Aktivitas</h4>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <SparklesIcon className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Instant Sync</span>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" />
                    <p className="text-[9px] font-black text-slate-400 tracking-[0.2em]">LOADING DATA...</p>
                </div>
            ) : filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {filteredRecords.map((r, i) => {
                        const sessionField: any = (selectedSession !== 'All' ? sessionMap[selectedSession] : 'checkIn');
                        const timeVal = r[sessionField] || '-';
                        
                        return (
                            <div key={r.id} className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 15}ms` }}>
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-500 transition-colors"></div>
                                <div className="flex-1 min-w-0 pr-4 flex items-center gap-4 pl-1">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border-2 ${r.status === 'Haid' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                                        {r.status === 'Haid' ? <HeartIcon className="w-6 h-6 fill-current" /> : (r.studentName || '?').charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate tracking-tight">{(r.studentName || 'Siswa').toUpperCase()}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter flex items-center gap-1 ${getStatusBadgeClass(r.status)}`}>
                                                {r.status === 'Haid' && <HeartIcon className="w-2.5 h-2.5 fill-current" />}
                                                {String(r.status)}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{r.class || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{selectedSession === 'All' ? 'MASUK' : selectedSession}</p>
                                        <p className={`text-[12px] font-mono font-black ${timeVal === 'Haid' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {timeVal === 'Haid' ? 'HAID' : (timeVal && timeVal !== '-' ? String(timeVal).substring(0, 5) : '--:--')}
                                        </p>
                                    </div>
                                    {!isStudent && (
                                        <button onClick={() => handleEditClick(r)} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white transition-all border border-transparent shadow-sm"><PencilIcon className="w-4 h-4" /></button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-24 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <XCircleIcon className="w-12 h-12 text-slate-100 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Data Tidak Ditemukan</p>
                </div>
            )}
        </div>
      </div>

      {isEditModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-xs rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10">
                  <h3 className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-8 text-center">Koreksi Data</h3>
                  <div className="space-y-5">
                      <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kehadiran</label>
                          <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase outline-none cursor-pointer">
                              <option value="Hadir">HADIR</option>
                              <option value="Haid">HAID</option>
                              <option value="Terlambat">TERLAMBAT</option>
                              <option value="Sakit">SAKIT</option>
                              <option value="Izin">IZIN</option>
                              <option value="Alpha">ALPA</option>
                          </select>
                      </div>
                      <div className="flex gap-2.5 pt-4">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                        <button onClick={handleSaveEdit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Simpan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default AttendanceHistory;