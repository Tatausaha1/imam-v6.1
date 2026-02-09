/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, Search, 
  CalendarIcon, XCircleIcon,
  Squares2x2Icon,
  ClockIcon,
  ArrowDownTrayIcon, BuildingLibraryIcon, UsersIcon,
  ArrowRightIcon, XMarkIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import format from 'date-fns/format';
import { id as localeID } from 'date-fns/locale/id'; 
import { Student, UserRole, ViewState, ClassData } from '../types';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// Helper function to parse time and meta metadata
const parseTimeWithMeta = (rawTime: string | null) => {
    if (!rawTime) return { time: '--:--', meta: null };
    const parts = String(rawTime).split(' | ');
    const time = parts[0].substring(0, 5); 
    const meta = parts[1] || null;
    return { time, meta };
};

interface ReportsProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
    userRole: UserRole;
}

const Reports: React.FC<ReportsProps> = ({ onBack, onNavigate, userRole }) => {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
    const [filterNama, setFilterNama] = useState('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDetailView, setIsDetailView] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showSearchInput, setShowSearchInput] = useState(false);

    useEffect(() => {
        const pendingClass = localStorage.getItem('imam_pending_report_class');
        if (pendingClass) {
            setSelectedClassFilter(pendingClass);
            localStorage.removeItem('imam_pending_report_class');
        }
    }, []);

    useEffect(() => {
        const loadBase = async () => {
            setLoading(true);
            if (isMockMode) {
                setAllStudents([
                  { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan' } as any,
                  { id: '2', namaLengkap: 'AHMAD ZAKI', idUnik: '25003', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Laki-laki' } as any,
                  { id: '3', namaLengkap: 'BUDI PRATAMA', idUnik: '25004', tingkatRombel: '11 B', status: 'Aktif', jenisKelamin: 'Laki-laki' } as any,
                  { id: '4', namaLengkap: 'CINDY CLAUDIA', idUnik: '25005', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan' } as any
                ]);
                setClasses([{ name: '10 A', teacherName: 'ALFI SYAHRIN S.SOS', level: '10', academicYear: '2024/2025' }]);
                setLoading(false); return;
            }
            if (db) {
                try {
                    const [sSnap, cSnap] = await Promise.all([
                        db.collection('students').where('status', '==', 'Aktif').get(),
                        db.collection('classes').get()
                    ]);
                    setAllStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                    setClasses(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassData)));
                } catch (e) { console.error(e); } finally { setLoading(false); }
            }
        };
        loadBase();
    }, []);

    useEffect(() => {
        if (!db && !isMockMode) return;
        setLoading(true);
        const unsub = isMockMode ? () => {} : db!.collection('attendance').where('date', '==', selectedDate).onSnapshot(
            snap => {
                setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            },
            err => {
                console.warn("Firestore: Gagal memuat laporan kehadiran.", err.message);
                setLoading(false);
            }
        );
        if (isMockMode) {
            setAttendanceRecords([
                { studentId: '1', status: 'Hadir', checkIn: '07:12:05', duha: '08:05:00', zuhur: '12:30:00', ashar: '15:45:00', checkOut: '16:05:00' },
                { studentId: '2', status: 'Terlambat', checkIn: '07:39:21 | +9', duha: '08:15:00', zuhur: '12:35:00', ashar: null, checkOut: null },
                { studentId: '4', status: 'Haid', checkIn: null, duha: '08:10:00 | H', zuhur: '12:30:00 | H', ashar: '15:40:00 | H', checkOut: '15:55:00 | -5' }
            ]);
            setLoading(false);
        }
        return () => unsub();
    }, [selectedDate]);

    const stats = useMemo(() => {
        const filtered = allStudents.filter(s => selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter);
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        let hadir = 0, izin = 0, sakit = 0, alpha = 0;
        filtered.forEach(s => {
            const att = attMap.get(s.id!);
            const status = att?.status || 'Alpha';
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

    const generatePDF = (targetData: any[], scopeLabel: string) => {
        if (targetData.length === 0) {
            toast.error("Tidak ada data untuk dicetak.");
            return;
        }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const dateStr = format(new Date(selectedDate), "dd MMMM yyyy", { locale: localeID }).toUpperCase();
        renderClassPage(doc, targetData, scopeLabel.replace('KELAS ', ''), dateStr, true);
        doc.save(`LAPORAN_${scopeLabel.replace(/\s+/g, '_')}_${selectedDate}.pdf`);
        toast.success(`PDF ${scopeLabel} berhasil diunduh.`);
        setShowExportModal(false);
    };

    const handleExportAllRombel = () => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        const grouped: Record<string, any[]> = {};
        allStudents.forEach(s => {
            const className = s.tingkatRombel || 'TANPA KELAS';
            if (!grouped[className]) grouped[className] = [];
            const att = attMap.get(s.id!) || { status: 'Alpha', checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null };
            grouped[className].push({ ...s, att });
        });
        const classNames = Object.keys(grouped).sort();
        if (classNames.length === 0) { toast.error("Tidak ada data rombel."); return; }
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const dateStr = format(new Date(selectedDate), "dd MMMM yyyy", { locale: localeID }).toUpperCase();
        classNames.forEach((className, idx) => {
            renderClassPage(doc, grouped[className], className, dateStr, idx === 0);
        });
        doc.save(`LAPORAN_SELURUH_ROMBEL_${selectedDate}.pdf`);
        toast.success(`Berhasil mengunduh laporan ${classNames.length} rombel.`);
        setShowExportModal(false);
    };

    const renderClassPage = (doc: jsPDF, studentList: any[], className: string, dateStr: string, isFirstPage: boolean) => {
        if (!isFirstPage) doc.addPage();
        const classInfo = classes.find(c => c.name === className);
        const waliName = (classInfo?.teacherName || 'BELUM DIATUR').toUpperCase();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("LAPORAN HARIAN KEHADIRAN & IBADAH SISWA", 15, 15);
        doc.text("MAN 1 HULU SUNGAI TENGAH", 15, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`TANGGAL : ${dateStr} | KELAS : ${className.toUpperCase()}`, 15, 26);
        doc.text(`WALI KELAS : ${waliName}`, 15, 30);
        doc.setLineWidth(0.2);
        doc.line(15, 32, 195, 32);
        const tableRows = studentList.map((s, idx) => {
            const m = parseTimeWithMeta(s.att.checkIn);
            const d = parseTimeWithMeta(s.att.duha);
            const z = parseTimeWithMeta(s.att.zuhur);
            const a = parseTimeWithMeta(s.att.ashar);
            const p = parseTimeWithMeta(s.att.checkOut);
            const formatVal = (parsed: any) => parsed.meta ? `${parsed.time} (${parsed.meta})` : (parsed.time === '--:--' ? '' : parsed.time);
            return [idx + 1, s.namaLengkap.toUpperCase(), s.jenisKelamin === 'Laki-laki' ? 'L' : 'P', formatVal(m), formatVal(d), formatVal(z), formatVal(a), formatVal(p), s.att.status.toUpperCase()];
        });
        autoTable(doc, {
            startY: 35,
            head: [['NO', 'NAMA LENGKAP SISWA', 'JK', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'KET']],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 0.8 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' }
        });
    };

    return (
        <Layout 
            title="Laporan Presensi" 
            subtitle={selectedClassFilter === 'All' ? 'Monitoring Madrasah' : `Log Unit ${selectedClassFilter}`} 
            icon={ChartBarIcon} 
            onBack={onBack}
            actions={
                <div className="flex gap-1.5">
                    <button 
                        onClick={() => setIsDetailView(!isDetailView)} 
                        className={`p-2 rounded-xl border transition-all active:scale-90 shadow-sm ${isDetailView ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                    >
                        {isDetailView ? <Squares2x2Icon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={() => setShowExportModal(true)}
                        className="p-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 active:scale-95 shadow-lg border border-white/10"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] animate-in fade-in duration-500 overflow-hidden">
                
                {/* --- ULTRA COMPACT UNIFIED SINGLE ROW BAR --- */}
                <div className="px-4 mb-4">
                    <div className="bg-white dark:bg-[#0B1121] rounded-[1.2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-2 flex items-center gap-3">
                        
                        {/* Stats Row - Always visible on larger screens, hidden when search expanded on mobile */}
                        <div className={`flex items-center gap-1 shrink-0 ${showSearchInput ? 'hidden xs:flex' : 'flex'}`}>
                            <CompactStatNoIcon val={stats.hadir} label="H" color="text-emerald-600" bg="bg-emerald-50" />
                            <CompactStatNoIcon val={stats.izin} label="I" color="text-blue-600" bg="bg-blue-50" />
                            <CompactStatNoIcon val={stats.sakit} label="S" color="text-amber-600" bg="bg-amber-50" />
                            <CompactStatNoIcon val={stats.alpha} label="A" color="text-rose-600" bg="bg-rose-50" />
                        </div>

                        {/* Navigation Row - Toggles between Date Picker and Search Input */}
                        <div className="flex flex-1 items-center gap-2">
                            {!showSearchInput ? (
                                <>
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 opacity-50" />
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={e => setSelectedDate(e.target.value)} 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-7 pr-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-white" 
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setShowSearchInput(true)}
                                        className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-800 active:scale-90 transition-all"
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center gap-1.5 animate-in slide-in-from-right-2 duration-200">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500" />
                                        <input 
                                            autoFocus
                                            type="text" 
                                            placeholder="CARI NAMA / ID..." 
                                            value={filterNama} 
                                            onChange={e => setFilterNama(e.target.value)} 
                                            className="w-full bg-indigo-50/30 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg py-2 pl-7 pr-2 text-[9px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-800 dark:text-white transition-all shadow-inner" 
                                        />
                                    </div>
                                    <button 
                                        onClick={() => { setShowSearchInput(false); setFilterNama(''); }}
                                        className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-rose-500 border border-slate-200 dark:border-slate-800 active:scale-90 transition-all"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- DATA TABLE --- */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-20" /></div>
                    ) : (
                        <div className="flex-1 overflow-auto custom-scrollbar px-4 pb-6">
                            <div className="bg-white dark:bg-[#0B1121] rounded-[1.2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                                <table className="w-full border-collapse table-fixed min-w-[300px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="w-8 py-4 border-r border-slate-100 dark:border-slate-800 text-center">#</th>
                                            <th className="w-32 px-4 py-4 text-left border-r border-slate-100 dark:border-slate-800 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 uppercase">Siswa</th>
                                            {isDetailView ? (
                                                <>
                                                    <th className="w-12 py-4 text-center border-r border-slate-100 dark:border-slate-800">MSK</th>
                                                    <th className="w-12 py-4 text-center border-r border-slate-100 dark:border-slate-800">DHA</th>
                                                    <th className="w-12 py-4 text-center border-r border-slate-100 dark:border-slate-800">ZHR</th>
                                                    <th className="w-12 py-4 text-center border-r border-slate-100 dark:border-slate-800">ASR</th>
                                                    <th className="w-12 py-4 text-center">PLG</th>
                                                </>
                                            ) : (
                                                <th className="py-4 text-center">STATUS SESI</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {displayData.length > 0 ? displayData.map((s, idx) => (
                                            <tr key={s.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/5 transition-colors group">
                                                <td className="py-3 text-center text-[9px] font-black text-slate-300 border-r border-slate-50 dark:border-slate-800">{idx + 1}</td>
                                                <td className="px-4 py-3 border-r border-slate-50 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#0B1121] shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
                                                    <div className="flex flex-col min-w-0">
                                                        <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate uppercase leading-tight group-hover:text-indigo-600">{s.namaLengkap}</h4>
                                                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{s.tingkatRombel}</p>
                                                    </div>
                                                </td>
                                                
                                                {isDetailView ? (
                                                    <>
                                                        <TimeCell rawTime={s.att.checkIn} />
                                                        <TimeCell rawTime={s.att.duha} />
                                                        <TimeCell rawTime={s.att.zuhur} />
                                                        <TimeCell rawTime={s.att.ashar} />
                                                        <TimeCell rawTime={s.att.checkOut} />
                                                    </>
                                                ) : (
                                                    <td className="px-2 py-3">
                                                        <div className="flex justify-center gap-1.5">
                                                            <StatusDot rawTime={s.att.checkIn} label="M" />
                                                            <StatusDot rawTime={s.att.duha} label="D" />
                                                            <StatusDot rawTime={s.att.zuhur} label="Z" />
                                                            <StatusDot rawTime={s.att.ashar} label="A" />
                                                            <StatusDot rawTime={s.att.checkOut} label="P" />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={isDetailView ? 7 : 3} className="py-16 text-center opacity-30">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Data Kosong</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL EKSPOR --- */}
            {showExportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Ekspor Dokumen</h3>
                                <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">Pilih Lingkup Laporan PDF</p>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><XCircleIcon className="w-8 h-8" /></button>
                        </div>
                        <div className="space-y-4">
                            <ExportOption 
                                icon={UsersIcon} 
                                label="Unit Rombel Aktif" 
                                sub={`Unit: ${selectedClassFilter}`} 
                                onClick={() => generatePDF(displayData, selectedClassFilter === 'All' ? 'Seluruh Madrasah' : `KELAS ${selectedClassFilter}`)} 
                            />
                            <ExportOption 
                                icon={BuildingLibraryIcon} 
                                label="Seluruh Madrasah" 
                                sub="Semua rombel aktif" 
                                color="indigo"
                                onClick={handleExportAllRombel} 
                            />
                        </div>
                        <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest mt-8">IMAM Document Engine v6.2</p>
                    </div>
                </div>
            )}
        </Layout>
    );
};

const CompactStatNoIcon = ({ val, label, color, bg }: any) => (
    <div className={`flex flex-col items-center justify-center min-w-[32px] py-1 px-1 rounded-lg border border-slate-100 dark:border-slate-800 ${bg} dark:bg-opacity-5`}>
        <p className={`text-[10px] font-black ${color} leading-none`}>{val}</p>
        <p className="text-[6px] font-black text-slate-400 uppercase mt-0.5 leading-none opacity-60">{label}</p>
    </div>
);

const TimeCell = ({ rawTime }: { rawTime: string | null }) => {
    const { time, meta } = parseTimeWithMeta(rawTime);
    const isHaid = meta === 'H';
    const isLate = meta && (meta.includes('+') || meta.includes('-'));
    return (
        <td className="px-1 py-3 border-r border-slate-50 dark:border-slate-800 text-center">
            <div className={`text-[8px] font-mono font-black leading-none ${rawTime ? (isHaid ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400') : 'text-slate-200 dark:text-slate-800'}`}>{time}</div>
            {meta && <div className={`text-[6px] font-black uppercase mt-1 leading-none ${isLate ? 'text-rose-500' : (isHaid ? 'text-rose-600' : 'text-emerald-500')}`}>{meta}</div>}
        </td>
    );
};

const StatusDot = ({ rawTime, label }: { rawTime: string | null, label: string }) => {
    const { meta } = parseTimeWithMeta(rawTime);
    const isHaid = meta === 'H';
    const isFilled = !!rawTime;
    return (
        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-black shrink-0 transition-all ${isFilled ? (isHaid ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-800'}`}>{label}</div>
    );
};

const ExportOption = ({ icon: Icon, label, sub, onClick, color = 'slate' }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl group transition-all active:scale-[0.98] ${color === 'indigo' ? 'hover:border-indigo-500 bg-indigo-50/10' : 'hover:border-slate-300'}`}>
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700'}`}><Icon className="w-5 h-5" /></div>
            <div className="text-left">
                <p className={`text-[11px] font-black uppercase leading-none ${color === 'indigo' ? 'text-indigo-600' : 'text-slate-800 dark:text-white'}`}>{label}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">{sub}</p>
            </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 transition-colors" />
    </button>
);

export default Reports;