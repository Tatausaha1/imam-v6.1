
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, Search, PrinterIcon, 
  ChevronDownIcon, UsersIcon, 
  CalendarIcon, XCircleIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { Student, UserRole, ViewState } from '../types';

type ReportType = 'harian' | 'bulanan' | 'individu';
type SessionFilter = 'Masuk' | 'Duha' | 'Zuhur' | 'Ashar' | 'Pulang';

interface ReportsProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
    userRole: UserRole;
}

const Reports: React.FC<ReportsProps> = ({ onBack, onNavigate, userRole }) => {
    const [activeTab, setActiveTab] = useState<ReportType>('harian');
    const [selectedSession, setSelectedSession] = useState<SessionFilter>('Masuk');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
    const [filterNama, setFilterNama] = useState('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const classList = useMemo(() => {
        const classes = allStudents.map(s => s.tingkatRombel).filter((c): c is string => Boolean(c));
        return Array.from(new Set(classes)).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    }, [allStudents]);

    useEffect(() => {
        const loadBase = async () => {
            setLoading(true);
            if (isMockMode) {
                setAllStudents([
                  { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: '10 A', status: 'Aktif' } as any,
                  { id: '2', namaLengkap: 'AHMAD ZAKI', idUnik: '25003', tingkatRombel: '10 A', status: 'Aktif' } as any,
                  { id: '3', namaLengkap: 'BUDI PRATAMA', idUnik: '25004', tingkatRombel: '11 B', status: 'Aktif' } as any,
                  { id: '4', namaLengkap: 'CINDY CLAUDIA', idUnik: '25005', tingkatRombel: '10 A', status: 'Aktif' } as any
                ]);
                setLoading(false); return;
            }
            if (db) {
                try {
                    const sSnap = await db.collection('students').where('status', '==', 'Aktif').get();
                    setAllStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                } catch (e) { console.error(e); } finally { setLoading(false); }
            }
        };
        loadBase();
    }, []);

    useEffect(() => {
        if (isMockMode) {
            setAttendanceRecords([
                { studentId: '1', status: 'Hadir', checkIn: '07:12', duha: '08:05', zuhur: '12:30', ashar: '15:45', checkOut: null },
                { studentId: '2', status: 'Terlambat', checkIn: '07:39 | +9', duha: '08:15', zuhur: '12:35', ashar: null, checkOut: null },
                { studentId: '4', status: 'Haid', checkIn: null, duha: '08:10 (Haid)', zuhur: '12:30 (Haid)', ashar: '15:40 (Haid)', checkOut: '15:55 | -5' }
            ]);
            return;
        }
        if (!db) return;
        setLoading(true);
        const unsub = db.collection('attendance').where('date', '==', selectedDate).onSnapshot(snap => {
            setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [selectedDate]);

    const stats = useMemo(() => {
        const filtered = allStudents.filter(s => selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter);
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        
        let hadir = 0, izin = 0, sakit = 0, alpha = 0;
        filtered.forEach(s => {
            const att = attMap.get(s.id!);
            const status = att?.status || 'Alpha';
            // Status Terlambat & Haid dihitung Hadir di statistik ringkasan
            if (status === 'Hadir' || status === 'Terlambat' || status === 'Haid') hadir++;
            else if (status === 'Izin') izin++;
            else if (status === 'Sakit') sakit++;
            else alpha++;
        });

        return { total: filtered.length, hadir, izin, sakit, alpha };
    }, [allStudents, attendanceRecords, selectedClassFilter]);

    const displayData = useMemo(() => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        return allStudents.filter(s => {
            const q = filterNama.toLowerCase().trim();
            const matchesNama = q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').toLowerCase().includes(q);
            const matchesKelas = selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter;
            return matchesNama && matchesKelas;
        }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || '')).map(s => {
            const att = attMap.get(s.id!) || { status: 'Alpha', checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null };
            return { ...s, att };
        });
    }, [allStudents, attendanceRecords, filterNama, selectedClassFilter]);

    const sessions: SessionFilter[] = ['Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'];
    const sessionKeyMap: Record<SessionFilter, string> = {
        'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut'
    };

    const formatSessionTimeParts = (rawTime: string | null) => {
        if (!rawTime) return { time: '--:--', meta: null };
        
        let timePart = rawTime.split(' ')[0];
        let metaPart: string | null = null;

        // Ambil HH:mm
        if (timePart.includes(':')) {
            const parts = timePart.split(':');
            if (parts.length >= 2) timePart = `${parts[0]}:${parts[1]}`;
        }

        if (rawTime.includes('(Haid)')) {
            metaPart = 'haid';
        } else if (rawTime.includes('|')) {
            metaPart = rawTime.split('|')[1].trim();
        }

        return { time: timePart, meta: metaPart };
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Hadir': 
            case 'Terlambat': 
            case 'Haid':
                return 'bg-emerald-500 text-white';
            case 'Izin': return 'bg-blue-500 text-white';
            case 'Sakit': return 'bg-amber-500 text-white';
            default: return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
        }
    };

    const StatMini = ({ val, label, color }: { val: number, label: string, color: string }) => (
        <div className="flex flex-col items-center flex-1">
            <span className={`text-[12px] font-black ${color}`}>{val}</span>
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">{label}</span>
        </div>
    );

    return (
        <Layout 
            title="Laporan" 
            subtitle="Intelijen Akademik" 
            icon={ChartBarIcon} 
            onBack={onBack}
            actions={<button className="p-2 rounded-lg bg-indigo-600 text-white active:scale-95 transition-all"><PrinterIcon className="w-4 h-4" /></button>}
        >
            <div className="p-4 space-y-3 pb-40 animate-in fade-in duration-500">
                
                {/* --- HUB CARD --- */}
                <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
                    
                    {/* Header Stats */}
                    <div className="p-5 pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex flex-col">
                                <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Ringkasan Kehadiran</h2>
                                <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    {format(new Date(selectedDate), "EEEE, dd MMM yyyy", { locale: localeID })}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest block">Total Peserta</span>
                                <span className="text-lg font-black text-indigo-600 leading-none">{stats.total}</span>
                            </div>
                        </div>
                        <div className="flex bg-white dark:bg-[#0B1121] rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
                            <StatMini val={stats.hadir} label="Hadir" color="text-emerald-500" />
                            <StatMini val={stats.izin} label="Izin" color="text-blue-500" />
                            <StatMini val={stats.sakit} label="Sakit" color="text-amber-500" />
                            <StatMini val={stats.alpha} label="Alpha" color="text-rose-500" />
                        </div>
                    </div>

                    {/* Navigation & Filter Bar */}
                    <div className="px-3 pb-5 space-y-2">
                        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            {['harian', 'bulanan', 'individu'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t as ReportType)} className={`flex-1 py-1.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>{t}</button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                                <div className="relative flex-[1.2]">
                                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 pointer-events-none" />
                                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-7 pr-1 text-[8px] font-black outline-none transition-all shadow-inner uppercase" />
                                </div>
                                <div className="relative flex-1">
                                    <UsersIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 pointer-events-none" />
                                    <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-7 pr-4 text-[8px] font-black outline-none appearance-none cursor-pointer shadow-inner">
                                        <option value="All">ROMBEL</option>
                                        {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-600" />
                                <input type="text" placeholder="CARI NAMA / ID UNIK..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-[8px] font-black tracking-widest outline-none shadow-sm" />
                            </div>
                        </div>

                        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide pt-1 border-t border-slate-50 dark:border-slate-800 mt-1">
                            {sessions.map(s => (
                                <button key={s} onClick={() => setSelectedSession(s)} className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedSession === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-[#1A253D] text-slate-400 border-slate-100 dark:border-slate-800'}`}>{s}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- DATA LIST --- */}
                <div className="space-y-1.5">
                    {loading ? (
                        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 opacity-20" /></div>
                    ) : displayData.map((s) => {
                        const rawTime = s.att[sessionKeyMap[selectedSession]];
                        const { time, meta } = formatSessionTimeParts(rawTime);
                        
                        // Status 'Terlambat' atau 'Haid' ditampilkan sebagai 'Hadir'
                        const displayStatus = (s.att.status === 'Terlambat' || s.att.status === 'Haid') ? 'Hadir' : s.att.status;

                        return (
                            <div key={s.id} className="bg-white dark:bg-[#151E32] rounded-xl p-3 flex items-center justify-between border border-slate-50 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-[9px] shrink-0">{(s.namaLengkap || '?').charAt(0)}</div>
                                    <div className="min-w-0">
                                        <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tight leading-none mb-0.5">{s.namaLengkap}</h4>
                                        <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest leading-none">{s.tingkatRombel} • {s.idUnik}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className={`text-[9px] font-black font-mono leading-none ${rawTime ? 'text-indigo-600' : 'text-slate-200 dark:text-slate-800'}`}>
                                        {time}
                                        {meta && (
                                            <span className="text-rose-500 dark:text-rose-400 ml-1">
                                                | {meta}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${getStatusColor(s.att.status)}`}>
                                        {displayStatus}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!loading && displayData.length === 0 && (
                    <div className="py-16 text-center opacity-30 flex flex-col items-center gap-2">
                        <XCircleIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Data Nihil</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
