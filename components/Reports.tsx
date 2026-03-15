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
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';
import { format } from 'date-fns';
import { Student, UserRole, ViewState, ClassData } from '../types';
import { toast } from 'sonner';

const Reports: React.FC<{ onBack: () => void, onNavigate: (v: ViewState) => void, userRole: UserRole }> = ({ onBack, onNavigate, userRole }) => {
  const [reportMode, setReportMode] = useState<'harian' | 'bulanan'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(localStorage.getItem('imam_pending_report_class') || '');
  const [filterNama, setFilterNama] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const LIMITS = { masuk: '07:30', pulang: '16:00' };

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
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
    const [reportMode, setReportMode] = useState<'harian' | 'bulanan'>('harian');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('10 A');
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
    loadClasses();
    return () => { localStorage.removeItem('imam_pending_report_class'); };
  }, []);

  useEffect(() => {
    if (!selectedClassFilter) return;
    setLoading(true);

    const load = async () => {
      try {
        if (isMockMode) {
          await new Promise(r => setTimeout(r, 500));
          setStudents([
            { id: 's1', namaLengkap: 'ADELIA SRI SUNDARI', tingkatRombel: selectedClassFilter, status: 'Aktif', idUnik: '25002', nisn: '0086806447', jenisKelamin: 'Perempuan', isClaimed: true } as any,
            { id: 's2', namaLengkap: 'AHMAD FAJAR', tingkatRombel: selectedClassFilter, status: 'Aktif', idUnik: '25003', nisn: '0086806448', jenisKelamin: 'Laki-laki', isClaimed: true } as any,
          ]);

          if (reportMode === 'harian') {
            setAttendanceRecords([
              { studentId: 's1', checkIn: '07:35', checkOut: '15:55', status: 'Hadir' },
              { studentId: 's2', checkIn: null, checkOut: null, status: 'Alpha' },
            ]);
          } else {
            setAttendanceRecords([
              { studentId: 's1', date: `${selectedMonth}-01`, status: 'Hadir' },
              { studentId: 's1', date: `${selectedMonth}-02`, status: 'Hadir' },
              { studentId: 's1', date: `${selectedMonth}-03`, status: 'Izin' },
              { studentId: 's2', date: `${selectedMonth}-01`, status: 'Alpha' },
              { studentId: 's2', date: `${selectedMonth}-02`, status: 'Hadir' },
            ]);
          }
          return;
        }

        const sSnap = await db!.collection('students').where('status', '==', 'Aktif').where('tingkatRombel', '==', selectedClassFilter).get();
        const mappedStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        setStudents(mappedStudents);

        const studentIds = new Set(sSnap.docs.map(d => d.id));
        let aSnap: any;
        if (reportMode === 'harian') {
          aSnap = await db!.collection('attendance').where('date', '==', selectedDate).get();
        } else {
          const monthStart = `${selectedMonth}-01`;
          const monthEnd = `${selectedMonth}-31`;
          aSnap = await db!.collection('attendance').where('date', '>=', monthStart).where('date', '<=', monthEnd).get();
        }

        setAttendanceRecords(aSnap.docs.map(d => d.data()).filter((att: any) => studentIds.has(att.studentId)));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedDate, selectedMonth, selectedClassFilter, reportMode]);

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
    return students
      .filter(s => {
        const q = filterNama.toLowerCase().trim();
        return q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q);
      })
      .map(s => ({ ...s, att: attMap.get(s.id!) || { status: 'Alpha' } }));
  }, [students, attendanceRecords, filterNama]);

  const monthlySummary = useMemo(() => {
    const filteredStudents = students.filter(s => {
      const q = filterNama.toLowerCase().trim();
      return q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').includes(q);
    });

    const grouped = new Map<string, any[]>();
    attendanceRecords.forEach((r) => {
      const list = grouped.get(r.studentId) || [];
      list.push(r);
      grouped.set(r.studentId, list);
    });

    return filteredStudents.map((s) => {
      const rows = grouped.get(s.id || '') || [];
      const hadir = rows.filter(r => r.status === 'Hadir').length;
      const haid = rows.filter(r => r.status === 'Haid').length;
      const izin = rows.filter(r => r.status === 'Izin').length;
      const sakit = rows.filter(r => r.status === 'Sakit').length;
      const alpha = rows.filter(r => r.status === 'Alpha').length;
      const total = rows.length;
      const presentRate = total > 0 ? Math.round(((hadir + haid) / total) * 100) : 0;

      return { ...s, hadir, haid, izin, sakit, alpha, total, presentRate };
    });
  }, [students, attendanceRecords, filterNama]);

  const TimeCell = ({ rawValue, type }: { rawValue: string | null, type: 'masuk' | 'pulang' }) => {
    const isHaid = String(rawValue || '').includes('| H');
    const time = rawValue ? rawValue.split(' | ')[0].substring(0, 5) : '--:--';
    const StatusDot = ({ rawTime, label }: { rawTime: string | null, label: string }) => {
        const { meta } = parseTimeWithMeta(rawTime);
        const isHaid = meta === 'H';
        const isFilled = !!rawTime;
        
        return (
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-black shrink-0 transition-all ${
                isFilled 
                ? (isHaid ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') 
                : 'bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700'
            }`}>
                {label}
            </div>
        );
    };

    const classFilterOptions = useMemo(() => {
        const set = new Set<string>(classes.map(c => c.name).filter(Boolean));
        allStudents.forEach((s) => {
            if (s.tingkatRombel) set.add(s.tingkatRombel);
        });
        return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [classes, allStudents]);

    const showDetailColumns = isDetailView || reportMode === 'bulanan';

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
    <Layout
      title="Laporan Kelas"
      subtitle={selectedClassFilter ? `Monitor Rombel ${selectedClassFilter}` : 'Memuat...'}
      icon={ChartBarIcon}
      onBack={onBack}
      actions={<button onClick={() => toast.info('Fitur export segera hadir')} className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg active:scale-90 transition-all"><ArrowDownTrayIcon className="w-5 h-5" /></button>}
    >
      <div className="p-4 lg:p-6 space-y-5 pb-32">
        <div className="bg-white dark:bg-[#151E32] p-5 rounded-[2.2rem] shadow-sm space-y-4 border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl flex">
              <button onClick={() => setReportMode('harian')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'harian' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Harian</button>
              <button onClick={() => setReportMode('bulanan')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'bulanan' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Bulanan</button>
            </div>

            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {reportMode === 'harian' ? (
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none" />
              ) : (
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full pl-11 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[11px] font-black outline-none" />
              )}
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
            {reportMode === 'harian' ? (
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
                      <td colSpan={5} className="py-32 text-center opacity-30">
                        <div className="flex flex-col items-center gap-4">
                          <UsersIcon className="w-12 h-12" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data di rombel ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-5">Siswa</th>
                    <th className="px-3 py-5 text-center">Hadir</th>
                    <th className="px-3 py-5 text-center">Haid</th>
                    <th className="px-3 py-5 text-center">Izin</th>
                    <th className="px-3 py-5 text-center">Sakit</th>
                    <th className="px-3 py-5 text-center">Alpha</th>
                    <th className="px-4 py-5 text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={7} className="py-24 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                  ) : monthlySummary.length > 0 ? (
                    monthlySummary.map((s: any) => (
                      <tr key={s.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4"><div className="flex flex-col"><span className="font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">{s.namaLengkap}</span><span className="text-[8px] font-mono text-indigo-500">ID: {s.idUnik}</span></div></td>
                        <td className="px-3 py-4 text-center font-black text-emerald-600">{s.hadir}</td>
                        <td className="px-3 py-4 text-center font-black text-pink-600">{s.haid}</td>
                        <td className="px-3 py-4 text-center font-black text-amber-600">{s.izin}</td>
                        <td className="px-3 py-4 text-center font-black text-sky-600">{s.sakit}</td>
                        <td className="px-3 py-4 text-center font-black text-rose-600">{s.alpha}</td>
                        <td className="px-4 py-4 text-center"><span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-black">{s.presentRate}%</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-32 text-center opacity-30">
                        <div className="flex flex-col items-center gap-4">
                          <UsersIcon className="w-12 h-12" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada data bulanan di rombel ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input type="text" placeholder="CARI NAMA SISWA..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-bold outline-none shadow-inner" />
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
                                            {showDetailColumns ? (
                                                <>
                                                    <th className="w-12 py-3 text-center border-r border-slate-100 dark:border-slate-800">Masuk</th>
                                                    <th className="w-12 py-3 text-center border-r border-slate-100 dark:border-slate-800">Duha</th>
                                                    <th className="w-12 py-3 text-center border-r border-slate-100 dark:border-slate-800">Zuhur</th>
                                                    <th className="w-12 py-3 text-center border-r border-slate-100 dark:border-slate-800">Ashar</th>
                                                    <th className="w-12 py-3 text-center">Pulang</th>
                                                </>
                                            ) : (
                                                <th className="py-3 text-center">M-D-Z-A-P</th>
                                            )}
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
                                                
                                                {showDetailColumns ? (
                                                    <>
                                                        <TimeCell rawTime={s.att.checkIn} />
                                                        <TimeCell rawTime={s.att.duha} />
                                                        <TimeCell rawTime={s.att.zuhur} />
                                                        <TimeCell rawTime={s.att.ashar} />
                                                        <TimeCell rawTime={s.att.checkOut} />
                                                    </>
                                                ) : (
                                                    <td className="px-2 py-2.5">
                                                        <div className="flex justify-center gap-1">
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
                                                <td colSpan={showDetailColumns ? 7 : 3} className="py-12 text-center opacity-30">
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
