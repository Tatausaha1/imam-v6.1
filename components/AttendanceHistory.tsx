
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { db, auth, isMockMode } from '../services/firebase';
import { 
  CalendarIcon, Search, Loader2, ClockIcon, ArrowLeftIcon, UsersIcon
} from './Icons';
import { format } from 'date-fns';
import { ViewState, UserRole, AttendanceRecord, Student } from '../types';

const AttendanceHistory: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<string[]>([]);

  const isStudent = userRole === UserRole.SISWA;
  const LIMITS = { masuk: "07:30", pulang: "16:00" };

  useEffect(() => {
    const initClasses = async () => {
        if (isMockMode) { setClasses(['XII IPA 1']); setSelectedClass('XII IPA 1'); return; }
        if (db) {
            const snap = await db.collection('classes').get();
            const names = snap.docs.map(d => d.data().name).sort();
            setClasses(names);
            if (names.length > 0 && !selectedClass) setSelectedClass(names[0]);
        }
    };
    initClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass && !isStudent) return;
    setLoading(true);
    if (isMockMode) {
        setTimeout(() => {
            setAllStudents([{ id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: selectedClass, idUnik: '25002' } as any]);
            setAttendanceRecords([{ id: 's1_today', studentId: 's1', studentName: 'ADELIA SRI SUNDARI', class: selectedClass, status: 'Hadir', date: selectedDate, checkIn: '07:35', duha: '08:45 | H', zuhur: null, ashar: null, checkOut: '15:50' } as any]);
            setLoading(false);
        }, 500);
        return;
    }
    if (!db) return;
    const unsubS = db.collection('students')
        .where('status', '==', 'Aktif')
        .where('tingkatRombel', '==', selectedClass)
        .onSnapshot(snap => setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student))));
    
    const unsubA = db.collection('attendance')
        .where('date', '==', selectedDate)
        .onSnapshot(snap => { 
            setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); 
            setLoading(false); 
        });
    return () => { unsubS(); unsubA(); };
  }, [selectedDate, selectedClass, isStudent]);

  const calculateDiff = (timeStr: string | null, limitStr: string, type: 'masuk' | 'pulang') => {
      if (!timeStr) return null;
      const cleanTime = timeStr.split(' | ')[0];
      const [h, m] = cleanTime.split(':').map(Number);
      const [lh, lm] = limitStr.split(':').map(Number);
      const totalMin = h * 60 + m;
      const limitMin = lh * 60 + lm;
      const diff = totalMin - limitMin;

      if (type === 'masuk' && diff > 0) return `+${diff}`;
      if (type === 'pulang' && diff < 0) return `${diff}`;
      return null;
  };

  const displayData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filteredStudents = allStudents.filter(s => {
        if (isStudent && auth.currentUser) return s.id === auth.currentUser.uid;
        return (q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q));
    });
    const attMap = new Map<string, AttendanceRecord>(attendanceRecords.map(r => [r.studentId, r]));
    return filteredStudents.map(s => ({ ...s, att: attMap.get(s.id!) }));
  }, [allStudents, attendanceRecords, searchQuery, isStudent]);

  const SessionStatus = ({ label, timeRaw, type }: { label: string, timeRaw: string | null, type: 'masuk' | 'pulang' | 'ibadah' }) => {
      const isHaid = String(timeRaw || '').includes('| H');
      const time = timeRaw ? timeRaw.split(' | ')[0].substring(0, 5) : '--:--';
      
      let diffLabel = null;
      if (type === 'masuk') diffLabel = calculateDiff(timeRaw, LIMITS.masuk, 'masuk');
      if (type === 'pulang') diffLabel = calculateDiff(timeRaw, LIMITS.pulang, 'pulang');

      return (
          <div className={`flex flex-col items-center p-2 rounded-xl border flex-1 transition-all ${
              !timeRaw ? 'bg-slate-50 dark:bg-slate-900 border-transparent opacity-20' : 
              isHaid ? 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/20' : 
              'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20'
          }`}>
              <span className="text-[6px] font-black uppercase mb-0.5">{label}</span>
              <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono font-black">{isHaid ? 'HAID' : time}</span>
                  {diffLabel && (
                      <span className={`text-[7px] font-black ${type === 'masuk' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {diffLabel}m
                      </span>
                  )}
              </div>
          </div>
      );
  };

  return (
    <Layout title={isStudent ? "Presensi Saya" : "Riwayat Kelas"} subtitle="Auto-Calculation Engine" icon={CalendarIcon} onBack={onBack}>
      <div className="p-4 space-y-4 pb-32">
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] font-black outline-none shadow-inner" />
                </div>
                {!isStudent && (
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Kelas</label>
                        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] font-black outline-none appearance-none shadow-inner">
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>
            {!isStudent && <input type="text" placeholder="CARI NAMA SISWA..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] font-bold outline-none shadow-inner" />}
        </div>

        <div className="space-y-3">
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Database...</p>
                </div>
            ) : displayData.length > 0 ? displayData.map((s: any) => (
                <div key={s.id} className="bg-white dark:bg-[#151E32] p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-xs text-indigo-600 border border-indigo-100 dark:border-indigo-800">{(s.namaLengkap || '?').charAt(0)}</div>
                            <div className="min-w-0"><h4 className="font-black text-[10px] uppercase truncate text-slate-800 dark:text-slate-200">{s.namaLengkap}</h4><p className="text-[8px] font-bold text-slate-400">ID: {s.idUnik}</p></div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.att?.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : s.att?.status === 'Haid' ? 'bg-pink-50 text-pink-600' : 'bg-rose-50 text-rose-600'}`}>{s.att?.status || 'Alpha'}</span>
                    </div>
                    <div className="flex gap-1.5">
                        <SessionStatus label="MSK" timeRaw={s.att?.checkIn} type="masuk" />
                        <SessionStatus label="DHA" timeRaw={s.att?.duha} type="ibadah" />
                        <SessionStatus label="ZHR" timeRaw={s.att?.zuhur} type="ibadah" />
                        <SessionStatus label="ASR" timeRaw={s.att?.ashar} type="ibadah" />
                        <SessionStatus label="PLG" timeRaw={s.att?.checkOut} type="pulang" />
                    </div>
                </div>
            )) : (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <UsersIcon className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Data</p>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceHistory;
