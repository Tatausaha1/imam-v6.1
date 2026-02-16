
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
  CheckCircleIcon, ClockIcon, HeartIcon,
  ArrowDownTrayIcon, BuildingLibraryIcon, UsersIcon,
  ArrowRightIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { Student, UserRole, ViewState, ClassData } from '../types';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface ReportsProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
    userRole: UserRole;
}

const Reports: React.FC<ReportsProps> = ({ onBack, onNavigate, userRole }) => {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [reportMode, setReportMode] = useState<'harian' | 'bulanan'>('harian');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('10 A');
    const [filterNama, setFilterNama] = useState('');
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDetailView, setIsDetailView] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

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
        let isMounted = true;

        const loadAttendance = async () => {
            setLoading(true);
            if (isMockMode) {
                setAttendanceRecords([
                    { studentId: '1', date: '2026-02-16', status: 'Hadir', checkIn: '07:12:05', duha: '08:05:00', zuhur: '12:30:00', ashar: '15:45:00', checkOut: '16:05:00' },
                    { studentId: '1', date: '2026-02-17', status: 'Hadir', checkIn: '07:11:00', duha: '08:10:00', zuhur: '12:31:00', ashar: '15:40:00', checkOut: '16:01:00' },
                    { studentId: '2', date: '2026-02-16', status: 'Terlambat', checkIn: '07:39:21 | +9', duha: '08:15:00', zuhur: '12:35:00', ashar: null, checkOut: null },
                    { studentId: '4', date: '2026-02-16', status: 'Haid', checkIn: null, duha: '08:10:00 | H', zuhur: '12:30:00 | H', ashar: '15:40:00 | H', checkOut: '15:55:00 | -5' }
                ]);
                setLoading(false);
                return;
            }

            try {
                let query = db!.collection('attendance');
                if (reportMode === 'harian') {
                    query = query.where('date', '==', selectedDate);
                } else {
                    const monthStart = format(startOfMonth(parseISO(`${selectedMonth}-01`)), 'yyyy-MM-dd');
                    const monthEnd = format(endOfMonth(parseISO(`${selectedMonth}-01`)), 'yyyy-MM-dd');
                    query = query.where('date', '>=', monthStart).where('date', '<=', monthEnd);
                }
                const snap = await query.get();
                if (!isMounted) return;
                setAttendanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err: any) {
                if (isMounted) {
                    console.warn("Firestore: Gagal memuat laporan kehadiran.", err.message);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadAttendance();

        return () => {
            isMounted = false;
        };
    }, [reportMode, selectedDate, selectedMonth]);

    const monthlyAttendanceMap = useMemo(() => {
        if (reportMode !== 'bulanan') return new Map<string, any>();

        const map = new Map<string, any>();
        attendanceRecords.forEach((record) => {
            if (!record?.studentId) return;
            const current = map.get(record.studentId) || {
                studentId: record.studentId,
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0,
                checkIn: 0,
                duha: 0,
                zuhur: 0,
                ashar: 0,
                checkOut: 0,
            };

            const status = record.status || 'Alpha';
            if (status === 'Hadir' || status === 'Terlambat' || status === 'Haid') current.hadir += 1;
            else if (status === 'Izin') current.izin += 1;
            else if (status === 'Sakit') current.sakit += 1;
            else current.alpha += 1;

            if (record.checkIn) current.checkIn += 1;
            if (record.duha) current.duha += 1;
            if (record.zuhur) current.zuhur += 1;
            if (record.ashar) current.ashar += 1;
            if (record.checkOut) current.checkOut += 1;

            map.set(record.studentId, current);
        });
        return map;
    }, [attendanceRecords, reportMode]);

    const stats = useMemo(() => {
        const filtered = allStudents.filter(s => selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter);
        let hadir = 0, izin = 0, sakit = 0, alpha = 0;

        if (reportMode === 'harian') {
            const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
            filtered.forEach(s => {
                const att = attMap.get(s.id!);
                const status = att?.status || 'Alpha';
                if (status === 'Hadir' || status === 'Terlambat' || status === 'Haid') hadir++;
                else if (status === 'Izin') izin++;
                else if (status === 'Sakit') sakit++;
                else alpha++;
            });
        } else {
            filtered.forEach((s) => {
                const item = monthlyAttendanceMap.get(s.id!);
                hadir += item?.hadir || 0;
                izin += item?.izin || 0;
                sakit += item?.sakit || 0;
                alpha += item?.alpha || 0;
            });
        }

        return { total: filtered.length, hadir, izin, sakit, alpha };
    }, [allStudents, attendanceRecords, selectedClassFilter, reportMode, monthlyAttendanceMap]);

    const sessionStats = useMemo(() => {
        const filtered = allStudents.filter(s => selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter);
        const totals = { masuk: 0, duha: 0, zuhur: 0, ashar: 0, pulang: 0 };

        if (reportMode === 'harian') {
            const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
            filtered.forEach((student) => {
                const att = attMap.get(student.id!);
                if (!att) return;
                if (att.checkIn) totals.masuk++;
                if (att.duha) totals.duha++;
                if (att.zuhur) totals.zuhur++;
                if (att.ashar) totals.ashar++;
                if (att.checkOut) totals.pulang++;
            });
        } else {
            filtered.forEach((student) => {
                const item = monthlyAttendanceMap.get(student.id!);
                if (!item) return;
                totals.masuk += item.checkIn || 0;
                totals.duha += item.duha || 0;
                totals.zuhur += item.zuhur || 0;
                totals.ashar += item.ashar || 0;
                totals.pulang += item.checkOut || 0;
            });
        }

        return totals;
    }, [allStudents, attendanceRecords, selectedClassFilter, reportMode, monthlyAttendanceMap]);

    const displayData = useMemo(() => {
        const filteredStudents = allStudents.filter(s => {
            const q = filterNama.toLowerCase().trim();
            const matchesNama = q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').toLowerCase().includes(q);
            const matchesKelas = selectedClassFilter === 'All' || s.tingkatRombel === selectedClassFilter;
            return matchesNama && matchesKelas;
        }).sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

        if (reportMode === 'harian') {
            const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
            return filteredStudents.map(s => {
                const att = attMap.get(s.id!) || { status: 'Alpha', checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null };
                return { ...s, att };
            });
        }

        return filteredStudents.map((s) => {
            const item = monthlyAttendanceMap.get(s.id!) || { hadir: 0, checkIn: 0, duha: 0, zuhur: 0, ashar: 0, checkOut: 0 };
            return {
                ...s,
                att: {
                    status: item.hadir > 0 ? `${item.hadir} hari hadir` : 'Alpha',
                    checkIn: `${item.checkIn || 0}`,
                    duha: `${item.duha || 0}`,
                    zuhur: `${item.zuhur || 0}`,
                    ashar: `${item.ashar || 0}`,
                    checkOut: `${item.checkOut || 0}`,
                }
            };
        });
    }, [allStudents, attendanceRecords, filterNama, selectedClassFilter, reportMode, monthlyAttendanceMap]);

    const parseTimeWithMeta = (rawTime: string | null) => {
        if (!rawTime) return { time: '--:--', meta: null };
        const parts = String(rawTime).split(' | ');
        const time = parts[0].substring(0, 5); 
        const meta = parts[1] || null;
        return { time, meta };
    };

    // --- HELPER UNTUK RENDERING PER HALAMAN KELAS ---
    const renderClassPage = (doc: jsPDF, studentList: any[], className: string, dateStr: string, isFirstPage: boolean) => {
        if (!isFirstPage) doc.addPage();

        // Cari info wali kelas
        const classInfo = classes.find(c => c.name === className);
        const waliName = (classInfo?.teacherName || 'BELUM DIATUR').toUpperCase();
        
        // Hitung rincian gender
        const lCount = studentList.filter(s => s.jenisKelamin === 'Laki-laki').length;
        const pCount = studentList.filter(s => s.jenisKelamin === 'Perempuan').length;

        // 1. Header Presisi (Sesuai Permintaan User)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("LAPORAN HARIAN KEHADIRAN & IBADAH SISWA", 15, 15);
        doc.text("MAN 1 HULU SUNGAI TENGAH", 15, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`TANGGAL : ${dateStr}`, 15, 26);
        doc.text(`KELAS : ${className.toUpperCase()}`, 15, 30);
        doc.text(`JUMLAH : ${studentList.length} SISWA (L: ${lCount}, P: ${pCount})`, 15, 34);
        doc.text(`WALI KELAS : ${waliName}`, 15, 38);

        doc.setLineWidth(0.3);
        doc.line(15, 41, 195, 41);

        // 2. Data Tabel (Ultra Padat)
        const tableRows = studentList.map((s, idx) => {
            const m = parseTimeWithMeta(s.att.checkIn);
            const d = parseTimeWithMeta(s.att.duha);
            const z = parseTimeWithMeta(s.att.zuhur);
            const a = parseTimeWithMeta(s.att.ashar);
            const p = parseTimeWithMeta(s.att.checkOut);
            const formatVal = (parsed: any) => parsed.meta ? `${parsed.time} (${parsed.meta})` : (parsed.time === '--:--' ? '' : parsed.time);

            return [
                idx + 1,
                s.namaLengkap.toUpperCase(),
                s.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
                formatVal(m), formatVal(d), formatVal(z), formatVal(a), formatVal(p),
                s.att.status.toUpperCase()
            ];
        });

        autoTable(doc, {
            startY: 44,
            head: [['NO', 'NAMA LENGKAP SISWA', 'JK', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'KET']],
            body: tableRows,
            theme: 'grid',
            styles: { 
                fontSize: 7, 
                cellPadding: 0.8, // Super Padat
                textColor: [0, 0, 0],
                lineColor: [180, 180, 180],
                lineWidth: 0.1
            },
            headStyles: { 
                fillColor: [245, 245, 245], 
                textColor: [0, 0, 0], 
                halign: 'center', 
                fontStyle: 'bold',
                lineWidth: 0.2
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 7 },
                2: { halign: 'center', cellWidth: 7 },
                3: { halign: 'center', cellWidth: 14 },
                4: { halign: 'center', cellWidth: 14 },
                5: { halign: 'center', cellWidth: 14 },
                6: { halign: 'center', cellWidth: 14 },
                7: { halign: 'center', cellWidth: 14 },
                8: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }
            },
            margin: { left: 15, right: 15 }
        });

        // 3. Footer Tanda Tangan
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY < 270) {
            doc.setFontSize(8);
            doc.text("Ketua Kelas,", 40, finalY);
            doc.text("Wali Kelas,", 150, finalY);
            
            doc.setFont("helvetica", "bold");
            doc.text("( .................................... )", 25, finalY + 18);
            doc.text(`( ${waliName} )`, 135, finalY + 18);
        }
    };

    // --- CORE PDF GENERATOR ENGINE ---
    const generatePDF = (targetData: any[], scopeLabel: string) => {
        if (targetData.length === 0) {
            toast.error("Tidak ada data untuk dicetak.");
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const dateStr = format(new Date(selectedDate), "dd MMMM yyyy", { locale: localeID }).toUpperCase();
        
        renderClassPage(doc, targetData, scopeLabel.replace('KELAS ', ''), dateStr, true);

        const fileName = `LAPORAN_${scopeLabel.replace(/\s+/g, '_')}_${selectedDate}.pdf`;
        doc.save(fileName);
        toast.success(`PDF ${scopeLabel} berhasil diunduh.`);
        setShowExportModal(false);
    };

    // --- HANDLER CETAK SEMUA (HASIL TETAP PER KELAS) ---
    const handleExportAllRombel = () => {
        const attMap = new Map<string, any>(attendanceRecords.map(r => [r.studentId, r]));
        const sortedStudents = [...allStudents].sort((a, b) => 
            (a.tingkatRombel || '').localeCompare(b.tingkatRombel || '') || 
            (a.namaLengkap || '').localeCompare(b.namaLengkap || '')
        );

        // Grouping by Class
        const grouped: Record<string, any[]> = {};
        sortedStudents.forEach(s => {
            const className = s.tingkatRombel || 'TANPA KELAS';
            if (!grouped[className]) grouped[className] = [];
            const att = attMap.get(s.id!) || { status: 'Alpha', checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null };
            grouped[className].push({ ...s, att });
        });

        const classNames = Object.keys(grouped).sort();
        if (classNames.length === 0) {
            toast.error("Tidak ada data rombel untuk dicetak.");
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const dateStr = format(new Date(selectedDate), "dd MMMM yyyy", { locale: localeID }).toUpperCase();

        classNames.forEach((className, idx) => {
            renderClassPage(doc, grouped[className], className, dateStr, idx === 0);
        });

        doc.save(`LAPORAN_SELURUH_ROMBEL_${selectedDate}.pdf`);
        toast.success(`Berhasil mengunduh laporan ${classNames.length} rombel.`);
        setShowExportModal(false);
    };

    const TimeCell = ({ rawTime }: { rawTime: string | null }) => {
        const { time, meta } = parseTimeWithMeta(rawTime);
        const isHaid = meta === 'H';
        const isLate = meta && (meta.includes('+') || meta.includes('-'));

        return (
            <td className="px-1 py-2.5 border-r border-slate-50 dark:border-slate-800 text-center min-w-[50px]">
                <div className={`text-[8px] font-mono font-black leading-none ${rawTime ? (isHaid ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400') : 'text-slate-200 dark:text-slate-800'}`}>
                    {time}
                </div>
                {meta && (
                    <div className={`text-[6px] font-black uppercase mt-0.5 leading-none ${isLate ? 'text-rose-500' : (isHaid ? 'text-rose-600' : 'text-emerald-500')}`}>
                        {meta}
                    </div>
                )}
            </td>
        );
    };

    const classFilterOptions = useMemo(() => {
        const set = new Set<string>(classes.map(c => c.name).filter(Boolean));
        allStudents.forEach((s) => {
            if (s.tingkatRombel) set.add(s.tingkatRombel);
        });
        return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [classes, allStudents]);


    return (
        <Layout 
            title="Laporan Presensi" 
            subtitle={selectedClassFilter === 'All' ? 'Monitoring Madrasah' : `Unit Log ${selectedClassFilter}`} 
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
                
                {/* --- COMPACT STATS GRID --- */}
                <div className="px-3 py-3 grid grid-cols-4 gap-2">
                    <ReportStatCard val={stats.hadir} label="Hadir" color="text-emerald-600" bg="bg-emerald-50" icon={CheckCircleIcon} />
                    <ReportStatCard val={stats.izin} label="Izin" color="text-blue-600" bg="bg-blue-50" icon={ClockIcon} />
                    <ReportStatCard val={stats.sakit} label="Sakit" color="text-amber-600" bg="bg-amber-50" icon={HeartIcon} />
                    <ReportStatCard val={stats.alpha} label="Alpha" color="text-rose-600" bg="bg-rose-50" icon={XCircleIcon} />
                </div>

                <div className="px-3 pb-2">
                    <div className="bg-white dark:bg-[#0B1121] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Laporan 5 Sesi</p>
                        <div className="grid grid-cols-5 gap-2">
                            <SessionStatPill label="Masuk" value={sessionStats.masuk} />
                            <SessionStatPill label="Duha" value={sessionStats.duha} />
                            <SessionStatPill label="Zuhur" value={sessionStats.zuhur} />
                            <SessionStatPill label="Ashar" value={sessionStats.ashar} />
                            <SessionStatPill label="Pulang" value={sessionStats.pulang} />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Mode: {reportMode === 'harian' ? `Harian ${selectedDate}` : `Bulanan ${selectedMonth}`}</p>
                    </div>
                </div>

                {/* --- TIGHT FILTERS --- */}
                <div className="px-3 mb-3">
                    <div className="bg-white dark:bg-[#0B1121] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                                <button
                                    onClick={() => setReportMode('harian')}
                                    className={`px-3 py-2 text-[9px] font-black uppercase ${reportMode === 'harian' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}
                                >Harian</button>
                                <button
                                    onClick={() => setReportMode('bulanan')}
                                    className={`px-3 py-2 text-[9px] font-black uppercase ${reportMode === 'bulanan' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-500'}`}
                                >Bulanan</button>
                            </div>

                            <div className="relative shrink-0 min-w-[145px]">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500" />
                                <input
                                    type={reportMode === 'harian' ? 'date' : 'month'}
                                    value={reportMode === 'harian' ? selectedDate : selectedMonth}
                                    onChange={e => reportMode === 'harian' ? setSelectedDate(e.target.value) : setSelectedMonth(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 dark:text-white transition-all"
                                />
                            </div>

                            <select
                                value={selectedClassFilter}
                                onChange={e => setSelectedClassFilter(e.target.value)}
                                className="shrink-0 min-w-[110px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 dark:text-white transition-all"
                            >
                                {classFilterOptions.map((cls) => (
                                    <option key={cls} value={cls}>{cls === 'All' ? 'Semua Kelas' : cls}</option>
                                ))}
                            </select>

                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="CARI NAMA SISWA"
                                    value={filterNama}
                                    onChange={e => setFilterNama(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-800 dark:text-white transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- DENSE TABLE --- */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-20" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto custom-scrollbar px-3 pb-4">
                            <div className="bg-white dark:bg-[#0B1121] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
                                <table className="w-full border-collapse table-fixed min-w-[300px]">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                        <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="w-8 py-3 border-r border-slate-100 dark:border-slate-800 text-center">#</th>
                                            <th className="w-32 px-3 py-3 text-left border-r border-slate-100 dark:border-slate-800 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900">Nama</th>
                                            <th className="w-14 py-3 text-center border-r border-slate-100 dark:border-slate-800">checkIn</th>
                                            <th className="w-14 py-3 text-center border-r border-slate-100 dark:border-slate-800">duha</th>
                                            <th className="w-14 py-3 text-center border-r border-slate-100 dark:border-slate-800">zuhur</th>
                                            <th className="w-14 py-3 text-center border-r border-slate-100 dark:border-slate-800">ashar</th>
                                            <th className="w-14 py-3 text-center border-r border-slate-100 dark:border-slate-800">checkOut</th>
                                            <th className="w-16 py-3 text-center">KET</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {displayData.length > 0 ? displayData.map((s, idx) => (
                                            <tr key={s.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/5 transition-colors group">
                                                <td className="py-2.5 text-center text-[9px] font-black text-slate-300 border-r border-slate-50 dark:border-slate-800">{idx + 1}</td>
                                                <td className="px-3 py-2.5 border-r border-slate-50 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#0B1121] shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
                                                    <div className="flex flex-col min-w-0">
                                                        <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate uppercase leading-tight group-hover:text-indigo-600">{s.namaLengkap}</h4>
                                                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{s.tingkatRombel}</p>
                                                    </div>
                                                </td>
                                                
                                                <TimeCell rawTime={s.att.checkIn} />
                                                <TimeCell rawTime={s.att.duha} />
                                                <TimeCell rawTime={s.att.zuhur} />
                                                <TimeCell rawTime={s.att.ashar} />
                                                <TimeCell rawTime={s.att.checkOut} />
                                                <td className="px-1 py-2.5 text-center">
                                                    <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[8px] font-black uppercase text-slate-600 dark:text-slate-200">{s.att.status || 'Alpha'}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className="py-12 text-center opacity-30">
                                                    <p className="text-[8px] font-black uppercase tracking-widest">Kosong</p>
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

            {/* --- MODAL PILIHAN EKSPOR PDF --- */}
            {showExportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-white/10 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Opsi Unduh Laporan</h3>
                                <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">Format PDF (A4 Satu Lembar Per Kelas)</p>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Pilihan 1: Kelas yang dipilih */}
                            <button 
                                onClick={() => generatePDF(displayData, selectedClassFilter === 'All' ? 'Seluruh Madrasah' : `KELAS ${selectedClassFilter}`)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-indigo-500 transition-all active:scale-95"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                        <UsersIcon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">Kelas Saat Ini</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Unit: {selectedClassFilter}</p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-4 h-4 text-slate-200 group-hover:text-indigo-500 transition-colors" />
                            </button>

                            {/* Pilihan 2: Seluruh Rombel (Hasil Tetap Per Kelas) */}
                            <button 
                                onClick={handleExportAllRombel}
                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 rounded-2xl group hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                        <BuildingLibraryIcon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 group-hover:text-white uppercase leading-none">Monitoring Madrasah</p>
                                        <p className="text-[8px] font-bold text-indigo-500/60 group-hover:text-indigo-100 uppercase mt-1">Cetak Semua (Per Rombel)</p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-4 h-4 text-indigo-200 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 text-center">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">IMAM Document Engine v6.2</p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

const ReportStatCard = ({ val, label, color, bg, icon: Icon }: any) => (
    <div className={`p-2.5 rounded-2xl text-center border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#151E32] flex flex-col items-center justify-center`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${bg} dark:bg-opacity-10 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
        </div>
        <p className={`text-sm font-black ${color} tracking-tighter leading-none`}>{val}</p>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1 leading-none">{label}</p>
    </div>
);

const SessionStatPill = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-1 py-2 text-center">
        <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-[7px] mt-1 font-black uppercase tracking-tight text-slate-500">{label}</p>
    </div>
);

export default Reports;
