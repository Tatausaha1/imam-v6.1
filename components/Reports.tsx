
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, Search, 
  CalendarIcon, ArrowDownTrayIcon, BuildingLibraryIcon, ChevronDownIcon, UsersIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { Student, UserRole, ViewState, ClassData } from '../types';
import { toast } from 'sonner';

const Reports: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>(localStorage.getItem('imam_pending_report_class') || '');
    const [filterNama, setFilterNama] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const LIMITS = { masuk: "07:30", pulang: "16:00" };

    useEffect(() => {
        const loadClasses = async () => {
            if (db || isMockMode) {
                let classesData: ClassData[] = isMockMode ? [{ id: '1', name: 'XII IPA 1', level: '12', academicYear: '2025' }] : [];
                if (!isMockMode) {
                    const cSnap = await db!.collection('classes').get();
                    classesData = cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData));
                }
                setClasses(classesData);
                if (!selectedClassFilter && classesData.length > 0) setSelectedClassFilter(classesData[0].name);
            }
        };
        loadClasses();
        return () => { localStorage.removeItem('imam_pending_report_class'); };
    }, []);

    useEffect(() => {
        if (!selectedClassFilter) return;
        setLoading(true);
        const load = async () => {
            try {
                if (isMockMode) {
                    await new Promise(r => setTimeout(r, 600));
                    setStudents([{ id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: selectedClassFilter, status: 'Aktif', idUnik: '25002', nisn: '0086806447', jenisKelamin: 'Perempuan', isClaimed: true } as any]);
                    setAttendanceRecords([{ studentId: 's1', checkIn: '07:35', checkOut: '15:55', status: 'Hadir' }]);
                    return;
                }
                const [sSnap, aSnap] = await Promise.all([
                    db!.collection('students').where('status', '==', 'Aktif').where('tingkatRombel', '==', selectedClassFilter).get(), 
                    db!.collection('attendance').where('date', '==', selectedDate).get()
                ]);
                setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                const studentIds = new Set(sSnap.docs.map(d => d.id));
                setAttendanceRecords(aSnap.docs.map(d => d.data()).filter((att: any) => studentIds.has(att.studentId)));
            } finally { setLoading(false); }
        };
        load();
    }, [selectedDate, selectedClassFilter]);

    const calculateDiff = (timeStr: string | null, limitStr: string, type: 'masuk' | 'pulang') => {
        if (!timeStr) return null;
        const cleanTime = timeStr.split(' | ')[0];
        const [h, m] = cleanTime.split(':').map(Number);
        const [lh, lm] = limitStr.split(':').map(Number);
        const diff = (h * 60 + m) - (lh * 60 + lm);
        if (type === 'masuk' && diff > 0) return <span className="text-[7px] font-black text-amber-500 block">+{diff}m</span>;
        if (type === 'pulang' && diff < 0) return <span className="text-[7px] font-black text-rose-500 block">{diff}m</span>;
        return null;
    };

    const displayData = useMemo(() => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        return students.filter(s => {
            const q = filterNama.toLowerCase().trim();
            return q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q);
        }).map(s => ({ ...s, att: attMap.get(s.id!) || { status: 'Alpha' } }));
    }, [students, attendanceRecords, filterNama]);

    const TimeCell = ({ rawValue, type }: { rawValue: string | null, type: 'masuk' | 'pulang' }) => {
        const isHaid = String(rawValue || '').includes('| H');
        const time = rawValue ? rawValue.split(' | ')[0].substring(0, 5) : '--:--';
        return (
            <td className="px-2 py-4 text-center font-mono">
                <span className={`text-[10px] font-black ${isHaid ? 'text-rose-400' : 'text-slate-400'}`}>
                    {isHaid ? 'HAID' : time}
                </span>
                {!isHaid && type === 'masuk' && calculateDiff(rawValue, LIMITS.masuk, 'masuk')}
                {!isHaid && type === 'pulang' && calculateDiff(rawValue, LIMITS.pulang, 'pulang')}
            </td>
        );
    };

    return (
        <Layout title="Laporan Kelas" subtitle={selectedClassFilter ? `Monitor Rombel ${selectedClassFilter}` : "Memuat..."} icon={ChartBarIcon} onBack={onBack} actions={<button className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg active:scale-90 transition-all"><ArrowDownTrayIcon className="w-5 h-5" /></button>}>
            <div className="p-4 lg:p-6 space-y-5 pb-32">
                <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] shadow-sm space-y-4 border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none" />
                        </div>
                        <div className="relative">
                            <BuildingLibraryIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none appearance-none cursor-pointer">
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input type="text" placeholder="CARI NAMA SISWA..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-bold outline-none shadow-inner" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0B1121] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-5 w-12 text-center">#</th>
                                    <th className="px-4 py-5 min-w-[160px]">Siswa</th>
                                    <th className="px-2 py-5 text-center">Masuk</th>
                                    <th className="px-2 py-5 text-center">Pulang</th>
                                    <th className="px-6 py-5 text-center w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                                ) : displayData.length > 0 ? (
                                    displayData.map((s, i) => (
                                        <tr key={s.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-center text-slate-400 font-bold">{i + 1}</td>
                                            <td className="px-4 py-4"><div className="flex flex-col"><span className="font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">{s.namaLengkap}</span><span className="text-[8px] font-mono text-indigo-500">ID: {s.idUnik}</span></div></td>
                                            <TimeCell rawValue={s.att.checkIn} type="masuk" />
                                            <TimeCell rawValue={s.att.checkOut} type="pulang" />
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    s.att.status === 'Alpha' ? 'bg-rose-50 text-rose-600' : 
                                                    s.att.status === 'Haid' ? 'bg-pink-50 text-pink-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {s.att.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
                                            <UsersIcon className="w-12 h-12" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data di rombel ini</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Reports;
