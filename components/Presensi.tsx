import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { Student, ViewState } from '../types';
import { toast } from 'sonner';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale'; 
import { 
    CalendarIcon, Loader2, ChevronLeft, ChevronRight, 
    Search, QrCodeIcon, ArrowLeftIcon, 
    CameraIcon, ClockIcon, PencilIcon,
    CheckCircleIcon, RectangleStackIcon, XCircleIcon,
    ChevronDownIcon
} from './Icons';

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    class: string;
    date: string;
    status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

interface Class { id: string; name: string; }
type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeGrade, setActiveGrade] = useState<string>('All');
  const [activeClass, setActiveClass] = useState<string>('All');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isMockMode) {
        setAllStudents([{ id: '1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: '10 A', nisn: '123' } as any]);
        setLoading(false); return;
    }
    if (!db) return;
    const unsubS = db.collection("students").onSnapshot(s => setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    const unsubA = db.collection("attendance").where("date", "==", format(date || new Date(), "yyyy-MM-dd")).onSnapshot(s => {
        setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        setLoading(false);
    });
    return () => { unsubS(); unsubA(); }
  }, [date]);

  const { sortedGrades } = useMemo(() => {
    const grades = Array.from(new Set(allStudents.map(s => s.tingkatRombel.split(' ')[0]))).sort();
    return { sortedGrades: grades };
  }, [allStudents]);

  const displayData = useMemo(() => {
    const query = searchTerm.toLowerCase();
    const students = allStudents.filter(s => {
        // FIX: Proteksi jika nama atau nisn undefined
        const nama = String(s.namaLengkap || '').toLowerCase();
        const nisn = String(s.nisn || '').toLowerCase();
        const matchesSearch = nama.includes(query) || nisn.includes(query);
        const matchesGrade = activeGrade === 'All' || s.tingkatRombel.startsWith(activeGrade);
        const matchesClass = activeClass === 'All' || s.tingkatRombel === activeClass;
        return matchesSearch && matchesGrade && matchesClass;
    });
    const attMap = new Map(attendanceSnapshot.map(r => [r.studentId, r]));
    return students.map(s => attMap.get(s.id!) || {
        id: `${s.id}_${format(date!, "yyyy-MM-dd")}`,
        studentId: s.id!, studentName: s.namaLengkap, class: s.tingkatRombel,
        status: 'Alpha', checkIn: null, checkOut: null, duha: null, zuhur: null, ashar: null
    } as AttendanceRecord);
  }, [allStudents, attendanceSnapshot, searchTerm, activeGrade, activeClass, date]);

  const stats = useMemo(() => ({
      hadir: displayData.filter(d => d.status === 'Hadir').length,
      total: displayData.length
  }), [displayData]);

  const getStatusColor = (s: string) => {
    if (s === 'Hadir') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20';
    if (s === 'Alpha') return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20';
    return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20';
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
      
      {/* --- HEADER (FULL FRAME SLIM) --- */}
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-3 py-2 flex items-center justify-between z-30 sticky top-0 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500"><ArrowLeftIcon className="w-4 h-4" /></button>
              <div>
                  <h2 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight">Presensi Siswa</h2>
                  <p className="text-[7px] font-bold text-indigo-600 uppercase tracking-widest">MAN 1 HST Hub</p>
              </div>
          </div>
          <div className="flex gap-1">
              <button onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg"><ClockIcon className="w-4 h-4" /></button>
              <button onClick={() => onNavigate(ViewState.SCANNER)} className="p-1.5 bg-indigo-600 text-white rounded-lg"><CameraIcon className="w-4 h-4" /></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-6 space-y-2.5 pb-32">
          
          {/* --- DATE & FILTER (TIGHT) --- */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#151E32] p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <button onClick={() => setDate(new Date(date!.setDate(date!.getDate()-1)))} className="p-1.5 rounded-lg hover:bg-slate-50"><ChevronLeft className="w-3.5 h-3.5"/></button>
              <div className="text-center min-w-[100px]">
                  <span className="text-[6px] font-black text-indigo-500 uppercase block tracking-widest">{format(date!, "EEEE", { locale: localeID })}</span>
                  <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{format(date!, "dd MMM yyyy", { locale: localeID })}</h3>
              </div>
              <button onClick={() => setDate(new Date(date!.setDate(date!.getDate()+1)))} className="p-1.5 rounded-lg hover:bg-slate-50"><ChevronRight className="w-3.5 h-3.5"/></button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3">
              <button onClick={() => setActiveGrade('All')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border whitespace-nowrap transition-all ${activeGrade === 'All' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>Semua</button>
              {sortedGrades.map(g => (
                  <button key={g} onClick={() => setActiveGrade(g)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border whitespace-nowrap transition-all ${activeGrade === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'}`}>Tk. {g}</button>
              ))}
          </div>

          {/* --- SEARCH (TIGHT) --- */}
          <div className="relative group">
              <Search className="w-3 h-3 absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Cari Siswa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-white dark:bg-[#151E32] border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm" />
          </div>

          {/* --- STATS SUMMARY (MINIMAL) --- */}
          <div className="grid grid-cols-4 gap-1.5 bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm overflow-hidden relative">
              {[
                  { l: 'Hadir', v: stats.hadir }, { l: 'Telat', v: 0 }, { l: 'Izin', v: 0 }, { l: 'Alpa', v: stats.total - stats.hadir }
              ].map((s, i) => (
                  <div key={i} className="text-center py-0.5">
                      <p className="text-xs font-black leading-none">{s.v}</p>
                      <p className="text-[6px] font-bold uppercase tracking-widest mt-1 opacity-70">{s.l}</p>
                  </div>
              ))}
          </div>

          {/* --- DATA LIST (RAPAT CARDS) --- */}
          {loading ? (
              <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
          ) : (
              <div className="space-y-2">
                  {displayData.map((record) => (
                      <div key={record.id} className="bg-white dark:bg-[#151E32] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${record.status === 'Alpha' ? 'bg-slate-50 text-slate-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'}`}>
                                      {record.studentName.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                      <h4 className="font-black text-slate-800 dark:text-white text-[9px] truncate leading-tight uppercase tracking-tight">{record.studentName}</h4>
                                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate">{record.class} • {record.studentId.substring(0,8)}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider ${getStatusColor(record.status)}`}>{record.status}</span>
                                  <button className="p-1 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-400"><PencilIcon className="w-3 h-3" /></button>
                              </div>
                          </div>

                          {/* Sessions Row (DENSE GRID) */}
                          <div className="grid grid-cols-5 gap-1 mt-2">
                              {['MSK', 'DHA', 'ZHR', 'ASR', 'PLG'].map((label, idx) => (
                                  <div key={idx} className={`p-1 rounded-md text-center border ${idx === 0 && record.checkIn ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100/50'} `}>
                                      <p className="text-[5px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
                                      <p className="text-[7px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                          {idx === 0 ? (record.checkIn?.substring(0, 5) || '--:--') : '--:--'}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
}

export default Presensi;