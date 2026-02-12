
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
    Search, CameraIcon, FileSpreadsheet, PhoneIcon
} from './Icons';
import Layout from './Layout';

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNama, setFilterNama] = useState('');

  const CONFIG = { masuk: "07:30", pulang: "16:00" };

  useEffect(() => {
    setLoading(true);
    const dateStr = format(date, "yyyy-MM-dd");
    if (isMockMode) { 
        setAllStudents([{ id: '1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: 'XII IPA 1', status: 'Aktif', idUnik: '25002', noTelepon: '0812345' } as any]); 
        setLoading(false); return; 
    }
    if (!db) return;
    const unsubS = db.collection("students").where("status", "==", "Aktif").onSnapshot(s => setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    const unsubA = db.collection("attendance").where("date", "==", dateStr).onSnapshot(s => { setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); setLoading(false); });
    return () => { unsubS(); unsubA(); };
  }, [date]);

  const calculateDiff = (timeStr: string | null, limitStr: string, type: 'masuk' | 'pulang') => {
      if (!timeStr) return null;
      const [h, m] = timeStr.split(' | ')[0].split(':').map(Number);
      const [lh, lm] = limitStr.split(':').map(Number);
      const diff = (h * 60 + m) - (lh * 60 + lm);
      if (type === 'masuk' && diff > 0) return <span className="text-[7px] text-amber-500 font-black block">+{diff}m</span>;
      if (type === 'pulang' && diff < 0) return <span className="text-[7px] text-rose-500 font-black block">{diff}m</span>;
      return null;
  };

  const displayData = useMemo(() => {
    const q = filterNama.toLowerCase();
    const filtered = allStudents.filter(s => (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').toLowerCase().includes(q));
    const attMap = new Map<string, AttendanceRecord>(attendanceSnapshot.map(r => [r.studentId, r]));
    return filtered.map(s => ({ ...s, att: attMap.get(s.id!) }));
  }, [allStudents, attendanceSnapshot, filterNama]);

  const TimeCell = ({ val, type }: { val: string | null | undefined, type: 'masuk' | 'pulang' | 'ibadah' }) => {
      const isHaid = String(val || '').includes('| H');
      const time = val ? val.split(' | ')[0].substring(0, 5) : '--:--';
      return (
          <td className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">
              <span className={`text-[10px] font-mono font-black ${isHaid ? 'text-pink-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  {isHaid ? 'HAID' : time}
              </span>
              {!isHaid && type === 'masuk' && calculateDiff(val as any, CONFIG.masuk, 'masuk')}
              {!isHaid && type === 'pulang' && calculateDiff(val as any, CONFIG.pulang, 'pulang')}
          </td>
      );
  };

  return (
    <Layout title="Presensi Harian" subtitle="Visual Time-Diff Engine" icon={CameraIcon} onBack={onBack}
        actions={<button onClick={() => toast.info("Exporting...")} className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 active:scale-90 transition-all"><FileSpreadsheet className="w-5 h-5" /></button>}
    >
      <div className="space-y-6 pb-40">
          <div className="mx-4 bg-white/40 dark:bg-[#0B1121]/40 backdrop-blur-3xl p-5 rounded-[2.5rem] border border-white/20 flex flex-col md:flex-row gap-4 shadow-sm">
              <div className="flex-1 flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-inner">
                  <button onClick={() => setDate(new Date(date.getTime() - 86400000))} className="p-1"><ChevronLeft className="w-5 h-5 text-indigo-600" /></button>
                  <div className="flex-1 text-center flex flex-col"><span className="text-[9px] font-black text-slate-400 uppercase">{format(date, "EEEE", { locale: localeID })}</span><span className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none mt-1">{format(date, "dd MMMM", { locale: localeID })}</span></div>
                  <button onClick={() => setDate(new Date(date.getTime() + 86400000))} className="p-1"><ChevronRight className="w-5 h-5 text-indigo-600" /></button>
              </div>
              <input type="text" placeholder="CARI SISWA..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black outline-none shadow-sm" />
          </div>

          <div className="mx-4 bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                          <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="w-10 px-4 py-6 text-center">#</th>
                              <th className="px-4 py-6 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[150px]">Identitas</th>
                              <th className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">MSK</th>
                              <th className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">DHA</th>
                              <th className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">ZHR</th>
                              <th className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">ASR</th>
                              <th className="hidden lg:table-cell px-2 py-6 text-center border-r dark:border-slate-800">PLG</th>
                              <th className="w-24 px-4 py-6 text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          {loading ? (<tr><td colSpan={8} className="py-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></td></tr>) : displayData.map((s: any, idx) => (
                              <tr key={s.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="px-4 py-6 text-center text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="px-4 py-6 sticky left-0 bg-white dark:bg-[#151E32] z-10">
                                      <div className="flex items-center justify-between">
                                          <div className="flex flex-col min-w-0"><span className="font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[120px]">{s.namaLengkap}</span><span className="text-[8px] font-mono text-indigo-500 font-bold">ID: {s.idUnik}</span></div>
                                          {s.noTelepon && <button onClick={() => window.open(`https://wa.me/${String(s.noTelepon).replace(/^0/, '62')}`)} className="p-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg active:scale-75 transition-all"><PhoneIcon className="w-3.5 h-3.5" /></button>}
                                      </div>
                                  </td>
                                  <TimeCell val={s.att?.checkIn} type="masuk" />
                                  <TimeCell val={s.att?.duha} type="ibadah" />
                                  <TimeCell val={s.att?.zuhur} type="ibadah" />
                                  <TimeCell val={s.att?.ashar} type="ibadah" />
                                  <TimeCell val={s.att?.checkOut} type="pulang" />
                                  <td className="px-4 py-6 text-center"><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${s.att?.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s.att?.status === 'Haid' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{s.att?.status || 'Alpha'}</span></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </Layout>
  );
}

export default Presensi;
