import React, { useState, useEffect, useMemo, useCallback } from 'react';
// UI Imports - specific for this project structure
import { db, auth, isMockMode } from '../services/firebase';
import { Student, ViewState } from '../types';
import { toast } from 'sonner';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { 
    CalendarIcon, Loader2, ChevronLeft, ChevronRight, 
    FileText, FileSpreadsheet, 
    Search, QrCodeIcon, ArrowLeftIcon, ChevronDownIcon,
    CameraIcon, ClockIcon
} from './Icons';

// Local Types to replace missing imports
interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    class: string;
    date: string;
    status: 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';
    checkIn: string | null;
    checkOut: string | null;
    duha: string | null;
    zuhur: string | null;
    ashar: string | null;
}

interface Class {
    id: string;
    name: string;
    teacherId?: string;
}

interface Teacher {
    id: string;
    name: string;
    nip: string;
}

type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpha';

type GradesAndClasses = {
    [grade: string]: string[];
};

type EditableTimes = {
    checkIn: string;
    duha: string;
    zuhur: string;
    ashar: string;
    checkOut: string;
};

interface PresensiProps {
    onBack: () => void;
    onNavigate: (view: ViewState) => void;
}

const Presensi: React.FC<PresensiProps> = ({ onBack, onNavigate }) => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  const [classesSnapshot, setClassesSnapshot] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [teachersSnapshot, setTeachersSnapshot] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scheduleDoc, setScheduleDoc] = useState<any>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const [attendanceSnapshot, setAttendanceSnapshot] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('Alpha');
  const [editableTimes, setEditableTimes] = useState<EditableTimes>({
    checkIn: '', duha: '', zuhur: '', ashar: '', checkOut: ''
  });
  
  // Check Auth
  useEffect(() => {
    if (isMockMode) {
        setAuthLoading(false);
        return;
    }
    if (auth) {
        const unsubscribe = auth.onAuthStateChanged(() => {
            setAuthLoading(false);
        });
        return () => unsubscribe();
    } else {
        setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isMockMode) {
        // MOCK DATA LOADING
        setAllStudents([
            { id: '1', namaLengkap: 'Ahmad Dahlan', tingkatRombel: 'X IPA 1', nisn: '123' } as unknown as Student,
            { id: '2', namaLengkap: 'Siti Aminah', tingkatRombel: 'X IPA 1', nisn: '124' } as unknown as Student,
            { id: '3', namaLengkap: 'Budi Santoso', tingkatRombel: 'XI IPS 1', nisn: '125' } as unknown as Student,
        ]);
        setClassesSnapshot([
            { id: 'c1', name: 'X IPA 1' },
            { id: 'c2', name: 'XI IPS 1' }
        ]);
        setTeachersSnapshot([]);
        setLoadingStudents(false);
        setLoadingClasses(false);
        setLoadingTeachers(false);
        setLoadingSchedule(false);
        return;
    }

    if (!db) {
        return;
    }

    // Use Namespaced SDK syntax for Firestore
    const unsubStudents = db.collection("students").onSnapshot(snapshot => {
      setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoadingStudents(false);
    }, error => {
      console.error(error);
      setLoadingStudents(false);
    });
    
    const unsubClasses = db.collection("classes").onSnapshot(snapshot => {
      setClassesSnapshot(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
      setLoadingClasses(false);
    }, error => {
       console.error(error);
      setLoadingClasses(false);
    });

    const unsubTeachers = db.collection("teachers").onSnapshot(snapshot => {
      setTeachersSnapshot(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
      setLoadingTeachers(false);
    }, error => {
       console.error(error);
      setLoadingTeachers(false);
    });

    const unsubSchedule = db.collection("settings").doc("attendanceSchedule").onSnapshot(snapshot => {
      if (snapshot.exists) {
        setScheduleDoc(snapshot);
      }
      setLoadingSchedule(false);
    }, error => {
       console.error(error);
      setLoadingSchedule(false);
    });

    return () => {
      unsubStudents();
      unsubClasses();
      unsubTeachers();
      unsubSchedule();
    }
  }, [authLoading]);

  const { gradesAndClasses, sortedGrades } = useMemo(() => {
    const gradeMap: GradesAndClasses = {};

    allStudents.forEach(student => {
        const gradeName = student.tingkatRombel;
        if (gradeName) {
            const grade = gradeName.split(' ')[0];
            if (grade) {
                if (!gradeMap[grade]) {
                    gradeMap[grade] = [];
                }
                if (!gradeMap[grade].includes(gradeName)) {
                    gradeMap[grade].push(gradeName);
                }
            }
        }
    });

    for (const grade in gradeMap) {
        gradeMap[grade].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    const sorted = Object.keys(gradeMap).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

    return { gradesAndClasses: gradeMap, sortedGrades: sorted };
  }, [allStudents]);
  
  const [currentGradeIndex, setCurrentGradeIndex] = useState(0);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);

  useEffect(() => {
    setCurrentClassIndex(0);
  }, [currentGradeIndex]);

  const selectedGrade = sortedGrades[currentGradeIndex] || null;
  const classesForSelectedGrade = selectedGrade ? gradesAndClasses[selectedGrade] || [] : [];
  const selectedClass = classesForSelectedGrade[currentClassIndex];
  
  const selectedGradeLabel = selectedGrade ? `Tingkat ${selectedGrade}` : "Semua Tingkat";

  useEffect(() => {
    if (!date || authLoading) return;
    setLoadingAttendance(true);

    if (isMockMode) {
        // MOCK ATTENDANCE DATA
        setTimeout(() => {
            setAttendanceSnapshot([
                { 
                    id: 'att1', 
                    studentId: '1', 
                    studentName: 'Ahmad Dahlan', 
                    class: 'X IPA 1',
                    date: format(date, "yyyy-MM-dd"),
                    status: 'Hadir',
                    checkIn: '07:15:00',
                    checkOut: null,
                    duha: null,
                    zuhur: null,
                    ashar: null
                }
            ]);
            setLoadingAttendance(false);
        }, 500);
        return;
    }
    
    if (!db) {
        setLoadingAttendance(false);
        return;
    }

    // Namespaced Query
    const unsubscribe = db.collection("attendance")
        .where("date", "==", format(date, "yyyy-MM-dd"))
        .onSnapshot(snapshot => {
            setAttendanceSnapshot(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
            setLoadingAttendance(false);
        }, error => {
            console.error(error);
            setLoadingAttendance(false);
        });

    return () => unsubscribe();
  }, [date, authLoading]);
  
  const [displayData, setDisplayData] = useState<AttendanceRecord[]>([]);
  
  const getStudentsForFilter = useCallback(() => {
    const query = searchTerm.toLowerCase().trim();
    if (query) {
        return allStudents.filter(s => 
            String(s.namaLengkap || '').toLowerCase().includes(query) ||
            String(s.nisn || '').toLowerCase().includes(query)
        );
    }
    
    if (!selectedGrade) {
        return allStudents;
    }
    if (selectedClass) {
        return allStudents.filter(s => s.tingkatRombel === selectedClass);
    }
    return allStudents.filter(s => String(s.tingkatRombel || '').startsWith(selectedGrade));
  }, [searchTerm, selectedGrade, selectedClass, allStudents]);

  useEffect(() => {
    if (loadingStudents || loadingAttendance || !date) return;

    const studentsToDisplay = getStudentsForFilter();
    
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendanceSnapshot.forEach(record => {
      attendanceMap.set(record.studentId, record);
    });

    const combinedData = studentsToDisplay.map(student => {
      const attendanceRecord = attendanceMap.get(student.id || '');
      if (attendanceRecord) {
        return attendanceRecord;
      }
      return {
        id: `${student.id}_${format(date, "yyyy-MM-dd")}`,
        studentId: student.id || '',
        studentName: student.namaLengkap,
        class: student.tingkatRombel,
        date: format(date, "yyyy-MM-dd"),
        status: 'Alpha',
        checkIn: null,
        checkOut: null,
        duha: null,
        zuhur: null,
        ashar: null,
      } as AttendanceRecord;
    });

    setDisplayData(combinedData);

  }, [attendanceSnapshot, date, loadingStudents, loadingAttendance, getStudentsForFilter, searchTerm]);
  
  const handlePrevDay = () => setDate(prevDate => prevDate ? new Date(prevDate.setDate(prevDate.getDate() - 1)) : null);
  const handleNextDay = () => setDate(prevDate => prevDate ? new Date(prevDate.setDate(prevDate.getDate() + 1)) : null);
  
  const getHomeroomTeacher = useCallback((className: string) => {
    if (!className || !classesSnapshot || !teachersSnapshot) {
      return { name: "( Nama Wali Kelas )", nip: "............................" };
    }
    const classData = classesSnapshot.find(c => c.name === className);
    if (!classData || !classData.teacherId) {
      return { name: "( Nama Wali Kelas )", nip: "............................" };
    }
    const teacherData = teachersSnapshot.find(t => t.id === classData.teacherId);
    return { name: teacherData?.name || "( Wali Tidak Ditemukan )", nip: teacherData?.nip || "............................" };
  }, [classesSnapshot, teachersSnapshot]);

  // Export functions
  const handleExportPDF = () => {
    if (!date) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const className = selectedClass || selectedGradeLabel;
    
    const dateStr = `Hari: ${date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: homeroomTeacher, nip } = getHomeroomTeacher(className);

    const dataForPdf = displayData.filter(record => record.status !== 'Alpha' || record.checkIn);

    if (dataForPdf.length === 0) {
      toast.warning("Tidak ada data kehadiran untuk diekspor ke PDF.");
      return;
    }
    
    doc.setFontSize(16);
    doc.text("Laporan Siswa Kehadiran Harian", 14, 15);
    doc.setFontSize(12);
    doc.text(`Kelas: ${className}`, 14, 22);
    doc.text(dateStr, 14, 29);

    autoTable(doc, {
        startY: 35,
        head: [['No.', 'Nama Lengkap', 'Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang', 'Ket.']],
        body: dataForPdf.map((record, index) => [
            index + 1, record.studentName, record.checkIn || '', record.duha || '',
            record.zuhur || '', record.ashar || '', record.checkOut || '', record.status,
        ]),
    });
    doc.save(`laporan_kehadiran_${className}_${format(date, "yyyy-MM-dd")}.pdf`);
  };

  const handleExportExcel = () => {
      if (!date) return;
      const dataToExport = displayData.map((record, index) => ({
          'No.': index + 1, 'Nama Lengkap': record.studentName, 'Kelas': record.class,
          'Masuk': record.checkIn || '', 'Duha': record.duha || '', 'Zuhur': record.zuhur || '',
          'Ashar': record.ashar || '', 'Pulang': record.checkOut || '', 'Keterangan': record.status,
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Kehadiran");
      XLSX.writeFile(workbook, `laporan-kehadiran-${format(date, "yyyy-MM-dd")}.xlsx`);
  };

    const handleEditClick = (record: AttendanceRecord) => {
        setEditingRecord(record);
        setNewStatus(record.status);
        setEditableTimes({
            checkIn: record.checkIn ? record.checkIn.substring(0, 5) : '',
            duha: record.duha ? record.duha.substring(0, 5) : '',
            zuhur: record.zuhur ? record.zuhur.substring(0, 5) : '',
            ashar: record.ashar ? record.ashar.substring(0, 5) : '',
            checkOut: record.checkOut ? record.checkOut.substring(0, 5) : '',
        });
        setIsEditModalOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!editingRecord) return;
        const updatedData: Partial<AttendanceRecord> = {
            status: newStatus,
            checkIn: editableTimes.checkIn ? `${editableTimes.checkIn}:00` : null,
            duha: editableTimes.duha ? `${editableTimes.duha}:00` : null,
            zuhur: editableTimes.zuhur ? `${editableTimes.zuhur}:00` : null,
            ashar: editableTimes.ashar ? `${editableTimes.ashar}:00` : null,
            checkOut: editableTimes.checkOut ? `${editableTimes.checkOut}:00` : null,
        };
        
        if (isMockMode || !db) {
            // Update local state in mock mode
            const updatedRecord = { ...editingRecord, ...updatedData };
            setAttendanceSnapshot(prev => {
                const existingIndex = prev.findIndex(r => r.id === editingRecord.id);
                if (existingIndex >= 0) {
                    const newArr = [...prev];
                    newArr[existingIndex] = updatedRecord as AttendanceRecord;
                    return newArr;
                }
                return [...prev, updatedRecord as AttendanceRecord];
            });
            toast.success("Status berhasil diperbarui (Simulasi)");
            setIsEditModalOpen(false);
            return;
        }

        try {
             // Namespaced setDoc (ref.set)
             await db.collection("attendance").doc(editingRecord.id).set({ ...editingRecord, ...updatedData }, { merge: true });
             toast.success("Status berhasil diperbarui");
        } catch(e) {
             console.error(e);
             toast.error("Gagal memperbarui status");
        }
        setIsEditModalOpen(false);
    };

    const getStatusVariant = (status: string) => {
      switch (status) {
          case 'Hadir': return 'bg-green-100 text-green-700';
          case 'Terlambat': return 'bg-yellow-100 text-yellow-700';
          case 'Alpha': return 'bg-red-100 text-red-700';
          default: return 'bg-slate-100 text-slate-700';
      }
    };

    const isLoading = authLoading || loadingStudents || loadingAttendance || loadingClasses || loadingTeachers || !date || loadingSchedule;

    return (
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 shadow-sm p-4 pt-8 flex items-center justify-between z-10 sticky top-0 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Presensi Siswa <QrCodeIcon className="w-5 h-5 text-teal-500" />
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Harian & Rekapitulasi {isMockMode && "(Simulasi)"}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => onNavigate(ViewState.ATTENDANCE_HISTORY)}
                    className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-bold flex items-center gap-1"
                >
                    <ClockIcon className="w-4 h-4" /> <span className="hidden sm:inline">Riwayat</span>
                </button>
                <button 
                    onClick={() => onNavigate(ViewState.SCANNER)}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none text-xs font-bold flex items-center gap-1"
                >
                    <CameraIcon className="w-4 h-4" /> <span className="hidden sm:inline">Scan QR</span>
                </button>
            </div>
        </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm space-y-4">
             {/* Date & Filter */}
             <div className="flex flex-wrap items-center justify-between gap-3">
                 <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                     <button onClick={handlePrevDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><ChevronLeft className="w-4 h-4"/></button>
                     <div className="flex items-center gap-2 px-2 text-sm font-medium">
                         <CalendarIcon className="w-4 h-4 text-slate-500" />
                         {/* Standard Date Formatting */}
                         {date ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "Pilih Tanggal"}
                     </div>
                     <button onClick={handleNextDay} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"><ChevronRight className="w-4 h-4"/></button>
                 </div>

                 {/* Grade & Class Filter - Dropdowns */}
                 <div className="flex flex-wrap items-center gap-2">
                     <div className="relative">
                         <select 
                            value={currentGradeIndex}
                            onChange={(e) => {
                                setCurrentGradeIndex(Number(e.target.value));
                                setCurrentClassIndex(0);
                            }}
                            className="appearance-none pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 border border-transparent focus:border-teal-500 focus:ring-0 cursor-pointer"
                         >
                            {sortedGrades.map((grade, idx) => (
                                <option key={grade} value={idx}>Tingkat {grade}</option>
                            ))}
                            {sortedGrades.length === 0 && <option value={0}>Tingkat</option>}
                         </select>
                         <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                     </div>

                     <div className="relative">
                         <select 
                            value={currentClassIndex}
                            onChange={(e) => setCurrentClassIndex(Number(e.target.value))}
                            className="appearance-none pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 border border-transparent focus:border-teal-500 focus:ring-0 cursor-pointer min-w-[100px]"
                         >
                            {classesForSelectedGrade.length > 0 ? (
                                classesForSelectedGrade.map((cls, idx) => (
                                    <option key={cls} value={idx}>{cls}</option>
                                ))
                            ) : (
                                <option value={0}>Semua</option>
                            )}
                         </select>
                         <ChevronDownIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                     </div>
                 </div>

                 {/* Actions */}
                 <div className="flex gap-2">
                     <button onClick={handleExportExcel} className="p-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-200">
                         <FileSpreadsheet className="w-4 h-4" /> Excel
                     </button>
                     <button onClick={handleExportPDF} className="p-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-200">
                         <FileText className="w-4 h-4" /> PDF
                     </button>
                 </div>
             </div>
             
             {/* Search */}
             <div className="relative">
                 <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="Cari nama siswa..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
             </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 text-center w-12">No</th>
                            <th className="px-4 py-3">Nama Lengkap</th>
                            <th className="px-4 py-3 text-center">Masuk</th>
                            <th className="px-4 py-3 text-center">Duha</th>
                            <th className="px-4 py-3 text-center">Zuhur</th>
                            <th className="px-4 py-3 text-center">Ashar</th>
                            <th className="px-4 py-3 text-center">Pulang</th>
                            <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Memuat Data...
                                </td>
                            </tr>
                        ) : displayData.length > 0 ? (
                            displayData.map((record, idx) => (
                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{record.studentName}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{record.checkIn ? record.checkIn.substring(0,5) : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{record.duha ? record.duha.substring(0,5) : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{record.zuhur ? record.zuhur.substring(0,5) : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{record.ashar ? record.ashar.substring(0,5) : '-'}</td>
                                    <td className="px-4 py-3 text-center font-mono text-xs">{record.checkOut ? record.checkOut.substring(0,5) : '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => handleEditClick(record)}
                                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusVariant(record.status)}`}
                                        >
                                            {record.status}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-500">Tidak ada data ditemukan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Edit Modal */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Edit Kehadiran</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <select 
                                value={newStatus} 
                                onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                            >
                                <option value="Hadir">Hadir</option>
                                <option value="Terlambat">Terlambat</option>
                                <option value="Sakit">Sakit</option>
                                <option value="Izin">Izin</option>
                                <option value="Alpha">Alpha</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Masuk</label>
                                <input type="time" className="w-full mt-1 p-2 border rounded-lg text-sm" value={editableTimes.checkIn} onChange={e => setEditableTimes({...editableTimes, checkIn: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Pulang</label>
                                <input type="time" className="w-full mt-1 p-2 border rounded-lg text-sm" value={editableTimes.checkOut} onChange={e => setEditableTimes({...editableTimes, checkOut: e.target.value})} />
                             </div>
                        </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm">Batal</button>
                        <button onClick={handleSaveStatus} className="flex-1 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm">Simpan</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

export default Presensi;