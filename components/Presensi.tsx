
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, ViewState, AttendanceRecord } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { 
    Loader2, ChevronLeft, ChevronRight, 
    Search, CameraIcon, PencilIcon, 
    CalendarIcon, UsersIcon, ChevronDownIcon, XCircleIcon
} from './Icons';
import Layout from './Layout';

type SessionFilter = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang';

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedSession, setSelectedSession] = useState<SessionFilter>('Masuk');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNama, setFilterNama] = useState('');

  useEffect(() => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    if (isMockMode) { 
        setAllStudents([
            { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: 'XII IPA 1', status: 'Aktif', idUnik: '25002' } as any,
            { id: '2', namaLengkap: 'AHMAD ZAKI', tingkatRombel: 'XII IPA 1', status: 'Aktif', idUnik: '25003' } as any
        ]); 
        setLoading(false); 
        return; 
    }
    if (!db) return;
    const unsubS = db.collection("students").where("status", "==", "Aktif").onSnapshot(s => setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    const unsubA = db.collection("attendance").where("date", "==", dateStr).onSnapshot(s => { setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); setLoading(false); });
    return () => { unsubS(); unsubA(); };
  }, [date]);

  const displayData = useMemo(() => {
    const filtered = allStudents.filter(s => {
        const matchesNama = (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase()) || String(s.idUnik || '').toLowerCase().includes(filterNama.toLowerCase());
        return matchesNama;
    }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
    
    const attMap = new Map<string, AttendanceRecord>(attendanceSnapshot.map(r => [r.studentId, r]));
    return filtered.map(s => {
        const existing = attMap.get(s.id!);
        return { ...(existing || { id: `${s.id}_${format(date, "yyyy-MM-dd")}`, studentId: s.id!, studentName: s.namaLengkap, class: s.tingkatRombel, checkIn: null, checkOut: null, duha: null, zuhur: null, ashar: null, idUnik: s.idUnik }) as object, status: existing?.status || 'Alpha' } as any;
    });
  }, [allStudents, attendanceSnapshot, date, filterNama]);

  const sessions: SessionFilter[] = ['Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'];
  const sessionKeyMap: Record<SessionFilter, string> = {
      'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut'
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'Hadir': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800';
        case 'Izin': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
        case 'Sakit': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800';
        case 'Terlambat': return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800';
        default: return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800';
    }
  };

  return (
    <Layout title="Presensi Harian" subtitle="Log Database" icon={CameraIcon} onBack={onBack}>
      <div className="space-y-6 pb-40 animate-in fade-in duration-700">
          
          {/* --- HEADER UNIFIED CARD (44px Rounded) --- */}
          <div className="mx-4 md:mx-6 bg-white/40 dark:bg-[#0B1121]/40 backdrop-blur-3xl p-6 rounded-[2.8rem] border border-white/20 dark:border-white/5 shadow-2xl flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] px-6 py-4 shadow-inner">
                  <button onClick={() => setDate(new Date(date.getTime() - 86400000))} className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-indigo-600" /></button>
                  <div className="flex-1 text-center flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{format(date, "EEEE", { locale: localeID })}</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest leading-none mt-1">{format(date, "dd MMMM yyyy", { locale: localeID })}</span>
                  </div>
                  <button onClick={() => setDate(new Date(date.getTime() + 86400000))} className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><ChevronRight className="w-6 h-6 text-indigo-600" /></button>
              </div>
              <div className="relative group flex-1">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="CARI NAMA / ID UNIK..." 
                    value={filterNama} 
                    onChange={e => setFilterNama(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] py-5 pl-16 pr-6 text-xs font-black uppercase tracking-widest outline-none text-slate-800 dark:text-white shadow-inner" 
                  />
              </div>
          </div>

          {/* --- STICKY SESSION NAV (Mobile Only) --- */}
          <div className="lg:hidden sticky top-0 z-[45] -mx-4 px-4 py-3 bg-slate-50/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
                  {sessions.map(s => (
                      <button 
                          key={s} 
                          onClick={() => setSelectedSession(s)}
                          className={`px-6 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all snap-start flex-1 min-w-[100px] border-2 ${
                              selectedSession === s 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                              : 'bg-white dark:bg-[#151E32] text-slate-400 border-transparent hover:border-slate-200'
                          }`}
                      >
                          {s}
                      </button>
                  ))}
              </div>
          </div>

          {/* --- ADAPTIVE DATA GRID --- */}
          <div className="mx-4 md:mx-6 bg-white dark:bg-[#151E32] rounded-[3rem] border border-white/20 dark:border-white/5 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse table-fixed lg:table-auto min-w-[320px] lg:min-w-full">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                          <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">
                              <th className="w-12 px-6 py-7 text-center">#</th>
                              <th className="px-4 py-7 sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 border-r border-slate-100 dark:border-white/5 min-w-[160px]">Nama Lengkap</th>
                              
                              {/* Desktop Columns */}
                              <th className="hidden lg:table-cell px-4 py-7 text-center border-r dark:border-white/5">MSK</th>
                              <th className="hidden lg:table-cell px-4 py-7 text-center border-r dark:border-white/5">DHA</th>
                              <th className="hidden lg:table-cell px-4 py-7 text-center border-r dark:border-white/5">ZHR</th>
                              <th className="hidden lg:table-cell px-4 py-7 text-center border-r dark:border-white/5">ASR</th>
                              <th className="hidden lg:table-cell px-4 py-7 text-center border-r dark:border-white/5">PLG</th>

                              {/* Mobile Dinamis */}
                              <th className="lg:hidden px-4 py-7 text-center border-r dark:border-white/5">{selectedSession}</th>
                              
                              <th className="w-32 px-4 py-7 text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {loading ? (
                              <tr><td colSpan={8} className="py-24 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600 opacity-20" /></td></tr>
                          ) : displayData.map((record, idx) => {
                              const mobileTime = record[sessionKeyMap[selectedSession]];
                              return (
                                  <tr key={record.id} className="text-[11px] hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group font-black uppercase tracking-tight">
                                      <td className="px-6 py-6 text-center text-slate-400 font-bold">{idx + 1}</td>
                                      <td className="px-4 py-6 border-r border-slate-100 dark:border-white/5 sticky left-0 bg-white dark:bg-[#151E32] z-10 group-hover:text-indigo-600 truncate">
                                          {record.studentName}
                                      </td>
                                      
                                      {/* Desktop Cells */}
                                      <td className="hidden lg:table-cell px-4 py-6 text-center border-r dark:border-white/5 font-mono text-slate-300 group-hover:text-indigo-600 transition-colors">{record.checkIn?.substring(0, 5) || '--:--'}</td>
                                      <td className="hidden lg:table-cell px-4 py-6 text-center border-r dark:border-white/5 font-mono text-slate-300 group-hover:text-indigo-600 transition-colors">{record.duha?.substring(0, 5) || '--:--'}</td>
                                      <td className="hidden lg:table-cell px-4 py-6 text-center border-r dark:border-white/5 font-mono text-slate-300 group-hover:text-indigo-600 transition-colors">{record.zuhur?.substring(0, 5) || '--:--'}</td>
                                      <td className="hidden lg:table-cell px-4 py-6 text-center border-r dark:border-white/5 font-mono text-slate-300 group-hover:text-indigo-600 transition-colors">{record.ashar?.substring(0, 5) || '--:--'}</td>
                                      <td className="hidden lg:table-cell px-4 py-6 text-center border-r dark:border-white/5 font-mono text-slate-300 group-hover:text-indigo-600 transition-colors">{record.checkOut?.substring(0, 5) || '--:--'}</td>

                                      {/* Mobile Cell */}
                                      <td className={`lg:hidden px-4 py-6 text-center border-r dark:border-white/5 font-mono ${mobileTime ? 'text-indigo-600' : 'text-slate-200'}`}>
                                          {mobileTime ? mobileTime.substring(0, 5) : '--:--'}
                                      </td>

                                      <td className="px-4 py-6 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                              <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border flex-1 ${getStatusColor(record.status)}`}>
                                                  {record.status}
                                              </span>
                                              <button className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all active:scale-75 shrink-0 border border-slate-100 dark:border-slate-800"><PencilIcon className="w-3.5 h-3.5" /></button>
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </Layout>
  );
}

export default Presensi;
