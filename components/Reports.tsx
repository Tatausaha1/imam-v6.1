
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, ArrowLeftIcon, 
  Search, RectangleStackIcon, PencilIcon, SaveIcon,
  HeartIcon, PrinterIcon, ChevronDownIcon, TrashIcon,
  FileText, UsersIcon, IdentificationIcon, UserIcon,
  CheckCircleIcon, ClockIcon, StarIcon, XCircleIcon,
  ArrowRightIcon
} from './Icons';
import { db, auth, isMockMode } from '../services/firebase';
import { format, getDaysInMonth, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { toast } from 'sonner';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Student, MadrasahData, UserRole, ClassData, AttendanceRecord, ViewState } from '../types';

// Fix: Added missing ReportView type definition to resolve "Cannot find name 'ReportView'" error
type ReportView = 'daily' | 'monthly' | 'individual';

interface ReportsProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
    userRole: UserRole;
}

const Reports: React.FC<ReportsProps> = ({ onBack, onNavigate, userRole }) => {
    const [activeView, setActiveView] = useState<ReportView>('daily');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
    
    // State untuk Laporan Individu
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    const [filterNama, setFilterNama] = useState('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);
    const [classesData, setClassesData] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);

    const classList = useMemo(() => {
        const classes = allStudents.map(s => s.tingkatRombel).filter((c): c is string => Boolean(c));
        return Array.from(new Set(classes)).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    }, [allStudents]);

    // Deteksi konteks asal (Jika datang dari halaman kelas tertentu)
    useEffect(() => {
        const pendingClass = localStorage.getItem('imam_pending_report_class');
        const pendingView = localStorage.getItem('imam_pending_report_view');
        
        if (pendingClass) {
            setSelectedClassFilter(pendingClass);
        }
        
        if (pendingView === 'daily') setActiveView('daily');
        else if (pendingView === 'monthly') setActiveView('monthly');
        
        localStorage.removeItem('imam_pending_report_view');
    }, []);

    useEffect(() => {
        const loadBase = async () => {
            setLoading(true);
            if (isMockMode) {
                setAllStudents([
                    { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', nisn: '0086806440', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan' } as any,
                    { id: '2', namaLengkap: 'BUDI SANTOSO', idUnik: '25003', nisn: '0086806441', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Laki-laki' } as any,
                    { id: '3', namaLengkap: 'ZAHRATUNNISA', idUnik: '25353', nisn: '0086806442', tingkatRombel: '11 B', status: 'Aktif', jenisKelamin: 'Perempuan' } as any
                ]);
                setLoading(false);
                return;
            }
            if (db) {
                try {
                    const [sSnap, iSnap, cSnap] = await Promise.all([
                        db.collection('students').where('status', '==', 'Aktif').get(),
                        db.collection('settings').doc('madrasahInfo').get(),
                        db.collection('classes').get()
                    ]);
                    setAllStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                    if (iSnap.exists) setMadrasahInfo(iSnap.data() as MadrasahData);
                    setClassesData(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadBase();
    }, []);

    useEffect(() => {
        if (!db || isMockMode) return;
        
        let unsub;
        if (activeView === 'daily') {
            unsub = db.collection('attendance').where('date', '==', selectedDate).onSnapshot(snap => {
                setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        } else {
            const startStr = `${selectedMonth}-01`;
            const endStr = `${selectedMonth}-31`;
            unsub = db.collection('attendance')
                .where('date', '>=', startStr)
                .where('date', '<=', endStr)
                .onSnapshot(snap => {
                    setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
        }
        return () => unsub && unsub();
    }, [selectedDate, selectedMonth, activeView]);

    const formatTimeDisplay = (val: string | null) => {
        if (!val) return '-';
        return String(val).split('|')[0].trim().substring(0, 5);
    };

    const filteredStudents = useMemo(() => {
        return allStudents.filter(s => {
            const matchesNama = filterNama === '' || (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase());
            const matchesKelas = selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter;
            return matchesNama && matchesKelas;
        }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
    }, [allStudents, filterNama, selectedClassFilter]);

    const displayDailyData = useMemo(() => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        return filteredStudents.map(s => ({
            ...s,
            att: attMap.get(s.id!) || {
                status: 'Alpha',
                checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null
            }
        }));
    }, [filteredStudents, attendanceRecords]);

    // Data Rekap Bulanan (Grid)
    const monthlyGridData = useMemo(() => {
        if (activeView !== 'monthly') return [];
        
        const yearMonth = selectedMonth.split('-');
        const dateObj = new Date(parseInt(yearMonth[0]), parseInt(yearMonth[1]) - 1, 1);
        const daysCount = getDaysInMonth(dateObj);
        const days = Array.from({ length: daysCount }, (_, i) => i + 1);

        return filteredStudents.map(s => {
            const studentRecords = attendanceRecords.filter(r => r.studentId === s.id);
            const dailyStatus: Record<number, string> = {};
            
            let h = 0, sCount = 0, i = 0, a = 0;

            days.forEach(day => {
                const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                const record = studentRecords.find(r => r.date === dateStr);
                
                if (record) {
                    const st = record.status;
                    if (st === 'Hadir' || st === 'Terlambat') { dailyStatus[day] = 'H'; h++; }
                    else if (st === 'Sakit') { dailyStatus[day] = 'S'; sCount++; }
                    else if (st === 'Izin') { dailyStatus[day] = 'I'; i++; }
                    else if (st === 'Haid') { dailyStatus[day] = 'Hd'; h++; }
                    else { dailyStatus[day] = 'A'; a++; }
                } else {
                    dailyStatus[day] = '-';
                }
            });

            return {
                ...s,
                dailyStatus,
                stats: { h, s: sCount, i, a }
            };
        });
    }, [filteredStudents, attendanceRecords, selectedMonth, activeView]);

    const studentReportData = useMemo(() => {
        if (!selectedStudentId) return null;
        const student = allStudents.find(s => s.id === selectedStudentId);
        if (!student) return null;

        const records = attendanceRecords.filter(r => r.studentId === selectedStudentId);
        const stats = {
            hadir: records.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length,
            sakit: records.filter(r => r.status === 'Sakit').length,
            izin: records.filter(r => r.status === 'Izin').length,
            alpha: records.filter(r => r.status === 'Alpha').length,
            total: records.length
        };

        return { student, records: records.sort((a,b) => b.date.localeCompare(a.date)), stats };
    }, [selectedStudentId, allStudents, attendanceRecords]);

    const handleDownloadMonthlyPDF = () => {
        if (selectedClassFilter === 'All') { toast.warning("Pilih kelas terlebih dahulu."); return; }
        toast.info("Fitur cetak sedang disiapkan oleh sistem.");
    };

    const HeaderActions = () => (
        <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                <button onClick={() => { setActiveView('daily'); setSelectedStudentId(null); }} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${activeView === 'daily' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Harian</button>
                <button onClick={() => { setActiveView('monthly'); setSelectedStudentId(null); }} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${activeView === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Bulanan</button>
                <button onClick={() => { setActiveView('individual'); setSelectedStudentId(null); }} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${activeView === 'individual' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Siswa</button>
            </div>
            <button onClick={handleDownloadMonthlyPDF} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-90 border border-indigo-500"><PrinterIcon className="w-4 h-4" /></button>
        </div>
    );

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'H': return 'text-emerald-600 font-black';
            case 'S': return 'text-amber-500 font-black';
            case 'I': return 'text-blue-500 font-black';
            case 'A': return 'text-rose-500 font-black';
            case 'Hd': return 'text-rose-400 font-black';
            default: return 'text-slate-300';
        }
    };

    return (
        <Layout 
            title={activeView === 'daily' ? "Laporan Harian" : activeView === 'monthly' ? "Rekap Bulanan" : "Laporan Individu"} 
            subtitle="Pusat Dokumentasi" 
            icon={RectangleStackIcon} 
            onBack={onBack}
            actions={<HeaderActions />}
        >
            <div className="p-3 lg:p-6 pb-32 max-w-[1600px] mx-auto space-y-4">
                
                {activeView === 'individual' && selectedStudentId ? (
                    /* --- DETAIL LAPORAN INDIVIDU --- */
                    <div className="max-w-2xl mx-auto space-y-4 animate-in zoom-in duration-300">
                        <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                            <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white relative">
                                <button onClick={() => setSelectedStudentId(null)} className="absolute top-6 left-6 p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10 active:scale-90 transition-all"><ArrowLeftIcon className="w-4 h-4" /></button>
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20 shadow-2xl relative">
                                        <UserIcon className="w-12 h-12" />
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#151E32] flex items-center justify-center"><CheckCircleIcon className="w-4 h-4" /></div>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tight leading-none">{studentReportData?.student.namaLengkap}</h2>
                                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.3em] mt-2">ID LOKAL: {studentReportData?.student.idUnik} • KELAS: {studentReportData?.student.tingkatRombel}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 grid grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-center p-3 bg-white dark:bg-[#151E32] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[14px] font-black text-indigo-600">{studentReportData?.stats.hadir}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Hadir</p>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-[#151E32] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[14px] font-black text-amber-600">{studentReportData?.stats.sakit}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Sakit</p>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-[#151E32] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[14px] font-black text-blue-600">{studentReportData?.stats.izin}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Izin</p>
                                </div>
                                <div className="text-center p-3 bg-white dark:bg-[#151E32] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[14px] font-black text-rose-600">{studentReportData?.stats.alpha}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Alpha</p>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ClockIcon className="w-4 h-4 text-indigo-500" /> Log Sesi Terakhir</h3>
                                <div className="space-y-3">
                                    {/* Fix: Added explicit any casting to attendance records (r) to resolve TypeScript unknown type errors during mapping */}
                                    {studentReportData?.records.slice(0, 10).map((r: any, i) => (
                                        <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{format(new Date(r.date), 'EEEE, dd MMM yyyy', { locale: localeID })}</p>
                                                <span className={`px-1.5 py-0.5 rounded uppercase ${r.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.status}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {['checkIn', 'duha', 'zuhur', 'ashar', 'checkOut'].map(s => (
                                                    /* Fix: Indexing on any type record 'r' resolves potential unknown member access errors */
                                                    <div key={s} className={`flex-1 p-2 rounded-xl border text-center ${r[s] ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 opacity-30 text-slate-300'}`}>
                                                        <p className="text-[6px] font-black uppercase mb-1">{s === 'checkIn' ? 'MSK' : s === 'checkOut' ? 'PLG' : s.toUpperCase().substring(0,3)}</p>
                                                        <p className="text-[9px] font-mono font-black">{formatTimeDisplay(r[s])}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- VIEW UTAMA: DAILY / MONTHLY / SISWA LIST --- */
                    <div className="space-y-4 animate-in fade-in duration-500">
                        {/* GLOBAL FILTERS */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#151E32] p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedClassFilter !== 'All' && (
                                    <button 
                                        onClick={() => onNavigate(ViewState.CLASSES)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-800 shadow-sm active:scale-95 transition-all"
                                    >
                                        <ArrowLeftIcon className="w-3.5 h-3.5" /> Panel Kelas
                                    </button>
                                )}

                                {activeView === 'daily' && (
                                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none" />
                                )}
                                {activeView === 'monthly' && (
                                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none" />
                                )}
                                <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none cursor-pointer">
                                    <option value="All">Semua Rombel</option>
                                    {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                </select>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input type="text" placeholder="Cari nama..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-bold outline-none" />
                            </div>
                        </div>

                        {/* DATA DISPLAY */}
                        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                {activeView === 'daily' ? (
                                    <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b">
                                            <tr className="text-[8px] font-black text-slate-500 uppercase">
                                                <th className="w-10 px-2 py-3 text-center">#</th>
                                                <th className="w-[200px] px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 border-r">Nama Lengkap</th>
                                                <th className="w-20 px-1 py-3 text-center border-r">MSK</th>
                                                <th className="w-16 px-1 py-3 text-center border-r">DHA</th>
                                                <th className="w-16 px-1 py-3 text-center border-r">ZHR</th>
                                                <th className="w-16 px-1 py-3 text-center border-r">ASR</th>
                                                <th className="w-20 px-1 py-3 text-center border-r">PLG</th>
                                                <th className="w-24 px-1 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loading ? <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr> : 
                                            displayDailyData.map((s, idx) => (
                                                <tr key={s.id} className="text-[9px] hover:bg-slate-50 transition-colors">
                                                    <td className="px-2 py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                                    <td className="px-4 py-3 border-r sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-700 dark:text-slate-200 uppercase truncate z-10">{s.namaLengkap}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono">{formatTimeDisplay(s.att.checkIn)}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono">{formatTimeDisplay(s.att.duha)}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono">{formatTimeDisplay(s.att.zuhur)}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono">{formatTimeDisplay(s.att.ashar)}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono">{formatTimeDisplay(s.att.checkOut)}</td>
                                                    <td className="px-1 py-3 text-center"><span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${s.att.status === 'Hadir' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{s.att.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : activeView === 'monthly' ? (
                                    /* --- TABEL GRID BULANAN --- */
                                    <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b">
                                            <tr className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                                                <th className="w-8 px-1 py-3 text-center border-r border-slate-200 dark:border-slate-800">#</th>
                                                <th className="w-[180px] px-3 py-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-900 z-30">Nama Lengkap</th>
                                                {/* Tanggal 1 - 31 */}
                                                {Array.from({ length: getDaysInMonth(parseISO(`${selectedMonth}-01`)) }, (_, i) => (
                                                    <th key={i} className="w-7 text-center border-r border-slate-100 dark:border-slate-800/50">{i + 1}</th>
                                                ))}
                                                {/* Summary Totals */}
                                                <th className="w-10 text-center border-l-2 border-slate-200 dark:border-slate-800 text-emerald-600 bg-slate-50/50">H</th>
                                                <th className="w-10 text-center border-l border-slate-100 dark:border-slate-800 text-amber-500 bg-slate-50/50">S</th>
                                                <th className="w-10 text-center border-l border-slate-100 dark:border-slate-800 text-blue-500 bg-slate-50/50">I</th>
                                                <th className="w-10 text-center border-l border-slate-100 dark:border-slate-800 text-rose-500 bg-slate-50/50">A</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loading ? <tr><td colSpan={40} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr> : 
                                            monthlyGridData.map((s, idx) => (
                                                <tr key={s.id} className="text-[8px] hover:bg-slate-50 transition-colors">
                                                    <td className="px-1 py-2 text-center text-slate-400 font-bold border-r border-slate-100 dark:border-slate-800/50">{idx + 1}</td>
                                                    <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-700 dark:text-slate-200 uppercase truncate z-10">{s.namaLengkap}</td>
                                                    {Object.entries(s.dailyStatus).map(([day, status]) => (
                                                        <td key={day} className={`text-center border-r border-slate-100 dark:border-slate-800/20 ${getStatusColor(status)}`}>
                                                            {status === '-' ? '' : status}
                                                        </td>
                                                    ))}
                                                    <td className="text-center font-black text-emerald-600 bg-emerald-50/10 border-l-2 border-slate-200 dark:border-slate-800">{s.stats.h}</td>
                                                    <td className="text-center font-black text-amber-500 bg-amber-50/10 border-l border-slate-100 dark:border-slate-800">{s.stats.s}</td>
                                                    <td className="text-center font-black text-blue-500 bg-blue-50/10 border-l border-slate-100 dark:border-slate-800">{s.stats.i}</td>
                                                    <td className="text-center font-black text-rose-500 bg-rose-50/10 border-l border-slate-100 dark:border-slate-800">{s.stats.a}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    /* TAMPILAN SISWA (LIST MENUJU INDIVIDU) */
                                    <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b">
                                            <tr className="text-[8px] font-black text-slate-500 uppercase">
                                                <th className="w-12 px-2 py-3 text-center">#</th>
                                                <th className="w-[250px] px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 border-r">Nama Lengkap</th>
                                                <th className="w-24 px-1 py-3 text-center border-r">ID Lokal</th>
                                                <th className="w-24 px-1 py-3 text-center border-r">NISN</th>
                                                <th className="w-20 px-1 py-3 text-center">JK</th>
                                                <th className="w-32 px-1 py-3 text-center">Opsi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredStudents.map((s, idx) => (
                                                <tr key={s.id} onClick={() => setSelectedStudentId(s.id!)} className="text-[9px] hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                                                    <td className="px-2 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="px-4 py-3 border-r sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-800 dark:text-slate-200 uppercase truncate z-10 group-hover:text-indigo-600">{s.namaLengkap}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                                    <td className="px-1 py-3 text-center border-r font-mono text-slate-400">{s.nisn}</td>
                                                    <td className="px-1 py-3 text-center font-bold text-slate-500">{s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                                    <td className="px-1 py-3 text-center">
                                                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">Laporan Detail <ArrowRightIcon className="w-3 h-3" /></span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
