
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { Student, ViewState, MadrasahData } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id'; 
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { 
    CalendarIcon, Loader2, ChevronLeft, ChevronRight, 
    Search, QrCodeIcon, ArrowLeftIcon, 
    CameraIcon, ClockIcon, PencilIcon,
    CheckCircleIcon, XCircleIcon,
    ChevronDownIcon, UsersIcon, SparklesIcon,
    ArrowTrendingUpIcon, HeartIcon, PrinterIcon,
    AppLogo, StarIcon, MapPinIcon, SaveIcon
} from './Icons';

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    class: string;
    date: string;
    status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha' | 'Haid';
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

const Presensi: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void }> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [madrasahInfo, setMadrasahInfo] = useState<MadrasahData | null>(null);
  
  const [activeGrade, setActiveGrade] = useState<string>('All');
  const [activeClass, setActiveClass] = useState<string>('All');

  // Mode Haid State
  const [isHaidMode, setIsHaidMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
        if (isMockMode) {
            setAllStudents([
                { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: 'XII IPA 1', nisn: '0086806447', status: 'Aktif', jenisKelamin: 'Perempuan', idUnik: '25002' } as any,
                { id: '2', namaLengkap: 'AHMAD DAHLAN', tingkatRombel: 'X IPA 1', nisn: '0086806448', status: 'Aktif', jenisKelamin: 'Laki-laki', idUnik: '25010' } as any,
                { id: '3', namaLengkap: 'BUDI SANTOSO', tingkatRombel: 'XI IPS 2', nisn: '0086806449', status: 'Aktif', jenisKelamin: 'Laki-laki', idUnik: '25015' } as any
            ]);
            setClassList([
                { name: 'X IPA 1', level: '10', teacherName: 'Budi Santoso, S.Pd', captainName: 'Ahmad Dahlan' },
                { name: 'XI IPS 2', level: '11', teacherName: 'Siti Aminah, M.Ag', captainName: 'Rahmat' },
                { name: 'XII IPA 1', level: '12', teacherName: 'H. Abdullah, Lc', captainName: 'Adelia' }
            ]);
            setMadrasahInfo({
                nama: 'MAN 1 HULU SUNGAI TENGAH',
                kepalaNama: 'Drs. H. Syamsul Arifin',
                kepalaNip: '196808171995031002',
                alamat: 'Jl. H. Damanhuri No. 12 Barabai'
            } as any);
            setLoading(false); 
            return;
        }
        if (!db) return;
        const dateStr = format(date, "yyyy-MM-dd");
        
        db.collection("students").where("status", "==", "Aktif").onSnapshot(s => {
            setAllStudents(s.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
        });

        db.collection("classes").onSnapshot(s => {
            setClassList(s.docs.map(d => d.data()));
        });
        
        db.collection("attendance").where("date", "==", dateStr).onSnapshot(s => {
            setAttendanceSnapshot(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
            setLoading(false);
        });

        db.collection('settings').doc('madrasahInfo').get().then(doc => {
            if (doc.exists) setMadrasahInfo(doc.data() as MadrasahData);
        });
    };
    loadData();
  }, [date]);

  const filteredClasses = useMemo(() => {
    let filtered = classList;
    if (activeGrade !== 'All') {
      filtered = filtered.filter(c => c.level === activeGrade);
    }
    return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
  }, [classList, activeGrade]);

  const displayData = useMemo(() => {
    const query = searchTerm.toLowerCase();
    const students = allStudents.filter(s => {
        const nama = String(s.namaLengkap || '').toLowerCase();
        const nisn = String(s.nisn || '').toLowerCase();
        const matchesSearch = nama.includes(query) || nisn.includes(query);
        
        const clsInfo = classList.find(c => c.name === s.tingkatRombel);
        const matchesGrade = activeGrade === 'All' || (clsInfo && clsInfo.level === activeGrade);
        const matchesClass = activeClass === 'All' || s.tingkatRombel === activeClass;
        
        return matchesSearch && matchesGrade && matchesClass;
    });
    
    const attMap = new Map(attendanceSnapshot.map(r => [r.studentId, r]));
    return students.map(s => {
        const record = attMap.get(s.id!);
        return (record || {
            id: `${s.id}_${format(date, "yyyy-MM-dd")}`,
            studentId: s.id!, studentName: s.namaLengkap, class: s.tingkatRombel,
            status: 'Alpha', checkIn: null, checkOut: null, duha: null, zuhur: null, ashar: null,
            jenisKelamin: s.jenisKelamin, idUnik: s.idUnik
        } as any);
    });
  }, [allStudents, attendanceSnapshot, searchTerm, activeGrade, activeClass, date, classList]);

  const stats = useMemo(() => {
      const total = displayData.length;
      const hadir = displayData.filter(d => d.status === 'Hadir' || d.status === 'Terlambat' || d.status === 'Haid').length;
      const pct = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return { total, hadir, alpa: total - hadir, pct };
  }, [displayData]);

  const handleEditClick = (record: AttendanceRecord) => {
      if (isHaidMode) {
          handleQuickHaidAction(record);
          return;
      }
      setEditingRecord(record);
      setIsModalOpen(true);
  };

  const handleQuickHaidAction = async (record: AttendanceRecord) => {
      if (record.status === 'Haid') return;
      const student = allStudents.find(s => s.id === record.studentId);
      if (student?.jenisKelamin === 'Laki-laki') {
          toast.error("Mode Haid hanya untuk siswi.");
          return;
      }
      try {
          const payload = { ...record, status: 'Haid' };
          if (!isMockMode && db) await db.collection("attendance").doc(record.id).set(payload, { merge: true });
          toast.success(`${record.studentName} dicatat Haid`);
      } catch (e) { toast.error("Gagal mencatat status."); }
  };

  const handleSaveManualEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRecord) return;
      setSaving(true);
      try {
          if (!isMockMode && db) await db.collection("attendance").doc(editingRecord.id).set(editingRecord, { merge: true });
          toast.success("Data diperbarui.");
          setIsModalOpen(false);
      } catch (e) { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  const getLogoBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            try { resolve(canvas.toDataURL('image/png')); } catch (e) { resolve(''); }
        };
        img.onerror = () => resolve('');
        img.src = 'https://lh3.googleusercontent.com/d/1kYplV_NYloChk77ggGNGOoBb-D3Nv7nJ';
    });
  };

  const handleExportPDF = async () => {
    if (loading) { toast.error("Memuat data..."); return; }
    if (displayData.length === 0) { toast.error("Tidak ada data."); return; }
    const toastId = toast.loading("Membangun Dokumen PDF Resmi...");
    
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const margin = 15;
        const dateStr = format(date, 'EEEE, dd MMMM yyyy', { locale: localeID });

        // --- ARSITEKTUR KOP SURAT ---
        const logoData = await getLogoBase64();
        if (logoData) { doc.addImage(logoData, 'PNG', margin, 10, 18, 18); }

        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text("KEMENTERIAN AGAMA REPUBLIK INDONESIA", centerX + 8, 14, { align: "center" });
        doc.setFontSize(11);
        doc.text("KANTOR KEMENTERIAN AGAMA KABUPATEN HULU SUNGAI TENGAH", centerX + 8, 19, { align: "center" });
        doc.setFontSize(12);
        doc.text((madrasahInfo?.nama || "MAN 1 HULU SUNGAI TENGAH").toUpperCase(), centerX + 8, 24, { align: "center" });
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(madrasahInfo?.alamat || "Jl. H. Damanhuri No. 12 Barabai", centerX + 8, 28, { align: "center" });
        doc.setLineWidth(0.6); doc.line(margin, 30, pageWidth - margin, 30);
        doc.setLineWidth(0.2); doc.line(margin, 31, pageWidth - margin, 31);

        // --- METADATA LAPORAN ---
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text("LAPORAN HARIAN PRESENSI & IBADAH SISWA", centerX, 40, { align: "center" });
        
        doc.setFontSize(8); doc.setFont("helvetica", "normal");
        doc.text(`Hari/Tanggal : ${dateStr}`, margin, 50);
        doc.text(`Rombel / Tk  : ${activeClass === 'All' ? 'SEMUA ROMBEL' : activeClass.toUpperCase()}`, margin, 55);
        
        const maleCount = displayData.filter(d => d.jenisKelamin === 'Laki-laki').length;
        const femaleCount = displayData.length - maleCount;
        doc.text(`Populasi     : ${displayData.length} SISWA (L: ${maleCount}, P: ${femaleCount})`, margin, 60);

        const formatTimeWithStatus = (val: string | null, status: string, isIbadah: boolean) => {
            if (!val) return '-';
            const cleanTime = val.substring(0, 5);
            if (status === 'Haid' && isIbadah) return `${cleanTime} (Haid)`;
            return cleanTime;
        };

        // --- ARSITEKTUR TABEL 10 KOLOM LENGKAP ---
        autoTable(doc, {
            startY: 65,
            head: [['NO', 'ID UNIK', 'NAMA LENGKAP SISWA', 'KLS', 'MSK', 'DHA', 'ZHR', 'ASR', 'PLG', 'ST']],
            body: displayData.map((r, i) => [
                i + 1, r.idUnik || '-', r.studentName.toUpperCase(), r.class.replace('IPA ', '').replace('IPS ', ''),
                formatTimeWithStatus(r.checkIn, r.status, false), 
                formatTimeWithStatus(r.duha, r.status, true), 
                formatTimeWithStatus(r.zuhur, r.status, true), 
                formatTimeWithStatus(r.ashar, r.status, true), 
                formatTimeWithStatus(r.checkOut, r.status, false),
                r.status === 'Alpha' ? 'A' : r.status === 'Terlambat' ? 'T' : r.status === 'Haid' ? 'HD' : 'H'
            ]),
            headStyles: { fillColor: [43, 58, 85], halign: 'center', fontSize: 6.5, textColor: [255, 255, 255] },
            styles: { fontSize: 6.5, font: 'helvetica', cellPadding: 1.5 },
            columnStyles: { 
                0: { halign: 'center', cellWidth: 7 }, 
                1: { halign: 'center', cellWidth: 14 },
                3: { halign: 'center', cellWidth: 10 }, 
                4: { halign: 'center', cellWidth: 12 }, 
                5: { halign: 'center', cellWidth: 15 }, 
                6: { halign: 'center', cellWidth: 15 }, 
                7: { halign: 'center', cellWidth: 15 }, 
                8: { halign: 'center', cellWidth: 12 }, 
                9: { halign: 'center', cellWidth: 8 } 
            },
            didDrawCell: (data) => {
                if (data.section === 'body') {
                    const cellText = data.cell.text.join(' ');
                    const statusVal = data.row.cells[9].text[0];

                    if (cellText.includes('(Haid)') || statusVal === 'HD') {
                        doc.setTextColor(225, 29, 72); // Merah Haid
                    } else if (statusVal === 'T') {
                        doc.setTextColor(217, 119, 6); // Oranye Terlambat
                    } else if (statusVal === 'A') {
                        doc.setTextColor(185, 28, 28); // Merah Alpa
                    } else {
                        doc.setTextColor(43, 58, 85);
                    }
                }
            }
        });

        // --- ARSITEKTUR VALIDASI (TANDA TANGAN) ---
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        const clsInfo = classList.find(c => c.name === activeClass) || { teacherName: "............................", captainName: "............................" };

        if (finalY + 50 < 290) {
            doc.setFontSize(8);
            doc.text(`Barabai, ${format(new Date(), 'dd MMMM yyyy', { locale: localeID })}`, pageWidth - margin - 45, finalY);
            
            doc.text("Ketua Kelas,", margin + 5, finalY + 5);
            doc.setFont("helvetica", "bold");
            doc.text((clsInfo.captainName || "............................").toUpperCase(), margin + 5, finalY + 25);
            
            doc.setFont("helvetica", "normal");
            doc.text("Wali Rombel,", pageWidth - margin - 45, finalY + 5);
            doc.setFont("helvetica", "bold");
            doc.text((clsInfo.teacherName || "............................").toUpperCase(), pageWidth - margin - 45, finalY + 25);
            
            doc.setFont("helvetica", "normal");
            doc.text("Mengetahui,", centerX, finalY + 32, { align: 'center' });
            doc.text("Kepala Madrasah,", centerX, finalY + 37, { align: 'center' });
            doc.setFont("helvetica", "bold");
            doc.text((madrasahInfo?.kepalaNama || "............................").toUpperCase(), centerX, finalY + 55, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.text(`NIP. ${madrasahInfo?.kepalaNip || "............................"}`, centerX, finalY + 59, { align: 'center' });
        }

        doc.save(`PRESENSI_IMAM_${activeClass.replace(' ', '_')}_${format(date, 'yyyyMMdd')}.pdf`);
        toast.success("PDF Berhasil Dibuat", { id: toastId });
    } catch (e) { 
        console.error(e);
        toast.error("Gagal mencetak laporan PDF.", { id: toastId }); 
    }
  };

  const SessionPill = ({ label, time, color, isHaid }: { label: string, time: string | null, color: string, isHaid: boolean }) => {
      const isFilled = !!time;
      return (
        <div className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
            isFilled 
            ? isHaid 
                ? 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 shadow-sm'
                : `bg-${color}-50/50 dark:bg-${color}-900/10 border-${color}-100 dark:border-${color}-800 shadow-sm` 
            : 'bg-slate-50/30 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-40'
        }`}>
            <span className={`text-[6px] font-black uppercase tracking-tighter ${isFilled ? isHaid ? 'text-rose-600' : `text-${color}-600 dark:text-${color}-400` : 'text-slate-400'}`}>
                {label}
            </span>
            <span className={`text-[10px] font-mono font-black ${isFilled ? isHaid ? 'text-rose-600' : 'text-slate-800 dark:text-white' : 'text-slate-300'}`}>
                {isFilled ? time!.substring(0, 5) : '--:--'}
            </span>
        </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      {/* APP BAR */}
      <div className="bg-white/80 dark:bg-[#0B1121]/90 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all active:scale-90"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div>
                  <h2 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight leading-none">Presensi Harian</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Arsitektur Terpadu</p>
                  </div>
              </div>
          </div>
          <div className="flex gap-2">
              <button onClick={handleExportPDF} disabled={loading} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm"><PrinterIcon className="w-5 h-5" /></button>
              <button onClick={() => onNavigate(ViewState.SCANNER)} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"><CameraIcon className="w-5 h-5" /></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 lg:p-8 space-y-6 pb-32 max-w-4xl mx-auto">
              
              {/* STATUS SUMMARY CARD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-7 text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-1000"><ArrowTrendingUpIcon className="w-32 h-32" /></div>
                      <div className="relative z-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70 mb-1">Efektivitas Kehadiran</p>
                          <h3 className="text-4xl font-black">{stats.pct}%</h3>
                          <div className="mt-4 flex items-center gap-3">
                              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-white transition-all duration-1000" style={{ width: `${stats.pct}%` }}></div>
                              </div>
                              <span className="text-[9px] font-black uppercase opacity-60">Live</span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hadir</p>
                          <h4 className="text-2xl font-black text-emerald-500 mt-2">{stats.hadir}</h4>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">PESERTA DIDIK</p>
                      </div>
                      <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Alpa / Absen</p>
                          <h4 className="text-2xl font-black text-rose-500 mt-2">{stats.alpa}</h4>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">BELUM TERDETEKSI</p>
                      </div>
                  </div>
              </div>

              {/* NAVIGATION & FILTERS */}
              <div className="bg-white dark:bg-[#151E32] p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                          <button onClick={() => setDate(new Date(date.getTime() - 86400000))} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-90"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
                          <div className="flex-1 text-center min-w-[140px]">
                              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{format(date, "EEEE", { locale: localeID })}</p>
                              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase mt-0.5">{format(date, "dd MMMM yyyy", { locale: localeID })}</h3>
                          </div>
                          <button onClick={() => setDate(new Date(date.getTime() + 86400000))} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-90"><ChevronRight className="w-4 h-4 text-slate-400"/></button>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
                          {['All', '10', '11', '12'].map(lvl => (
                              <button key={lvl} onClick={() => { setActiveGrade(lvl); setActiveClass('All'); }} className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black transition-all border ${activeGrade === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600'}`}>
                                  {lvl === 'All' ? 'SEMUA' : `TK ${lvl}`}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input type="text" placeholder="CARI NAMA SISWA / NISN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-[11px] font-black focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 dark:text-white outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select value={activeClass} onChange={e => setActiveClass(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-5 text-[11px] font-black uppercase appearance-none cursor-pointer outline-none focus:ring-4 focus:ring-indigo-500/5">
                                <option value="All">SEMUA ROMBEL</option>
                                {filteredClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        
                        <button 
                            onClick={() => setIsHaidMode(!isHaidMode)}
                            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 ${isHaidMode ? 'bg-rose-600 border-rose-500 text-white shadow-rose-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                        >
                            <HeartIcon className={`w-4 h-4 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} />
                            <span className="hidden sm:inline">Mode Haid</span>
                        </button>
                      </div>
                  </div>
              </div>

              {/* LIST OF STUDENTS */}
              <div className="space-y-4">
                  {loading ? (
                      <div className="py-20 text-center flex flex-col items-center gap-3 animate-pulse"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Log Absensi...</p></div>
                  ) : displayData.length > 0 ? (
                      displayData.map((record, idx) => {
                          const isHaidStatus = record.status === 'Haid';
                          return (
                          <div key={record.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 20}ms` }}>
                              <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${isHaidStatus ? 'bg-rose-500' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-500'}`}></div>
                              
                              <div className="flex items-start justify-between mb-6 pl-2">
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border-2 transition-all group-hover:scale-110 ${isHaidStatus ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50' : record.status === 'Alpha' ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50'}`}>
                                          {isHaidStatus ? <HeartIcon className="w-7 h-7 fill-current animate-pulse" /> : (record.studentName || '?').charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                          <h4 className={`font-black text-sm uppercase tracking-tight truncate leading-tight ${isHaidStatus ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{(record.studentName || 'Siswa').toUpperCase()}</h4>
                                          <div className="flex items-center gap-2 mt-1.5">
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{record.class || '-'}</span>
                                              <span className="text-slate-200 dark:text-slate-700">•</span>
                                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${record.status === 'Hadir' ? 'text-emerald-600 bg-emerald-50' : record.status === 'Terlambat' ? 'text-amber-600 bg-amber-50' : record.status === 'Haid' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-100'}`}>{record.status}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <button onClick={() => handleEditClick(record)} className={`p-3 rounded-2xl transition-all ${isHaidMode ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100'}`}>
                                    {isHaidMode ? <HeartIcon className="w-5 h-5 fill-current animate-pulse" /> : <PencilIcon className="w-4 h-4" />}
                                  </button>
                              </div>

                              <div className="flex gap-2.5 pl-2 cursor-pointer" onClick={() => handleEditClick(record)}>
                                  <SessionPill label="MSK" time={record.checkIn} color="emerald" isHaid={isHaidStatus} />
                                  <SessionPill label="DHA" time={record.duha} color="violet" isHaid={isHaidStatus} />
                                  <SessionPill label="ZHR" time={record.zuhur} color="blue" isHaid={isHaidStatus} />
                                  <SessionPill label="ASR" time={record.ashar} color="amber" isHaid={isHaidStatus} />
                                  <SessionPill label="PLG" time={record.checkOut} color="rose" isHaid={isHaidStatus} />
                              </div>
                          </div>
                          );
                      })
                  ) : (
                      <div className="py-32 text-center bg-white dark:bg-slate-800 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                          <UsersIcon className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto mb-6" />
                          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Data Tidak Ditemukan</h3>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* MANUAL EDIT MODAL */}
      {isModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">Koreksi Kehadiran</h3>
                      <button onClick={() => setIsModalOpen(false)}><XCircleIcon className="w-8 h-8 text-slate-400"/></button>
                  </div>
                  <form onSubmit={handleSaveManualEdit} className="space-y-4">
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Utama</label>
                          <select 
                            value={editingRecord.status} 
                            onChange={e => setEditingRecord({...editingRecord, status: e.target.value as any})}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-[11px] font-bold outline-none"
                          >
                              <option value="Hadir">HADIR</option>
                              <option value="Haid">HAID (MENSTRUASI)</option>
                              <option value="Terlambat">TERLAMBAT</option>
                              <option value="Sakit">SAKIT</option>
                              <option value="Izin">IZIN</option>
                              <option value="Alpha">ALPA</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jam Masuk</label>
                            <input type="time" value={editingRecord.checkIn || ''} onChange={e => setEditingRecord({...editingRecord, checkIn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jam Pulang</label>
                            <input type="time" value={editingRecord.checkOut || ''} onChange={e => setEditingRecord({...editingRecord, checkOut: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold" />
                        </div>
                      </div>
                      <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4">
                          {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : <><SaveIcon className="w-4 h-4 inline mr-2"/> Terapkan Koreksi</>}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default Presensi;
