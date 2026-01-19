
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { 
  ChartBarIcon, UsersGroupIcon, CheckCircleIcon, 
  CalendarIcon, BuildingLibraryIcon, ArrowRightIcon,
  FileSpreadsheet, Loader2, ChevronDownIcon,
  PrinterIcon, ClockIcon, XCircleIcon, SparklesIcon,
  HeartIcon, UserIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Student, MadrasahData } from '../types';

interface AttendanceRecord {
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
}

const Reports: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeReport, setActiveReport] = useState<'menu' | 'attendance'>('menu');
    const [loading, setLoading] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedClass, setSelectedClass] = useState<string>('All');
    
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [exportData, setExportData] = useState<AttendanceRecord[]>([]);
    const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            if (isMockMode) {
                setClasses([
                    { name: 'X IPA 1', teacherName: 'Budi Santoso, S.Pd', captainName: 'Ahmad Dahlan' },
                    { name: 'XII IPA 1', teacherName: 'H. Abdul Ghani', captainName: 'Adelia Sri' }
                ]);
                setAllStudents([
                    { id: '1', namaLengkap: 'AHMAD DAHLAN', idUnik: '15012', tingkatRombel: 'X IPA 1', status: 'Aktif', jenisKelamin: 'Laki-laki' } as Student,
                    { id: '2', namaLengkap: 'ADELIA SRI', idUnik: '15013', tingkatRombel: 'XII IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan' } as Student,
                ]);
                setMadrasahInfo({
                    nama: 'MAN 1 HULU SUNGAI TENGAH',
                    kepalaNama: 'Drs. H. Syamsul Arifin',
                    kepalaNip: '196808171995031002',
                    alamat: 'Jl. H. Damanhuri No. 12 Barabai',
                    nsm: '131163070001',
                    npsn: '30315354',
                    telepon: '0517-41234',
                    email: 'info@man1hst.sch.id',
                    website: 'www.man1hst.sch.id'
                });
                setLoading(false);
                return;
            }
            if (db) {
                db.collection('classes').get().then(snap => {
                    setClasses(snap.docs.map(d => ({
                        name: d.data().name,
                        teacherName: d.data().teacherName,
                        captainName: d.data().captainName
                    } as ClassInfo)).sort((a,b) => a.name.localeCompare(b.name)));
                });
                db.collection('students').where('status', '==', 'Aktif').get().then(snap => {
                    setAllStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
                });
                db.collection('settings').doc('madrasahInfo').get().then(doc => {
                    if (doc.exists) setMadrasahInfo(doc.data() as MadrasahData);
                });
                setLoading(false);
            }
        };
        loadInitial();
    }, []);

    useEffect(() => {
        if (activeReport !== 'attendance') return;
        const prepareData = async () => {
            setLoading(true);
            try {
                let attendanceRecords: any[] = [];
                if (isMockMode) {
                    attendanceRecords = [
                        { studentId: '2', studentName: 'ADELIA SRI', class: 'XII IPA 1', date: selectedDate, status: 'Haid', checkIn: '07:15', duha: 'Haid', zuhur: 'Haid', ashar: 'Haid', checkOut: '16:00' },
                        { studentId: '1', studentName: 'AHMAD DAHLAN', class: 'X IPA 1', date: selectedDate, status: 'Hadir', checkIn: '07:10', duha: '09:00', zuhur: '12:00', ashar: '15:00', checkOut: '16:00' },
                    ];
                } else if (db) {
                    let query = db.collection('attendance').where('date', '==', selectedDate);
                    if (selectedClass !== 'All') query = query.where('class', '==', selectedClass);
                    const snap = await query.get();
                    attendanceRecords = snap.docs.map(d => d.data());
                }
                const studentsInClass = allStudents.filter(s => selectedClass === 'All' || s.tingkatRombel === selectedClass);
                const attMap = new Map(attendanceRecords.map(r => [r.studentId, r]));
                setExportData(studentsInClass.map(s => {
                    const rec = attMap.get(s.id!);
                    return { studentId: s.id!, studentName: s.namaLengkap || 'Siswa', idUnik: s.idUnik || s.nisn || '-', jenisKelamin: s.jenisKelamin || '-', class: s.tingkatRombel, date: selectedDate, status: rec ? rec.status : 'Alpha', checkIn: rec ? rec.checkIn : null, duha: rec ? rec.duha : null, zuhur: rec ? rec.zuhur : null, ashar: rec ? rec.ashar : null, checkOut: rec ? rec.checkOut : null };
                }));
            } finally { setLoading(false); }
        };
        prepareData();
    }, [selectedDate, selectedClass, activeReport, allStudents]);

    // Helper load image logo
    const getLogoBase64 = (): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // CRITICAL
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                try {
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    resolve('');
                }
            };
            img.onerror = () => resolve('');
            img.src = 'https://lh3.googleusercontent.com/d/1kYplV_NYloChk77ggGNGOoBb-D3Nv7nJ';
        });
    };

    const handleExport = async (formatType: 'pdf' | 'excel') => {
        if (loading) { toast.error("Database sedang sinkronisasi..."); return; }
        if (exportData.length === 0) { toast.error("Tidak ada data."); return; }
        const toastId = toast.loading(`Menghasilkan ${formatType.toUpperCase()} Resmi...`);
        try {
            if (formatType === 'pdf') {
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const centerX = pageWidth / 2;
                const margin = 15;
                const dateHeader = format(new Date(selectedDate), 'EEEE, dd MMMM yyyy', { locale: localeID });
                
                // PRE-LOAD LOGO
                const logoData = await getLogoBase64();

                const classGroups = new Map<string, AttendanceRecord[]>();
                exportData.forEach(r => { const cls = r.class || 'Umum'; if (!classGroups.has(cls)) classGroups.set(cls, []); classGroups.get(cls)!.push(r); });
                const targetClasses = selectedClass === 'All' ? Array.from(classGroups.keys()).sort() : [selectedClass];

                targetClasses.forEach((className, idx) => {
                    const classData = classGroups.get(className);
                    if (!classData) return;
                    if (idx > 0) doc.addPage();
                    
                    // Hitung Gender
                    const mCount = classData.filter(c => c.jenisKelamin === 'Laki-laki').length;
                    const fCount = classData.filter(c => c.jenisKelamin === 'Perempuan').length;

                    // --- KOP SURAT RESMI ---
                    if (logoData) {
                        doc.addImage(logoData, 'PNG', margin, 8, 18, 18);
                    }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", centerX + 10, 12, { align: "center" });
                    doc.setFontSize(11);
                    doc.text("KANTOR KEMENTERIAN AGAMA KABUPATEN HULU SUNGAI TENGAH", centerX + 10, 17, { align: "center" });
                    doc.setFontSize(12);
                    doc.text((madrasahInfo?.nama || "MAN 1 HULU SUNGAI TENGAH").toUpperCase(), centerX + 10, 22, { align: "center" });
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.text(`${madrasahInfo?.alamat || "-"}`, centerX + 10, 26, { align: "center" });
                    
                    doc.setLineWidth(0.6);
                    doc.line(margin, 28, pageWidth - margin, 28);
                    doc.setLineWidth(0.2);
                    doc.line(margin, 29, pageWidth - margin, 29);

                    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("REKAPITULASI PRESENSI HARIAN SISWA", centerX, 40, { align: "center" });
                    doc.setFontSize(8); doc.setFont("helvetica", "normal"); 
                    doc.text(`Hari / Tanggal : ${dateHeader}`, margin, 50);
                    doc.text(`Rombel / Kelas : ${className.toUpperCase()}`, margin, 55);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Jumlah Siswa  : ${classData.length} (L: ${mCount}, P: ${fCount})`, margin, 60);
                    doc.setFont("helvetica", "normal");

                    const clsInfo = classes.find(c => c.name === className) || { teacherName: "............................", captainName: "............................" };

                    autoTable(doc, {
                        startY: 65,
                        head: [['NO', 'ID UNIK', 'NAMA SISWA', 'JK', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'KET']],
                        body: classData.sort((a,b)=>(a.studentName||'').localeCompare(b.studentName||'')).map((r, i) => [
                            i + 1, r.idUnik, (r.studentName || '').toUpperCase(), r.jenisKelamin === 'Laki-laki' ? 'L' : 'P',
                            r.checkIn || '-', r.duha || '-', r.zuhur || '-', r.ashar || '-', r.checkOut || '-',
                            r.status === 'Alpha' ? 'A' : r.status === 'Haid' ? 'HD' : r.status.substring(0,1)
                        ]),
                        headStyles: { fillColor: [67, 56, 202], halign: 'center', fontSize: 7, textColor: [255, 255, 255] },
                        styles: { fontSize: 7, cellPadding: 2 },
                        didDrawCell: (data) => {
                            if (data.section === 'body' && data.row.cells[9].text[0] === 'HD') {
                                doc.setFillColor(255, 241, 242);
                            }
                        }
                    });

                    // TTD
                    const finalY = (doc as any).lastAutoTable.finalY + 15;
                    if (finalY + 50 < 290) {
                        doc.setFontSize(8);
                        doc.text("Barabai, " + format(new Date(), "dd MMMM yyyy", { locale: localeID }), pageWidth - margin - 50, finalY);
                        
                        doc.text("Ketua Kelas,", margin + 10, finalY + 5);
                        doc.text("Wali Rombel,", pageWidth - margin - 50, finalY + 5);
                        
                        doc.setFont("helvetica", "bold");
                        doc.text((clsInfo.captainName || "............................").toUpperCase(), margin + 10, finalY + 25);
                        doc.text((clsInfo.teacherName || "............................").toUpperCase(), pageWidth - margin - 50, finalY + 25);
                        
                        doc.setFont("helvetica", "normal"); doc.text("Mengetahui,", centerX, finalY + 32, { align: 'center' });
                        doc.setFont("helvetica", "bold"); doc.text("Kepala Madrasah,", centerX, finalY + 37, { align: 'center' });
                        doc.text((madrasahInfo?.kepalaNama || "Drs. H. Syamsul Arifin").toUpperCase(), centerX, finalY + 55, { align: 'center' });
                        doc.setFont("helvetica", "normal");
                        doc.text("NIP. " + (madrasahInfo?.kepalaNip || "196808171995031002"), centerX, finalY + 59, { align: 'center' });
                    }
                });
                doc.save(`REKAP_PRESENSI_${selectedDate}.pdf`);
            } else {
                const worksheet = XLSX.utils.json_to_sheet(exportData.map((r, i) => ({ 'No': i + 1, 'Nama Siswa': r.studentName, 'Kelas': r.class, 'Jenis Kelamin': r.jenisKelamin, 'Status': r.status, 'Masuk': r.checkIn || '-', 'Pulang': r.checkOut || '-' })));
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap"); XLSX.writeFile(workbook, `REKAP_${selectedDate}.xlsx`);
            }
            toast.success("Berhasil diunduh!", { id: toastId });
        } catch (e) { toast.error("Gagal memproses laporan.", { id: toastId }); }
    };

    return (
        <Layout title="Pusat Laporan" subtitle="Cetak & Rekapitulasi Digital" icon={ChartBarIcon} onBack={activeReport !== 'menu' ? () => setActiveReport('menu') : onBack}>
            <div className="p-4 lg:p-8 pb-32 max-w-4xl mx-auto">
                {activeReport === 'menu' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <button onClick={() => setActiveReport('attendance')} className="p-6 bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-left group transition-all active:scale-95">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-6"><UsersGroupIcon className="w-8 h-8" /></div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Presensi Harian</h3>
                            <p className="text-xs text-slate-500 mt-2">Cetak rekapitulasi kehadiran dengan TTD Wali & Ketua Kelas.</p>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold" />
                                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold uppercase">
                                    <option value="All">Semua Rombel</option>
                                    {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleExport('excel')} 
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase border ${loading ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed opacity-50' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
                                >
                                    <FileSpreadsheet className="w-5 h-5"/> EXCEL
                                </button>
                                <button 
                                    onClick={() => handleExport('pdf')} 
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg ${loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 text-white'}`}
                                >
                                    <PrinterIcon className="w-5 h-5"/> PDF RESMI
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
