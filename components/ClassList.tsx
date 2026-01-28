
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db, auth, isMockMode } from '../services/firebase';
import { Student, UserRole, Teacher, ClassData } from '../types';
import { 
    BuildingLibraryIcon, UserIcon, ArrowPathIcon, Loader2, ChevronDownIcon,
    PlusIcon, PencilIcon, TrashIcon, BookOpenIcon,
    StarIcon, SaveIcon, ArrowLeftIcon, ArrowRightIcon, BriefcaseIcon, 
    CheckCircleIcon, UsersIcon, Search, XCircleIcon,
    SparklesIcon, IdentificationIcon, ChartBarIcon, CalendarIcon,
    FileSpreadsheet, ShieldCheckIcon, ArrowDownTrayIcon, HeartIcon
} from './Icons';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { updateClassSubjects } from '../services/classService';
import { bulkImportStudents, updateStudent, deleteStudent } from '../services/studentService';

const ClassList: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [activeTab, setActiveTab] = useState<'personalia' | 'students' | 'subjects'>('personalia');
  
  // Data State
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingData, setImportingData] = useState(false);

  const subjectFileInputRef = useRef<HTMLInputElement>(null);
  const studentImportInputRef = useRef<HTMLInputElement>(null);

  // Modals for Classes
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);
  const [newClassData, setNewClassData] = useState({ name: '', level: '10', teacherId: '', academicYear: '' });

  // Modals for Students
  const [isStudentEditModalOpen, setIsStudentEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);

  // Edit State for Detail
  const [editDetail, setEditDetail] = useState<Partial<ClassData>>({});

  // Fix for line 1045 - Move role definition before JSX use
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
      const unsubscribeAuth = auth?.onAuthStateChanged(user => {
          if (!user && !isMockMode) {
              setLoading(false);
              return;
          }

          if (isMockMode) {
              setClasses([
                  { id: '1', name: 'X IPA 1', level: '10', teacherId: 't1', teacherName: 'Budi Santoso, S.Pd', academicYear: '2023/2024', subjects: ['MATEMATIKA', 'FISIKA', 'BIOLOGI'] },
                  { id: '2', name: 'XI IPS 2', level: '11', teacherId: 't2', teacherName: 'Siti Aminah, M.Ag', academicYear: '2023/2024' },
                  { id: '3', name: 'XII AGAMA 1', level: '12', teacherId: 't3', teacherName: 'H. Abdullah, Lc', academicYear: '2024/2025' },
              ]);
              setAllStudents([
                  { id: '1', namaLengkap: 'ADELIA SRI SUNDARI', idUnik: '25002', tingkatRombel: 'X IPA 1', status: 'Aktif', jenisKelamin: 'Perempuan', nisn: '0086806440' } as Student
              ]);
              setAcademicYears([
                  { name: '2023/2024', semester: 'Genap', isActive: true },
                  { name: '2024/2025', semester: 'Ganjil', isActive: false }
              ]);
              setLoading(false);
              return;
          }

          if (!db) return;

          const unsubClasses = db.collection('classes').onSnapshot(
              snap => setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassData))),
              err => { console.warn("Class Sync Error:", err.message); setLoading(false); }
          );

          const unsubStudents = db.collection('students').onSnapshot(
              snap => setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))),
              err => console.warn("Student Sync Error:", err.message)
          );

          const unsubTeachers = db.collection('teachers').onSnapshot(
              snap => setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher))),
              err => { console.warn("Teacher Sync Error:", err.message); }
          );

          const unsubYears = db.collection('academic_years').onSnapshot(
              snap => {
                  const years = snap.docs.map(d => d.data());
                  setAcademicYears(years);
                  const active = years.find(y => y.isActive);
                  if (active) setNewClassData(prev => ({ ...prev, academicYear: active.name }));
              }
          );

          setLoading(false);
          return () => { unsubClasses(); unsubStudents(); unsubTeachers(); unsubYears(); };
      });

      return () => unsubscribeAuth?.();
  }, []);

  const handleExportMasterStudents = () => {
    if (allStudents.length === 0) {
        toast.error("Database siswa kosong.");
        return;
    }

    const dataToExport = allStudents
        .sort((a, b) => (a.tingkatRombel || '').localeCompare(b.tingkatRombel || '') || a.namaLengkap.localeCompare(b.namaLengkap))
        .map((s, i) => ({
            'No': i + 1,
            'Nama Lengkap': s.namaLengkap,
            'NISN': s.nisn,
            'ID Unik': s.idUnik || '-',
            'Rombel': s.tingkatRombel,
            'NIK': s.nik || '-',
            'Email': s.email || '-',
            'Gender': s.jenisKelamin,
            'Status': s.status,
            'Tempat Lahir': s.tempatLahir || '-',
            'Tanggal Lahir': s.tanggalLahir || '-',
            'Alamat': s.alamat || '-',
            'No Telepon': s.noTelepon || '-',
            'Kebutuhan Khusus': s.kebutuhanKhusus || '-',
            'Disabilitas': s.disabilitas || '-',
            'Nomor PIP': s.nomorKIPP_PIP || '-',
            'Ayah': s.namaAyahKandung || '-',
            'Ibu': s.namaIbuKandung || '-',
            'Wali': s.namaWali || '-'
        }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Data Siswa");
    XLSX.writeFile(wb, `Master_Siswa_MAN1HST_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success("Master database siswa berhasil diekspor.");
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.name || !newClassData.academicYear) {
        toast.error("Nama Rombel dan Tahun Pelajaran wajib diisi.");
        return;
    }
    
    setSaving(true);
    const toastId = toast.loading("Mendaftarkan Rombel Baru...");
    
    try {
        const teacher = teachers.find(t => t.id === newClassData.teacherId);
        const rawName = newClassData.name || '';
        const levelPrefix = newClassData.level === '10' ? 'X' : newClassData.level === '11' ? 'XI' : 'XII';
        const fullName = `${levelPrefix} ${rawName.toUpperCase()}`;
        
        const payload = {
            name: fullName,
            level: newClassData.level,
            teacherId: newClassData.teacherId,
            teacherName: teacher?.name || '',
            academicYear: newClassData.academicYear,
            subjects: [],
            createdAt: new Date().toISOString()
        };

        if (isMockMode) {
            await new Promise(r => setTimeout(r, 800));
            setClasses(prev => [...prev, { id: Date.now().toString(), ...payload }]);
        } else if (db) {
            await db.collection('classes').add(payload);
        }

        toast.success(`Rombel ${fullName} berhasil ditambahkan!`, { id: toastId });
        setIsAddModalOpen(false);
        setNewClassData({ ...newClassData, name: '', level: '10', teacherId: '', academicYear: newClassData.academicYear });
    } catch (e) {
        toast.error("Gagal menambahkan rombel.", { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const handleUpdateClass = async () => {
      if (!selectedClass?.id) return;
      
      setSaving(true);
      const toastId = toast.loading("Menyimpan Perubahan Rombel...");

      try {
          const teacher = teachers.find(t => t.id === editDetail.teacherId);
          const updatePayload = {
              teacherId: editDetail.teacherId || '',
              teacherName: teacher?.name || '',
              academicYear: editDetail.academicYear || ''
          };

          if (isMockMode) {
              await new Promise(r => setTimeout(r, 800));
              setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, ...updatePayload } : c));
          } else if (db) {
              await db.collection('classes').doc(selectedClass.id).update(updatePayload);
          }

          setSelectedClass(prev => prev ? { ...prev, ...updatePayload } : null);
          toast.success("Data Berhasil Diperbarui!", { id: toastId });
      } catch (e: any) {
          toast.error("Gagal: " + e.message, { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  const handleSubjectImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedClass?.id) return;

      setImportingData(true);
      const toastId = toast.loading("Memproses Daftar Mapel...");

      try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) throw new Error("File Excel kosong.");

          const newSubjects: string[] = jsonData.map((row: any) => {
              const val = row['Nama Mapel'] || row['Mapel'] || row['Subject'] || row['Mata Pelajaran'] || Object.values(row)[0];
              return String(val || '').trim().toUpperCase();
          }).filter(s => s !== '');

          if (newSubjects.length === 0) throw new Error("Format kolom tidak dikenali.");

          await updateClassSubjects(selectedClass.id, newSubjects);
          
          if (isMockMode) {
              setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, subjects: newSubjects } : c));
          }
          
          setSelectedClass(prev => prev ? ({ ...prev, subjects: newSubjects }) : null);
          toast.success(`Berhasil mengimpor ${newSubjects.length} Mata Pelajaran!`, { id: toastId });
      } catch (err: any) {
          toast.error("Gagal impor: " + err.message, { id: toastId });
      } finally {
          setImportingData(false);
          if (subjectFileInputRef.current) subjectFileInputRef.current.value = '';
      }
  };

  const handleStudentExport = () => {
    if (!selectedClass) return;
    const studentsInClass = allStudents.filter(s => s.tingkatRombel === selectedClass.name);
    
    if (studentsInClass.length === 0) {
        toast.error("Tidak ada data siswa untuk diekspor.");
        return;
    }

    const dataToExport = studentsInClass.map((s, i) => ({
        'No': i + 1,
        'Nama Lengkap': s.namaLengkap,
        'NISN': s.nisn,
        'ID Unik': s.idUnik || '-',
        'NIK': s.nik || '-',
        'Email': s.email || '-',
        'Gender': s.jenisKelamin,
        'Tempat Lahir': s.tempatLahir || '-',
        'Tanggal Lahir': s.tanggalLahir || '-',
        'Alamat': s.alamat || '-',
        'No Telepon': s.noTelepon || '-',
        'Kebutuhan Khusus': s.kebutuhanKhusus || '-',
        'Disabilitas': s.disabilitas || '-',
        'Nomor PIP': s.nomorKIPP_PIP || '-',
        'Ayah': s.namaAyahKandung || '-',
        'Ibu': s.namaIbuKandung || '-',
        'Wali': s.namaWali || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa");
    XLSX.writeFile(wb, `Siswa_${selectedClass.name.replace(' ', '_')}.xlsx`);
    toast.success("File Excel berhasil diunduh.");
  };

  const handleStudentImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;

    setImportingData(true);
    const toastId = toast.loading("Mengimpor data siswa ke rombel...");

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) throw new Error("File Excel kosong.");

        const studentsToImport: Student[] = jsonData.map((row: any) => {
            const nama = row['Nama Lengkap'] || row['Nama'] || row['DisplayName'];
            const nisn = String(row['NISN'] || row['nisn'] || '');
            
            if (!nama || !nisn) return null;

            return {
                namaLengkap: String(nama).toUpperCase(),
                nisn: nisn,
                idUnik: row['ID Unik'] || row['idUnik'] || nisn,
                nik: String(row['NIK'] || row['nik'] || ''),
                email: String(row['Email'] || row['email'] || ''),
                jenisKelamin: (row['Gender'] || row['Jenis Kelamin'] || '').toLowerCase().includes('p') ? 'Perempuan' : 'Laki-laki',
                tempatLahir: String(row['Tempat Lahir'] || ''),
                tanggalLahir: String(row['Tanggal Lahir'] || ''),
                tingkatRombel: selectedClass.name,
                status: 'Aktif',
                alamat: String(row['Alamat'] || ''),
                noTelepon: String(row['No Telepon'] || row['HP'] || ''),
                kebutuhanKhusus: String(row['Kebutuhan Khusus'] || '-'),
                disabilitas: String(row['Disabilitas'] || '-'),
                nomorKIPP_PIP: String(row['Nomor PIP'] || ''),
                namaAyahKandung: String(row['Ayah'] || ''),
                namaIbuKandung: String(row['Ibu'] || ''),
                namaWali: String(row['Wali'] || '')
            } as Student;
        }).filter(Boolean) as Student[];

        if (studentsToImport.length === 0) throw new Error("Format file tidak sesuai (Wajib ada Nama & NISN).");

        if (isMockMode) {
            await new Promise(r => setTimeout(r, 1000));
            setAllStudents(prev => [...prev, ...studentsToImport]);
        } else {
            await bulkImportStudents(studentsToImport);
        }

        toast.success(`Berhasil mengimpor ${studentsToImport.length} siswa ke ${selectedClass.name}`, { id: toastId });
    } catch (err: any) {
        toast.error("Gagal impor: " + err.message, { id: toastId });
    } finally {
        setImportingData(false);
        if (studentImportInputRef.current) studentImportInputRef.current.value = '';
    }
  };

  const handleRemoveSubject = async (subjectToRemove: string) => {
      if (!selectedClass?.id || !selectedClass.subjects) return;
      
      const confirm = window.confirm(`Hapus mata pelajaran ${subjectToRemove} dari rombel ini?`);
      if (!confirm) return;

      const updatedSubjects = selectedClass.subjects.filter(s => s !== subjectToRemove);
      
      try {
          await updateClassSubjects(selectedClass.id, updatedSubjects);
          if (isMockMode) {
            setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, subjects: updatedSubjects } : c));
          }
          setSelectedClass(prev => prev ? ({ ...prev, subjects: updatedSubjects }) : null);
          toast.success("Mata pelajaran dihapus.");
      } catch (e) {
          toast.error("Gagal menghapus mata pelajaran.");
      }
  };

  const handleOpenDetail = (cls: ClassData) => {
      setSelectedClass(cls);
      setEditDetail({ ...cls });
      setView('detail');
      setActiveTab('personalia');
  };

  const handleOpenDeleteModal = (e: React.MouseEvent | null, cls: ClassData) => {
      if (e) e.stopPropagation();
      setClassToDelete(cls);
      setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
      if (!classToDelete?.id) return;
      
      setSaving(true);
      const toastId = toast.loading(`Menghapus data permanen ${classToDelete.name}...`);
      
      try {
          if (isMockMode) {
              await new Promise(r => setTimeout(r, 1200));
              setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
          } else if (db) {
              await db.collection('classes').doc(classToDelete.id).delete();
          }
          
          toast.success(`Rombel ${classToDelete.name} telah dihapus.`, { id: toastId });
          setIsDeleteModalOpen(false);
          setClassToDelete(null);
          if (view === 'detail') setView('list');
      } catch (err: any) {
          toast.error("Gagal menghapus: " + err.message, { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  // --- Student Management Functions ---
  const handleEditStudent = (student: Student) => {
      setEditingStudent({ ...student });
      setIsStudentEditModalOpen(true);
  };

  const handleDeleteStudent = async (student: Student) => {
      if (!student.id) return;
      if (window.confirm(`Hapus permanen data siswa ${student.namaLengkap}? Tindakan ini tidak dapat dibatalkan.`)) {
          const toastId = toast.loading("Menghapus data siswa...");
          try { 
              await deleteStudent(student.id); 
              toast.success("Data siswa berhasil dihapus.", { id: toastId }); 
          } catch (e) { 
              toast.error("Gagal menghapus data siswa.", { id: toastId }); 
          }
      }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStudent?.id || !editingStudent.namaLengkap || !editingStudent.nisn) return;
      
      setSaving(true);
      const toastId = toast.loading("Menyimpan data siswa...");
      try {
          await updateStudent(editingStudent.id, editingStudent);
          toast.success("Profil siswa diperbarui.", { id: toastId });
          setIsStudentEditModalOpen(false);
          setEditingStudent(null);
      } catch (error) {
          toast.error("Gagal menyimpan data.");
      } finally {
          setSaving(false);
      }
  };

  const filteredClassesList = useMemo(() => {
      return [...classes].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
  }, [classes]);

  const selectedClassStudents = useMemo(() => {
      if (!selectedClass) return [];
      return allStudents.filter(s => s.tingkatRombel === selectedClass.name)
          .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
  }, [selectedClass, allStudents]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden transition-colors duration-500">
      {/* Header */}
      <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-5 py-4 flex items-center justify-between z-40 sticky top-0 border-b border-slate-100 dark:border-slate-800 safe-pt">
          <div className="flex items-center gap-4">
              <button onClick={view === 'detail' ? () => setView('list') : onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-all active:scale-90"><ArrowLeftIcon className="w-5 h-5" /></button>
              <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                    {view === 'detail' ? (selectedClass?.name || 'Detail Rombel') : 'Rombel Madrasah'}
                  </h2>
                  <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1.5">
                    {view === 'detail' && selectedClass ? `TAHUN PELAJARAN: ${selectedClass.academicYear}` : 'DATABASE AKADEMIK'}
                  </p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              {view === 'detail' ? (
                canManage && selectedClass && (
                    <button 
                      onClick={(e) => handleOpenDeleteModal(e, selectedClass)}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 active:scale-90 transition-all"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )
              ) : (
                canManage && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportMasterStudents}
                            className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" /> Ekspor Master
                        </button>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" /> Tambah
                        </button>
                    </div>
                )
              )}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p></div>
          ) : view === 'list' ? (
              <div className="p-5 lg:p-8 space-y-6 pb-40 animate-in fade-in duration-700">
                  {/* Class Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredClassesList.map(cls => {
                          const classStudents = allStudents.filter(s => s.tingkatRombel === cls.name);
                          const maleCount = classStudents.filter(s => s.jenisKelamin === 'Laki-laki').length;
                          const femaleCount = classStudents.length - maleCount;
                          
                          return (
                          <div key={cls.id} onClick={() => handleOpenDetail(cls)} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group relative overflow-hidden flex flex-col min-h-[180px]">
                              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                              <div className="flex justify-between items-start mb-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${cls.level === '12' ? 'bg-rose-50 text-rose-600' : cls.level === '11' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>TK {cls.level}</span>
                                        <span className="text-[9px] font-black text-slate-300">•</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cls.academicYear}</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{cls.name}</h4>
                                    
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                                            <span className="text-[7px] font-black text-blue-400 uppercase">L:</span>
                                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400">{maleCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md border border-rose-100 dark:border-blue-800/50">
                                            <span className="text-[7px] font-black text-rose-400 uppercase">P:</span>
                                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400">{femaleCount}</span>
                                        </div>
                                    </div>
                                  </div>
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><ArrowRightIcon className="w-4 h-4" /></div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/20 transition-all mt-auto">
                                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"><BriefcaseIcon className="w-3.5 h-3.5 text-indigo-500" /></div>
                                  <div className="min-w-0 flex-1"><p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Wali Rombel</p><p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate leading-none mt-0.5">{cls.teacherName || 'BELUM DIATUR'}</p></div>
                                  {canManage && (<button onClick={(e) => handleOpenDeleteModal(e, cls)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>)}
                              </div>
                          </div>
                          );
                      })}
                  </div>

                  {canManage && (
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all group bg-white/50 dark:bg-[#151E32]/20 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                      >
                          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 transition-all"><PlusIcon className="w-8 h-8" /></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tambah Unit Rombel Baru</span>
                      </button>
                  )}
              </div>
          ) : (
              /* Detail View */
              <div className="max-w-4xl mx-auto p-5 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><BuildingLibraryIcon className="w-40 h-40" /></div>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                          <div>
                              <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20"><StarIcon className="w-4 h-4 text-yellow-300" /></div><span className="text-[10px] font-black uppercase tracking-widest">Tingkat {selectedClass?.level} • {selectedClass?.academicYear}</span></div>
                              <h2 className="text-3xl font-black uppercase tracking-tight">{selectedClass?.name}</h2>
                              <p className="text-xs text-indigo-100 font-medium mt-1">Populasi: <span className="font-black text-white">{selectedClassStudents.length} Peserta Didik</span></p>
                          </div>
                          <div className="flex gap-4">
                              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Laki-laki</p><p className="text-lg font-black">{selectedClassStudents.filter(s => s.jenisKelamin === 'Laki-laki').length}</p></div>
                              <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center"><p className="text-[8px] font-black uppercase tracking-widest opacity-60">Perempuan</p><p className="text-lg font-black">{selectedClassStudents.filter(s => s.jenisKelamin === 'Perempuan').length}</p></div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex p-1.5 bg-slate-100 dark:bg-[#151E32] rounded-[1.8rem] w-full border border-slate-200 dark:border-slate-700 shadow-inner">
                      <button onClick={() => setActiveTab('personalia')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'personalia' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><BriefcaseIcon className="w-3.5 h-3.5" /> Personalia</button>
                      <button onClick={() => setActiveTab('students')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><UsersIcon className="w-3.5 h-3.5" /> Siswa</button>
                      <button onClick={() => setActiveTab('subjects')} className={`flex-1 py-3.5 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'subjects' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}><BookOpenIcon className="w-3.5 h-3.5" /> Mapel</button>
                  </div>

                  {activeTab === 'personalia' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white dark:bg-[#151E32] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><BriefcaseIcon className="w-5 h-5" /></div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wali Kelas</h4></div>
                                  <div className="relative group">
                                      <select value={editDetail.teacherId || ''} onChange={e => setEditDetail({...editDetail, teacherId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer uppercase transition-all shadow-inner">
                                          <option value="">-- PILIH GURU --</option>
                                          {teachers.map(t => <option key={t.id} value={t.id}>{(t.name || '').toUpperCase()}</option>)}
                                      </select>
                                      <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                  </div>
                              </div>
                              <div className="bg-white dark:bg-[#151E32] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600"><CalendarIcon className="w-5 h-5" /></div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tahun Pelajaran</h4></div>
                                  <div className="relative group">
                                      <select value={editDetail.academicYear || ''} onChange={e => setEditDetail({...editDetail, academicYear: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none cursor-pointer transition-all shadow-inner">
                                          {academicYears.map(y => <option key={y.name} value={y.name}>{y.name}</option>)}
                                      </select>
                                      <ChevronDownIcon className="absolute right-4 top-4.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                  </div>
                              </div>
                          </div>
                          
                          {canManage && (
                              <button 
                                onClick={handleUpdateClass}
                                disabled={saving}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                              >
                                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><SaveIcon className="w-4 h-4"/> Simpan Perubahan Personal</>}
                              </button>
                          )}
                      </div>
                  )}

                  {activeTab === 'students' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><UsersIcon className="w-6 h-6" /></div>
                                  <div>
                                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-none">Manajemen Siswa Rombel</h4>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">Kolektif Sinkronisasi Data Peserta Didik</p>
                                  </div>
                              </div>
                              {canManage && (
                                  <div className="flex flex-wrap gap-2">
                                      <button 
                                          onClick={handleStudentExport}
                                          className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                      >
                                          <ArrowDownTrayIcon className="w-4 h-4" /> Ekspor Excel
                                      </button>
                                      <button 
                                          onClick={() => studentImportInputRef.current?.click()}
                                          disabled={importingData}
                                          className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                      >
                                          {importingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                                          Impor Excel
                                      </button>
                                      <input type="file" ref={studentImportInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleStudentImport} />
                                  </div>
                              )}
                          </div>

                          <div className="bg-white dark:bg-[#151E32] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left">
                                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                          <tr>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">No</th>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Peserta Didik</th>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NISN</th>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gender</th>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                          {selectedClassStudents.length > 0 ? (
                                              selectedClassStudents.map((student, idx) => (
                                                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                      <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">{idx + 1}</td>
                                                      <td className="px-6 py-4">
                                                          <div className="flex items-center gap-3">
                                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${student.jenisKelamin === 'Perempuan' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                  {student.namaLengkap.charAt(0)}
                                                              </div>
                                                              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{student.namaLengkap}</span>
                                                          </div>
                                                      </td>
                                                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">{student.nisn}</td>
                                                      <td className="px-6 py-4 text-center">
                                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${student.jenisKelamin === 'Perempuan' ? 'text-rose-500 bg-rose-50' : 'text-blue-500 bg-blue-50'}`}>
                                                              {student.jenisKelamin === 'Perempuan' ? 'P' : 'L'}
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-4 text-center">
                                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                              {student.status}
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-4 text-center">
                                                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                              <button onClick={() => handleEditStudent(student)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-500 hover:bg-indigo-50 transition-colors">
                                                                  <PencilIcon className="w-4 h-4" />
                                                              </button>
                                                              <button onClick={() => handleDeleteStudent(student)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 transition-colors">
                                                                  <TrashIcon className="w-4 h-4" />
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                              ))
                                          ) : (
                                              <tr>
                                                  <td colSpan={6} className="px-6 py-20 text-center">
                                                      <UsersIcon className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada siswa terdaftar di rombel ini</p>
                                                  </td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'subjects' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><BookOpenIcon className="w-6 h-6" /></div>
                                  <div>
                                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-none">Mata Pelajaran Rombel</h4>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-widest">Atur Daftar Mapel Khusus Kelas Ini</p>
                                  </div>
                              </div>
                              {canManage && (
                                  <div className="flex gap-2">
                                      <button 
                                          onClick={() => subjectFileInputRef.current?.click()}
                                          disabled={importingData}
                                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                      >
                                          {importingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                                          Impor Mapel (Excel)
                                      </button>
                                      <input type="file" ref={subjectFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleSubjectImport} />
                                  </div>
                              )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {selectedClass?.subjects && selectedClass.subjects.length > 0 ? (
                                  selectedClass.subjects.map((sub, idx) => (
                                      <div key={idx} className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[10px] font-black text-indigo-500">{idx + 1}</div>
                                              <span className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{sub}</span>
                                          </div>
                                          {canManage && (
                                              <button onClick={() => handleRemoveSubject(sub)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                  <TrashIcon className="w-4 h-4" />
                                              </button>
                                          )}
                                      </div>
                                  ))
                              ) : (
                                  <div className="col-span-full py-20 text-center bg-white dark:bg-[#151E32] rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                                      <BookOpenIcon className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada mata pelajaran terdaftar</p>
                                      <p className="text-[8px] text-slate-400 mt-2">Unggah file Excel untuk mengisi daftar mapel rombel ini.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* ADD CLASS MODAL */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><BuildingLibraryIcon className="w-40 h-40"/></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">Registrasi Rombel</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2">Database Akademik Madrasah</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                          <XCircleIcon className="w-8 h-8" />
                      </button>
                  </div>

                  <form onSubmit={handleAddClass} className="space-y-6 relative z-10">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tingkat</label>
                          <div className="grid grid-cols-3 gap-3">
                              {['10', '11', '12'].map(lvl => (
                                  <button 
                                    key={lvl} type="button" 
                                    onClick={() => setNewClassData({...newClassData, level: lvl})}
                                    className={`py-4 rounded-2xl border font-black text-xs transition-all ${newClassData.level === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                  >
                                      TK {lvl}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Rombel</label>
                            <input 
                                required type="text" 
                                value={newClassData.name} 
                                onChange={e => setNewClassData({...newClassData, name: (e.target.value || '').toUpperCase()})} 
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-4 text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                                placeholder="MISAL: IPA 1" 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tahun Pelajaran</label>
                            <div className="relative">
                                <select 
                                    required value={newClassData.academicYear} 
                                    onChange={e => setNewClassData({...newClassData, academicYear: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none appearance-none cursor-pointer shadow-inner"
                                >
                                    <option value="">Pilih TA</option>
                                    {academicYears.map(y => <option key={y.name} value={y.name}>{y.name}</option>)}
                                </select>
                                <ChevronDownIcon className="absolute right-4 top-5 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wali Rombel (Opsional)</label>
                          <div className="relative">
                              <select 
                                value={newClassData.teacherId} 
                                onChange={e => setNewClassData({...newClassData, teacherId: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-5 pr-10 text-xs font-bold text-slate-800 dark:text-white outline-none appearance-none cursor-pointer shadow-inner"
                              >
                                  <option value="">-- PILIH GURU --</option>
                                  {teachers.map(t => <option key={t.id} value={t.id}>{(t.name || '').toUpperCase()}</option>)}
                              </select>
                              <ChevronDownIcon className="absolute right-4 top-5 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                      </div>

                      <button 
                        type="submit" disabled={saving}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                      >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><SaveIcon className="w-4 h-4"/> Daftarkan Unit Rombel</>}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {isStudentEditModalOpen && editingStudent && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh] border border-white/10 relative overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10">
                      <div>
                          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">Edit Profil Siswa</h3>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-2 tracking-widest">Update Informasi Database</p>
                      </div>
                      <button onClick={() => setIsStudentEditModalOpen(false)} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                          <XCircleIcon className="w-8 h-8" />
                      </button>
                  </div>

                  <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 pb-12">
                      <form id="studentEditForm" onSubmit={handleSaveStudentEdit} className="space-y-10">
                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">
                                  <IdentificationIcon className="w-3.5 h-3.5" /> Data Identitas
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                                      <input required type="text" value={editingStudent.namaLengkap || ''} onChange={e => setEditingStudent({...editingStudent, namaLengkap: (e.target.value || '').toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN *</label>
                                      <input required type="text" value={editingStudent.nisn || ''} onChange={e => setEditingStudent({...editingStudent, nisn: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIK</label>
                                      <input type="text" value={editingStudent.nik || ''} onChange={e => setEditingStudent({...editingStudent, nik: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-50 dark:border-emerald-900/30 pb-2">
                                  <UserIcon className="w-3.5 h-3.5" /> Profil Personal
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Kelamin</label>
                                      <select value={editingStudent.jenisKelamin} onChange={e => setEditingStudent({...editingStudent, jenisKelamin: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold">
                                          <option value="Laki-laki">Laki-laki</option>
                                          <option value="Perempuan">Perempuan</option>
                                      </select>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                      <input type="text" value={editingStudent.noTelepon || ''} onChange={e => setEditingStudent({...editingStudent, noTelepon: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5 md:col-span-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat</label>
                                      <textarea rows={2} value={editingStudent.alamat || ''} onChange={e => setEditingStudent({...editingStudent, alamat: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold resize-none" />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-5">
                              <h5 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-amber-50 dark:border-amber-900/30 pb-2">
                                  <UsersIcon className="w-3.5 h-3.5" /> Data Orang Tua
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ayah</label>
                                      <input type="text" value={editingStudent.namaAyahKandung || ''} onChange={e => setEditingStudent({...editingStudent, namaAyahKandung: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ibu</label>
                                      <input type="text" value={editingStudent.namaIbuKandung || ''} onChange={e => setEditingStudent({...editingStudent, namaIbuKandung: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Wali</label>
                                      <input type="text" value={editingStudent.namaWali || ''} onChange={e => setEditingStudent({...editingStudent, namaWali: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold" />
                                  </div>
                              </div>
                          </div>
                      </form>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex gap-4 z-10">
                      <button onClick={() => setIsStudentEditModalOpen(false)} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-2xl border border-slate-200 active:scale-95 transition-all text-[10px] uppercase tracking-widest">Batal</button>
                      <button type="submit" form="studentEditForm" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                        <span className="uppercase tracking-[0.2em] text-[10px]">Simpan Perubahan</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- DELETE CLASS CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && classToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[3rem] p-8 shadow-[0_35px_60px_-15px_rgba(225,29,72,0.3)] animate-in zoom-in duration-300 border border-rose-100/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.05] rotate-12 text-rose-500"><TrashIcon className="w-32 h-32"/></div>
                  
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 dark:border-rose-900/30">
                      <ShieldCheckIcon className="w-10 h-10 text-rose-600 animate-pulse" />
                  </div>

                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Hapus Unit Rombel?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-8 px-2">
                    Tindakan ini akan menghapus data rombel <span className="font-black text-rose-600">"{classToDelete.name}"</span> secara permanen dari sistem.
                  </p>

                  <div className="space-y-3 relative z-10">
                      <button 
                        onClick={handleConfirmDelete}
                        disabled={saving}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                          YA, HAPUS SEKARANG
                      </button>
                      <button 
                        onClick={() => { setIsDeleteModalOpen(false); setClassToDelete(null); }}
                        disabled={saving}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                      >
                          BATALKAN
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClassList;
