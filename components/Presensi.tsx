
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, isMockMode } from '../services/firebase';
import { Student, ViewState, AttendanceRecord, MadrasahData } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { 
    Loader2, ChevronLeft, ChevronRight, 
    Search, ArrowLeftIcon, 
    CameraIcon, PencilIcon, SaveIcon, HeartIcon,
    PrinterIcon, XCircleIcon, ArrowDownTrayIcon, TrashIcon
} from './Icons';

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);
  const [filterNama, setFilterNama] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
        if (!db && !isMockMode) return;
        const dateStr = format(date, "yyyy-MM-dd");
        if (isMockMode) { setAllStudents([{ id: '1', namaLengkap: 'Adelia Sri Sundari', tingkatRombel: 'XII IPA 1', status: 'Aktif', idUnik: '25002' } as any]); setLoading(false); return; }
        const unsubS = db!.collection("students").where("status", "==", "Aktif").onSnapshot(s => setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
        const unsubA = db!.collection("attendance").where("date", "==", dateStr).onSnapshot(s => { setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); setLoading(false); });
        db!.collection('settings').doc('madrasahInfo').get().then(doc => { if (doc.exists) setMadrasahInfo(doc.data() as MadrasahData); });
        return () => { unsubS(); unsubA(); };
    };
    loadData();
  }, [date]);

  const displayData = useMemo(() => {
    const filtered = allStudents.filter(s => {
        const matchesNama = (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase()) || String(s.idUnik || '').toLowerCase().includes(filterNama.toLowerCase());
        return matchesNama;
    }).sort((a, b) => (a.tingkatRombel || '').localeCompare(b.tingkatRombel || '', undefined, { numeric: true }));
    
    const attMap = new Map<string, AttendanceRecord>(attendanceSnapshot.map(r => [r.studentId, r]));
    return filtered.map(s => {
        const existing = attMap.get(s.id!);
        let status = existing?.status || 'Alpha';
        if (['Haid', 'Terlambat'].includes(status as any)) status = 'Hadir';
        return { ...(existing || { id: `${s.id}_${format(date, "yyyy-MM-dd")}`, studentId: s.id!, studentName: s.namaLengkap, class: s.tingkatRombel, checkIn: null, checkOut: null, duha: null, zuhur: null, ashar: null, idUnik: s.idUnik }) as object, status } as any;
    });
  }, [allStudents, attendanceSnapshot, date, filterNama]);

  // FUNGSI KALKULASI OTOMATIS VISUAL
  const formatTimeDisplay = (val: string | null, session: 'MSK' | 'PLG' | 'OTHER' = 'OTHER') => {
    if (!val) return '-';
    const strVal = String(val);
    if (strVal.includes('|')) return strVal.split(' ')[0].trim().substring(0, 5) + ' | ' + strVal.split('|')[1].trim();
    if (strVal.includes('(Haid)')) return strVal.split(' ')[0].substring(0, 5) + " (Haid)";
    
    const timeOnly = strVal.substring(0, 5);
    const [h, m] = timeOnly.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeOnly;
    
    const currentMinutes = h * 60 + m;
    const mskThreshold = 7 * 60 + 30; // 07:30
    const plgThreshold = 16 * 60;     // 16:00

    if (session === 'MSK' && currentMinutes > mskThreshold) {
        const diff = currentMinutes - mskThreshold;
        return `${timeOnly} | +${diff < 10 ? '0' + diff : diff}`;
    }
    if (session === 'PLG' && currentMinutes < plgThreshold) {
        const diff = plgThreshold - currentMinutes;
        return `${timeOnly} | -${diff < 10 ? '0' + diff : diff}`;
    }

    return timeOnly;
  };

  const handleEditClick = (record: AttendanceRecord) => {
      setEditingRecord({ ...record }); setIsModalOpen(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRecord) return;
      setSaving(true);
      const finalizeTime = (t: string | null) => {
          if (!t) return null;
          let timeBase = t.includes(' ') ? t.split(' ')[0] : t;
          if (timeBase.length === 5) timeBase = `${timeBase}:00`;
          return timeBase;
      };
      const finalRecord = { ...editingRecord, checkIn: finalizeTime(editingRecord.checkIn), duha: finalizeTime(editingRecord.duha), zuhur: finalizeTime(editingRecord.zuhur), ashar: finalizeTime(editingRecord.ashar), checkOut: finalizeTime(editingRecord.checkOut), lastUpdated: new Date() };
      try {
          if (!isMockMode && db) await db.collection("attendance").doc(editingRecord.id).set(finalRecord, { merge: true });
          toast.success("Log diperbarui."); setIsModalOpen(false);
      } catch (e) { toast.error("Gagal simpan."); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden">
      <div className="bg-white/80 dark:bg-[#0B1121]/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-100 text-slate-500 active:scale-90"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div><h2 className="font-black text-slate-900 dark:text-white text-sm uppercase">Presensi Harian</h2><p className="text-[8px] font-black text-indigo-600 uppercase mt-1">Audit Log Database</p></div>
          </div>
          <button onClick={() => onNavigate(ViewState.SCANNER)} className="p-2.5 bg-indigo-600 text-white rounded-xl active:scale-95"><CameraIcon className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 pb-40 max-w-[1600px] mx-auto w-full">
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#151E32] p-2 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200">
                  <button onClick={() => setDate(new Date(date.getTime() - 86400000))}><ChevronLeft className="w-4 h-4"/></button>
                  <span className="text-[10px] font-black uppercase px-2 min-w-[70px] text-center">{format(date, "dd MMM yyyy", { locale: localeID })}</span>
                  <button onClick={() => setDate(new Date(date.getTime() + 86400000))}><ChevronRight className="w-4 h-4"/></button>
              </div>
              <div className="relative group flex-1 md:min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <input type="text" placeholder="Cari Siswa..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold outline-none" />
              </div>
          </div>

          <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b sticky top-0 z-20">
                          <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                              <th className="w-10 px-2 py-4 text-center border-r">No</th>
                              <th className="w-[200px] px-4 py-4 border-r sticky left-0 bg-slate-50">Nama Lengkap</th>
                              <th className="w-24 px-2 py-4 text-center border-r">ID Unik</th>
                              <th className="w-24 px-1 py-4 text-center border-r">MSK</th>
                              <th className="w-16 px-1 py-4 text-center border-r">DHA</th>
                              <th className="w-16 px-1 py-4 text-center border-r">ZHR</th>
                              <th className="w-16 px-1 py-4 text-center border-r">ASR</th>
                              <th className="w-24 px-1 py-4 text-center border-r">PLG</th>
                              <th className="w-24 px-2 py-4 text-center border-r">Status</th>
                              <th className="w-12 px-2 py-4 text-center">Aksi</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {loading ? (
                              <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                          ) : displayData.map((record, idx) => (
                              <tr key={record.id} className="text-[10px] hover:bg-slate-50">
                                  <td className="px-2 py-3.5 text-center border-r text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="px-4 py-3.5 border-r sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-700 dark:text-slate-200 uppercase truncate">{record.studentName}</td>
                                  <td className="px-2 py-3.5 border-r text-center font-mono font-bold text-indigo-600">{record.idUnik || '-'}</td>
                                  <td className={`px-1 py-3.5 border-r text-center font-mono font-black ${String(formatTimeDisplay(record.checkIn, 'MSK')).includes('+') ? 'text-amber-600' : ''}`}>{formatTimeDisplay(record.checkIn, 'MSK')}</td>
                                  <td className={`px-1 py-3.5 border-r text-center font-mono ${String(record.duha).includes('Haid') ? 'bg-rose-50 text-rose-600 font-black' : ''}`}>{formatTimeDisplay(record.duha)}</td>
                                  <td className={`px-1 py-3.5 border-r text-center font-mono ${String(record.zuhur).includes('Haid') ? 'bg-rose-50 text-rose-600 font-black' : ''}`}>{formatTimeDisplay(record.zuhur)}</td>
                                  <td className={`px-1 py-3.5 border-r text-center font-mono ${String(record.ashar).includes('Haid') ? 'bg-rose-50 text-rose-600 font-black' : ''}`}>{formatTimeDisplay(record.ashar)}</td>
                                  <td className={`px-1 py-3.5 border-r text-center font-mono font-black ${String(formatTimeDisplay(record.checkOut, 'PLG')).includes('-') ? 'text-rose-600' : ''}`}>{formatTimeDisplay(record.checkOut, 'PLG')}</td>
                                  <td className="px-2 py-3.5 border-r text-center"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${record.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>{record.status}</span></td>
                                  <td className="px-2 py-3.5 text-center"><button onClick={() => handleEditClick(record)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><PencilIcon className="w-3.5 h-3.5" /></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {isModalOpen && editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#0B1121] w-full max-w-[360px] rounded-[3rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in">
                  <h3 className="font-black text-xs text-white uppercase mb-8 text-center tracking-[0.3em]">Koreksi Log</h3>
                  <form onSubmit={handleSaveCorrection} className="space-y-6">
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status Kehadiran</label><select value={editingRecord.status} onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })} className="w-full px-5 py-4 bg-[#151E32] border border-slate-700 rounded-2xl text-[11px] font-black text-white uppercase outline-none"><option value="Hadir">HADIR</option><option value="Alpha">ALPHA</option><option value="Izin">IZIN</option><option value="Sakit">SAKIT</option></select></div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Masuk</label><input type="time" value={editingRecord.checkIn?.split(' ')[0].substring(0,5) || ''} onChange={e => setEditingRecord({...editingRecord, checkIn: e.target.value})} className="w-full px-4 py-3 bg-transparent border border-slate-700 rounded-xl text-[12px] font-bold text-white outline-none" /></div>
                      <div className="space-y-1.5 pt-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Ibadah Sholat</label>{['duha', 'zuhur', 'ashar'].map((field) => (<div key={field} className="flex items-center gap-2 mb-2"><input type="time" value={editingRecord[field]?.split(' ')[0].substring(0,5) || ''} onChange={e => setEditingRecord({...editingRecord, [field]: e.target.value})} className="flex-1 px-4 py-3 bg-transparent border border-slate-700 rounded-xl text-[11px] font-bold text-white outline-none" /><button type="button" onClick={() => setEditingRecord({...editingRecord, [field]: ''})} className="p-3 bg-slate-800 rounded-xl text-slate-400"><TrashIcon className="w-3.5 h-3.5" /></button></div>))}</div>
                      <div className="space-y-1.5 pt-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pulang</label><input type="time" value={editingRecord.checkOut?.split(' ')[0].substring(0,5) || ''} onChange={e => setEditingRecord({...editingRecord, checkOut: e.target.value})} className="w-full px-4 py-3 bg-transparent border border-slate-700 rounded-xl text-[12px] font-bold text-white outline-none" /></div>
                      <div className="pt-6 flex flex-col gap-3">
                          <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <SaveIcon className="w-4 h-4" />} Simpan</button>
                          <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-[#1e293b] text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Batal</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default Presensi;
