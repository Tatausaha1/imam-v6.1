
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  CalendarIcon, CheckCircleIcon, ClockIcon, Search, 
  PencilIcon, TrashIcon, Loader2, HeartIcon, 
  SaveIcon, ChevronDownIcon, ArrowLeftIcon, BookOpenIcon,
  XCircleIcon, SparklesIcon, ArrowRightIcon, StarIcon, ChartBarIcon
} from './Icons';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ViewState, AttendanceStatus, UserRole, AttendanceRecord, Student } from '../types';

interface AttendanceHistoryProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onBack, onNavigate, userRole }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<string[]>([]);

  const isStudent = userRole === UserRole.SISWA;

  useEffect(() => {
    if (isMockMode) { setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XI IPS 2', 'XII AGAMA']); return; }
    if (db) db.collection('classes').get().then(s => setClasses(s.docs.map(d => d.data().name).sort()));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            const mockS = { id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: 'XII IPA 1', idUnik: '25002' } as any;
            const mockR = { id: 's1_' + selectedDate, studentId: 's1', studentName: 'ADELIA SRI SUNDARI', class: 'XII IPA 1', status: 'Haid', date: selectedDate, checkIn: '07:39:21 | +9', duha: '08:20:00 | H', zuhur: '12:30:00 | H', ashar: null, checkOut: null } as any;
            setAllStudents([mockS]); setAttendanceRecords([mockR]); setLoading(false);
        }, 500);
        return;
    }
    if (!db) return;
    
    // Gunakan error handler pada snapshot listener
    const unsubStudents = db.collection('students').where('status', '==', 'Aktif').onSnapshot(
        snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))),
        err => console.warn("Firestore: Gagal memuat siswa.", err.message)
    );

    const unsubAttendance = db.collection('attendance').where('date', '==', selectedDate).onSnapshot(
        snap => { 
            setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord))); 
            setLoading(false); 
        },
        err => {
            console.warn("Firestore: Gagal memuat kehadiran.", err.message);
            setLoading(false);
        }
    );

    return () => { unsubStudents(); unsubAttendance(); };
  }, [selectedDate]);

  const parseTimeParts = (val: string | null) => {
      if (!val) return { time: '--:--', meta: null };
      const parts = String(val).split(' | ');
      const timePart = parts[0].substring(0, 5);
      const metaPart = parts[1] || null;
      return { time: timePart, meta: metaPart };
  };

  const displayData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filteredStudents = allStudents.filter(s => {
        if (isStudent && auth.currentUser) return s.id === auth.currentUser.uid;
        const matchesClass = selectedClass === 'All' || s.tingkatRombel === selectedClass;
        return matchesClass && (q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').toLowerCase().includes(q));
    }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

    const attMap = new Map<string, AttendanceRecord>(attendanceRecords.map(r => [r.studentId, r]));
    return filteredStudents.map(student => {
        const record = attMap.get(student.id!);
        let status = record?.status || 'Alpha';
        return { ...(record || { id: `${student.id}_${selectedDate}`, studentId: student.id!, studentName: student.namaLengkap, class: student.tingkatRombel, date: selectedDate, checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null, idUnik: student.idUnik }) as object, status } as any;
    }).filter(r => filterStatus === 'All' || r.status === filterStatus);
  }, [allStudents, attendanceRecords, selectedDate, searchQuery, selectedClass, filterStatus, isStudent]);

  const SessionStatus = ({ label, timeRaw }: { label: string, timeRaw: string | null }) => {
      const isFilled = !!timeRaw;
      const { time, meta } = parseTimeParts(timeRaw);
      let colorClass = 'bg-slate-50 dark:bg-slate-900 border-transparent opacity-30';
      if (isFilled) {
          colorClass = meta === 'H' ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/10 dark:border-rose-800/50' : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-800/50';
      }
      return (
          <div className={`flex flex-col items-center p-2 rounded-xl border flex-1 transition-all ${colorClass}`}>
              <span className="text-[6px] font-black uppercase mb-0.5">{label}</span>
              <div className="text-[9px] font-mono font-black flex items-center justify-center gap-0.5">
                  <span>{time}</span>
                  {meta && <span className="text-[7px] font-black opacity-60">| {meta}</span>}
              </div>
          </div>
      );
  };

  return (
    <Layout title={isStudent ? "Kehadiran Saya" : "Riwayat"} subtitle={isStudent ? "Dashboard Personal" : "Log Database"} icon={CalendarIcon} onBack={onBack}>
      <div className="p-3 lg:p-6 pb-24 space-y-4">
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none" />
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black outline-none cursor-pointer"><option value="All">SEMUA</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            {!isStudent && (
                <div className="relative group"><Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" /><input type="text" placeholder="Cari Nama / ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none" /></div>
            )}
        </div>
        <div className="space-y-3">
            {loading ? (<div className="py-20 text-center flex flex-col items-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" /></div>) : displayData.map((r) => (
                <div key={r.id} className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${r.status === 'Hadir' ? 'bg-emerald-500' : r.status === 'Haid' ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    <div className="flex items-center justify-between mb-4 pl-1.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${r.status === 'Haid' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-100 dark:border-indigo-800'}`}>{(r.studentName || '?').charAt(0)}</div>
                            <div className="min-w-0"><h4 className="font-black text-[10px] uppercase truncate text-slate-800 dark:text-slate-200">{isStudent ? 'Pencatatan Hari Ini' : r.studentName}</h4><span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${r.status === 'Alpha' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : r.status === 'Haid' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>{r.status === 'Alpha' ? 'BELUM ADA LOG' : r.status}</span></div>
                        </div>
                    </div>
                    <div className="flex gap-1.5 pl-1.5">
                        <SessionStatus label="MSK" timeRaw={r.checkIn} /><SessionStatus label="DHA" timeRaw={r.duha} /><SessionStatus label="ZHR" timeRaw={r.zuhur} /><SessionStatus label="ASR" timeRaw={r.ashar} /><SessionStatus label="PLG" timeRaw={r.checkOut} />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceHistory;