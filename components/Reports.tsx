
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, Loader2, 
  PrinterIcon, ArrowRightIcon, FileSpreadsheet,
  ArrowLeftIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Student, MadrasahData } from '../types';

interface AttendanceRecord {
    id?: string;
    studentId: string;
    studentName: string;
    idUnik: string;
    jenisKelamin: string;
    class: string;
    date: string;
    status: string;
    checkIn: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
    checkOut: string | null;
}

interface ClassInfo {
    name: string;
    teacherName?: string;
    captainName?: string;
    level?: string;
}

const Reports: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeReport, setActiveReport] = useState<'menu' | 'attendance' | 'official_print'>('menu');
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClass, setSelectedClass] = useState<string>('All');
    
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            if (isMockMode) {
                setClasses([
                    { name: '10 A', level: '10', teacherName: 'Wali Kelas 10 A', captainName: 'Ketua Kelas 10 A' },
                    { name: '11 IPA 1', level: '11', teacherName: "Wali Kelas 11 IPA 1", captainName: 'Ketua Kelas 11 IPA 1' }
                ]);
                setAllStudents([
                    { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan', nisn: '0086806440' } as Student,
                    { id: '2', namaLengkap: 'ADISTYA ERLINDA WARDHANI', idUnik: '25004', tingkatRombel: '10 A', status: 'Aktif', jenisKelamin: 'Perempuan', nisn: '0086806447' } as Student,
                ]);
                setMadrasahInfo({
                    nama: 'MAN 1 HULU SUNGAI TENGAH',
                    kepalaNama: 'H. Someran, S.Pd.,MM',
                    kepalaNip: '196703021996031001',
                    alamat: 'Jl. H. Damanhuri No. 12 Barabai'
                } as any);
                setLoading(false);
                return;
            }
            if (db) {
                try {
                    const [classSnap, studentSnap, infoSnap] = await Promise.all([
                        db.collection('classes').get(),
                        db.collection('students').where('status', '==', 'Aktif').get(),
                        db.collection('settings').doc('madrasahInfo').get()
                    ]);
                    setClasses(classSnap.docs.map(d => ({ name: d.data().name, ...d.data() } as ClassInfo)));
                    setAllStudents(studentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                    if (infoSnap.exists) setMadrasahInfo(infoSnap.data() as MadrasahData);
                } catch (e) { console.error(e); }
                setLoading(false);
            }
        };
        loadInitial();
    }, []);

    useEffect(() => {
        if (activeReport === 'menu') return;
        const fetchAttendance = async () => {
            setLoading(true);
            if (isMockMode) {
                setAttendanceRecords([
                    { studentId: '2', studentName: 'ADISTYA ERLINDA WARDHANI', idUnik: '25004', jenisKelamin: 'Perempuan', class: '10 A', date: selectedDate, status: 'Haid', checkIn: '07:01', duha: '07:15', zuhur: '12:10', ashar: '15:30', checkOut: '16:00' }
                ]);
                setLoading(false);
                return;
            }
            if (db) {
                let query = db.collection('attendance').where('date', '==', selectedDate);
                const snap = await query.get();
                setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [selectedDate, activeReport]);

    const formatTimeCell = (time: string | null, status: string, isIbadah: boolean) => {
        if (!time || time === '-' || time === 'Alpha') return '-';
        const cleanTime = time.substring(0, 5);
        if (status === 'Haid' && isIbadah) {
            return `${cleanTime} (Haid)`;
        }
        return cleanTime;
    };

    const handleExportPDF = async () => {
        if (allStudents.length === 0) {
            toast.warning("Database siswa kosong.");
            return;
        }

        const toastId = toast.loading("Membangun Dokumen PDF...");
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            const margin = 10;

            const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            const classesToPrint = selectedClass === 'All' ? sortedClasses : classes.filter(c => c.name === selectedClass);

            let pageCount = 0;

            for (const cls of classesToPrint) {
                const classStudents = allStudents.filter(s => s.tingkatRombel === cls.name)
                    .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
                
                if (classStudents.length === 0) continue;
                if (pageCount > 0) doc.addPage();
                pageCount++;

                // HEADER
                doc.setFont("helvetica", "bold"); doc.setFontSize(11);
                doc.text("LAPORAN HARIAN KEHADIRAN & IBADAH SISWA", centerX, 10, { align: "center" });
                doc.setFontSize(10);
                doc.text((madrasahInfo?.nama || "MAN 1 HULU SUNGAI TENGAH").toUpperCase(), centerX, 15, { align: "center" });
                doc.setLineWidth(0.4); doc.line(margin, 17, pageWidth - margin, 17);

                // METADATA
                const maleCount = classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length;
                const femaleCount = classStudents.length - maleCount;

                doc.setFontSize(7.5);
                doc.text(`TANGGAL : ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeID })}`.toUpperCase(), margin, 22);
                doc.text(`KELAS : ${cls.name}`.toUpperCase(), margin, 26);
                doc.text(`JUMLAH : ${classStudents.length} SISWA (L: ${maleCount}, P: ${femaleCount})`.toUpperCase(), margin, 30);

                doc.text(`WALI KELAS : ${cls.teacherName || '-'}`, centerX + 10, 26);
                doc.text(`KETUA KELAS: ${cls.captainName || '-'}`, centerX + 10, 30);

                // DATA MAPPING
                const tableData = classStudents.map((s, i) => {
                    const r = attendanceRecords.find(rec => rec.studentId === s.id);
                    const isAlpha = !r || r.status === 'Alpha';
                    const currentStatus = r?.status || 'Alpha';
                    const statusText = currentStatus === 'Haid' ? 'HAID' : (isAlpha ? 'ALPHA' : 'HADIR');
                    
                    return [
                        i + 1,
                        s.idUnik || "-",
                        s.namaLengkap.toUpperCase(),
                        cls.name.replace('IPA ', '').replace('IPS ', ''),
                        formatTimeCell(r?.checkIn || null, currentStatus, false),
                        formatTimeCell(r?.duha || null, currentStatus, true),
                        formatTimeCell(r?.zuhur || null, currentStatus, true),
                        formatTimeCell(r?.ashar || null, currentStatus, true),
                        formatTimeCell(r?.checkOut || null, currentStatus, false),
                        statusText
                    ];
                });

                autoTable(doc, {
                    startY: 33,
                    head: [['NO', 'ID UNIK', 'NAMA LENGKAP SISWA', 'KLS', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'KET']],
                    headStyles: { fillColor: [31, 41, 55], halign: 'center', fontSize: 6.5, textColor: [255, 255, 255], cellPadding: 0.8 },
                    styles: { fontSize: 6.5, font: 'helvetica', cellPadding: 0.6, lineWidth: 0.05 },
                    body: tableData,
                    columnStyles: { 
                        0: { halign: 'center', cellWidth: 7 }, 
                        1: { halign: 'center', cellWidth: 15 },
                        2: { cellWidth: 'auto' },
                        3: { halign: 'center', cellWidth: 10 },
                        4: { halign: 'center', cellWidth: 12 },
                        5: { halign: 'center', cellWidth: 15 },
                        6: { halign: 'center', cellWidth: 15 },
                        7: { halign: 'center', cellWidth: 15 },
                        8: { halign: 'center', cellWidth: 12 },
                        9: { halign: 'center', cellWidth: 14 }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body') {
                            const textStr = data.cell.text.join(' ');
                            
                            // Jika teks mengandung "(Haid)" warnai merah
                            if (textStr.includes('(Haid)')) {
                                doc.setTextColor(220, 38, 38); // Red-600
                            } else if (textStr === 'HAID') {
                                doc.setTextColor(220, 38, 38);
                            } else if (textStr === 'ALPHA') {
                                if (data.column.index === 9) doc.setTextColor(220, 38, 38);
                                else doc.setTextColor(31, 41, 55);
                            } else {
                                doc.setTextColor(31, 41, 55);
                            }
                        }
                    }
                });

                // SIGNATURES
                const finalY = (doc as any).lastAutoTable.finalY + 6;
                if (finalY < 330) {
                    doc.setFontSize(7.5);
                    doc.text("Mengetahui,", centerX, finalY, { align: 'center' });
                    doc.text("Kepala Madrasah,", centerX, finalY + 4, { align: 'center' });
                    doc.setFont("helvetica", "bold");
                    doc.text(madrasahInfo?.kepalaNama || "............................", centerX, finalY + 16, { align: 'center' });
                    doc.setFont("helvetica", "normal");
                    doc.text("NIP. " + (madrasahInfo?.kepalaNip || "............................"), centerX, finalY + 19, { align: 'center' });

                    doc.text("Wali Kelas,", pageWidth - margin - 40, finalY + 4);
                    doc.setFont("helvetica", "bold");
                    doc.text(cls.teacherName || "............................", pageWidth - margin - 40, finalY + 16);
                }
            }

            doc.save(`PRESENSI_${selectedClass}_${selectedDate}.pdf`);
            toast.success("PDF berhasil diunduh.", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Gagal membuat PDF.");
        }
    };

    return (
        <Layout title="Laporan" subtitle="Cetak Rekapitulasi" icon={ChartBarIcon} onBack={onBack}>
            <div className="p-4 lg:p-8 pb-32 max-w-5xl mx-auto space-y-6">
                
                {activeReport === 'menu' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button onClick={() => setActiveReport('official_print')} className="p-6 bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left group transition-all active:scale-95 hover:shadow-xl hover:border-indigo-100">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><PrinterIcon className="w-8 h-8" /></div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Cetak PDF Rombel</h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">Format padat satu lembar Legal untuk arsip resmi madrasah.</p>
                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Masuk Modul</span>
                                <ArrowRightIcon className="w-4 h-4 text-indigo-500" />
                            </div>
                        </button>
                        
                        <button onClick={() => setActiveReport('attendance')} className="p-6 bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left group transition-all active:scale-95 hover:shadow-xl hover:border-indigo-100">
                            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><FileSpreadsheet className="w-8 h-8" /></div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Log Logistik Excel</h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">Unduh data mentah seluruh log kehadiran harian.</p>
                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Buka Modul Laporan</span>
                                <ArrowRightIcon className="w-4 h-4 text-indigo-500" />
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <button onClick={() => setActiveReport('menu')} className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-4">
                            <ArrowLeftIcon className="w-4 h-4" /> Kembali ke Menu
                        </button>

                        <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-xs font-bold outline-none text-slate-800 dark:text-white" />
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Rombel</label>
                                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-xs font-bold outline-none text-slate-800 dark:text-white">
                                    <option value="All">Semua Rombel</option>
                                    {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <button onClick={handleExportPDF} className="flex-1 md:flex-none py-3.5 px-8 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <PrinterIcon className="w-4 h-4"/> Cetak PDF Legal
                            </button>
                        </div>

                        <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                             <div className="overflow-x-auto p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                {loading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-4" /> : "Gunakan tombol di atas untuk mengunduh rekapitulasi."}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
