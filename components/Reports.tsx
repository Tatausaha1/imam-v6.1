
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, UsersGroupIcon, CheckCircleIcon, 
  CalendarIcon, BuildingLibraryIcon, ArrowRightIcon,
  FileSpreadsheet, Loader2, ChevronDownIcon,
  PrinterIcon, ClockIcon, XCircleIcon, SparklesIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Student } from '../types';

interface AttendanceRecord {
    studentId: string;
    studentName: string;
    class: string;
    date: string;
    status: string;
    checkIn: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
    checkOut: string | null;
}

const Reports: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeReport, setActiveReport] = useState<'menu' | 'attendance'>('menu');
    const [loading, setLoading] = useState(false);
    
    // Parameters
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClass, setSelectedClass] = useState<string>('All');
    
    // Data Source
    const [classes, setClasses] = useState<string[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [exportData, setExportData] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        if (isMockMode) {
            setClasses(['X IPA 1', 'X IPA 2', 'XI IPS 1', 'XII AGAMA']);
            setAllStudents([
                { id: '1', namaLengkap: 'AHMAD DAHLAN', tingkatRombel: 'X IPA 1', status: 'Aktif' } as Student,
                { id: '2', namaLengkap: 'SITI AMINAH', tingkatRombel: 'X IPA 1', status: 'Aktif' } as Student,
                { id: '3', namaLengkap: 'BUDI SANTOSO', tingkatRombel: 'X IPA 2', status: 'Aktif' } as Student,
            ]);
            return;
        }
        if (db) {
            db.collection('classes').get().then(snap => {
                setClasses(snap.docs.map(d => d.data().name).sort());
            });
            db.collection('students').where('status', '==', 'Aktif').get().then(snap => {
                setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
            });
        }
    }, []);

    useEffect(() => {
        if (activeReport !== 'attendance') return;
        
        const prepareData = async () => {
            setLoading(true);
            try {
                let attendanceRecords: AttendanceRecord[] = [];

                if (isMockMode) {
                    attendanceRecords = [
                        { studentId: '1', studentName: 'AHMAD DAHLAN', class: 'X IPA 1', date: selectedDate, status: 'Hadir', checkIn: '07:15', duha: '09:30', zuhur: '12:30', ashar: '15:45', checkOut: '16:00' },
                    ];
                } else if (db) {
                    let query = db.collection('attendance').where('date', '==', selectedDate);
                    if (selectedClass !== 'All') query = query.where('class', '==', selectedClass);
                    const snap = await query.get();
                    attendanceRecords = snap.docs.map(d => d.data() as AttendanceRecord);
                }

                const studentsInClass = allStudents.filter(s => selectedClass === 'All' || s.tingkatRombel === selectedClass);
                const attMap = new Map(attendanceRecords.map(r => [r.studentId, r]));

                const finalData = studentsInClass.map(student => {
                    const rec = attMap.get(student.id!);
                    if (rec) return rec;
                    return {
                        studentId: student.id!,
                        studentName: student.namaLengkap,
                        class: student.tingkatRombel,
                        date: selectedDate,
                        status: 'Alpha',
                        checkIn: null, duha: null, zuhur: null, ashar: null, checkOut: null
                    } as AttendanceRecord;
                });

                setExportData(finalData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        prepareData();
    }, [selectedDate, selectedClass, activeReport, allStudents]);

    const handleExport = async (formatType: 'pdf' | 'excel') => {
        if (exportData.length === 0) {
            toast.error("Tidak ada data untuk diekspor.");
            return;
        }

        const toastId = toast.loading(`Menghasilkan ${formatType.toUpperCase()}...`);
        
        try {
            if (formatType === 'pdf') {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const targetClasses = selectedClass === 'All' 
                    ? Array.from(new Set(exportData.map(r => r.class))).sort()
                    : [selectedClass];

                targetClasses.forEach((className, index) => {
                    if (index > 0) doc.addPage();
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.text("LAPORAN HARIAN KEHADIRAN & IBADAH SISWA", 105, 15, { align: "center" });
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text("MAN 1 HULU SUNGAI TENGAH", 105, 20, { align: "center" });
                    doc.setLineWidth(0.5);
                    doc.line(15, 24, 195, 24);
                    doc.setFontSize(9);
                    doc.text(`TANGGAL : ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeID })}`, 15, 30);
                    doc.text(`KELAS   : ${className.toUpperCase()}`, 15, 35);
                    const classData = exportData.filter(r => r.class === className).sort((a,b) => a.studentName.localeCompare(b.studentName));
                    autoTable(doc, {
                        startY: 42,
                        head: [['NO', 'NAMA SISWA', 'ST', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG']],
                        body: classData.map((r, i) => [
                            i + 1, r.studentName.toUpperCase(), r.status.substring(0,1),
                            r.checkIn ? r.checkIn.substring(0,5) : '-', r.duha ? r.duha.substring(0,5) : '-',
                            r.zuhur ? r.zuhur.substring(0,5) : '-', r.ashar ? r.ashar.substring(0,5) : '-',
                            r.checkOut ? r.checkOut.substring(0,5) : '-'
                        ]),
                        headStyles: { fillColor: [40, 40, 40], halign: 'center', fontSize: 8 },
                        styles: { fontSize: 7, font: 'helvetica' },
                        margin: { left: 15, right: 15 }
                    });
                });
                doc.save(`LAPORAN_${selectedDate}.pdf`);
            } else {
                const worksheet = XLSX.utils.json_to_sheet(exportData.map((r, i) => ({
                    'No': i + 1, 'Nama Siswa': r.studentName, 'Kelas': r.class, 'Status': r.status,
                    'Masuk': r.checkIn || '-', 'Duha': r.duha || '-', 'Zuhur': r.zuhur || '-',
                    'Ashar': r.ashar || '-', 'Pulang': r.checkOut || '-'
                })));
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
                XLSX.writeFile(workbook, `REKAP_${selectedDate}.xlsx`);
            }
            toast.success("Laporan diunduh!", { id: toastId });
        } catch (e) {
            toast.error("Gagal ekspor.", { id: toastId });
        }
    };

    return (
        <Layout
            title="Pusat Laporan"
            subtitle="Cetak & Rekapitulasi Digital"
            icon={ChartBarIcon}
            onBack={activeReport !== 'menu' ? () => setActiveReport('menu') : onBack}
        >
            <div className="p-4 lg:p-8 pb-32 max-w-4xl mx-auto">
                
                {activeReport === 'menu' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Header for Menu */}
                        <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden mb-6">
                            <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12"><ChartBarIcon className="w-32 h-32" /></div>
                            <h2 className="text-xl font-black uppercase tracking-tight relative z-10">Laporan Akademik</h2>
                            <p className="text-xs text-indigo-100 opacity-80 mt-1 relative z-10 font-medium">Pilih jenis data yang ingin Anda rekapitulasi hari ini.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => setActiveReport('attendance')}
                                className="p-5 bg-white dark:bg-[#151E32] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-800">
                                    <UsersGroupIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Presensi Harian</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Cetak daftar hadir siswa per kelas atau seluruh madrasah.</p>
                                <div className="mt-6 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-widest">
                                    Buka Konfigurasi <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <button className="p-5 bg-white dark:bg-[#151E32] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm opacity-60 text-left cursor-not-allowed">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">Laporan Bulanan</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 leading-relaxed">Statistik persentase kehadiran dalam satu bulan (Segera).</p>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        
                        {/* --- NEW MOBILE STRUCTURED CONFIG HUB --- */}
                        <div className="space-y-8">
                            
                            {/* Step 1: Data Parameters */}
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w