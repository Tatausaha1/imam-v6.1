import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';
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
  SparklesIcon
} from './Icons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ViewState, AttendanceStatus } from '../types';

interface AttendanceHistoryProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
}

interface AttendanceRecord {
    id: string;
    studentName: string;
    class: string;
    date: string;
    status: AttendanceStatus;
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onBack, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedSession, setSelectedSession] = useState<string>('All'); // New Session Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AttendanceRecord>>({});

  const sessionMap: Record<string, keyof AttendanceRecord> = {
    'Masuk': 'checkIn',
    'Duha': 'duha',
    'Zuhur': 'zuhur',
    'Ashar': 'ashar',
    'Pulang': 'checkOut'
  };

  useEffect(() => {
    if (isMockMode) {
        setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA']);
        return;
    }
    if (db) {
        db.collection('classes').get().then(s => setClasses(s.docs.map(d => d.data().name).sort()));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            const mockData: AttendanceRecord[] = [];
            for (let i = 0; i < 20; i++) {
                const isHaid = i % 8 === 0;
                mockData.push({
                    id: `rec-${i}`,
                    studentName: `Siswa Contoh ${i + 1}`,
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
        }, 600);
        return;
    }
    if (!db) return;
    let query = db.collection('attendance').where('date', '==', selectedDate);
    if (selectedClass !== 'All') query = query.where('class', '==', selectedClass);

    const unsubscribe = query.onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        data.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
        setRecords(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedDate, selectedClass]);

  const filteredRecords = useMemo(() => {
      return records.filter(r => {
          const name = String(r.studentName || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          const matchesSearch = name.includes(query);
          const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
          
          // Logic filtering by session
          let matchesSession = true;
          if (selectedSession !== 'All') {
              const sessionField = sessionMap[selectedSession];
              matchesSession = !!r[sessionField];
          }

          return matchesSearch && matchesStatus && matchesSession;
      });
  }, [records, searchQuery, filterStatus, selectedSession]);

  const stats = useMemo(() => ({
      present: records.filter(r => r.status === 'Hadir').length,
      late: records.filter(r => r.status === 'Terlambat').length,
      haid: records.filter(r => r.status === 'Haid').length,
      sessionCount: selectedSession !== 'All' ? filteredRecords.length : records.length
  }), [records, filteredRecords, selectedSession]);

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord(record);
      setEditForm({
          status: record.status,
          checkIn: record.checkIn?.substring(0,5),
          checkOut: record.checkOut?.substring(0,5)
      });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingRecord) return;
      if (isMockMode) {
          toast.success("Simulasi Update Berhasil");
      } else {
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
    <Layout title="Database Absensi" subtitle="Riwayat Sesi Terpusat" icon={CalendarIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-24 space-y-5">
        
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
            </div>

            {/* SESSION CHIPS */}
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
                    placeholder="CARI NAMA SISWA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-transparent rounded-[1.5rem] text-[10px] font-black focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner"
                />
            </div>
        </div>

        {/* RECAP STATS */}
        <div className="bg-indigo-600 rounded-[2rem] p-5 text-white shadow-xl shadow-indigo-500/20 flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><ChartBarIcon className="w-20 h-20" /></div>
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                    {selectedSession === 'All' ? 'Data Terkumpul' : `Total ${selectedSession}`}
                </p>
                <h3 className="text-3xl font-black mt-1">{stats.sessionCount} <span className="text-sm font-bold opacity-60">Siswa</span></h3>
            </div>
            <div className="text-right relative z-10 flex gap-4">
                <div className="flex flex-col items-end">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Hadir</p>
                    <p className="text-lg font-black">{stats.present}</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Haid</p>
                    <p className="text-lg font-black text-rose-300">{stats.haid}</p>
                </div>
            </div>
        </div>

        {/* LIST SECTION */}
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Record Log</h4>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <SparklesIcon className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Live Updates</span>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" />
                    <p className="text-[9px] font-black text-slate-400 tracking-[0.2em]">SINKRONISASI...</p>
                </div>
            ) : filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {filteredRecords.map((r, i) => {
                        const sessionField = selectedSession !== 'All' ? sessionMap[selectedSession] : 'checkIn';
                        const timeVal = r[sessionField] || '-';
                        
                        return (
                            <div key={r.id} className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="flex-1 min-w-0 pr-4 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 border-2 ${r.status === 'Haid' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                                        {r.status === 'Haid' ? <HeartIcon className="w-6 h-6 fill-current" /> : (r.studentName || '?').charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase truncate tracking-tight">{r.studentName || 'Tanpa Nama'}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter flex items-center gap-1 ${getStatusBadgeClass(r.status)}`}>
                                                {r.status === 'Haid' && <HeartIcon className="w-2.5 h-2.5 fill-current" />}
                                                {r.status}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{r.class || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                            {selectedSession === 'All' ? 'TERAKHIR' : selectedSession}
                                        </p>
                                        <p className={`text-[12px] font-mono font-black ${timeVal === 'Haid' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {timeVal === 'Haid' ? 'HAID' : (timeVal && timeVal !== '-' ? timeVal.substring(0, 5) : '--:--')}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleEditClick(r)} 
                                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white active:scale-90 transition-all border border-transparent"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-24 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <XCircleIcon className="w-12 h-12 text-slate-100 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Data Tidak Ditemukan</p>
                    <p className="text-[8px] text-slate-400 mt-2 uppercase">Belum ada rekaman log untuk kriteria ini</p>
                </div>
            )}
        </div>
      </div>

      {isEditModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-xs rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10">
                  <h3 className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-[0.2em] mb-8 text-center">Update Log Absensi</h3>
                  <div className="space-y-5">
                      <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kehadiran</label>
                          <select 
                            value={editForm.status} 
                            onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer"
                          >
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
                        <button onClick={handleSaveEdit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">Terapkan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default AttendanceHistory;