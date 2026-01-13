import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, bulkImportTeachers } from '../services/teacherService';
import { Teacher, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BriefcaseIcon, Search, PlusIcon, PencilIcon, TrashIcon, 
  UserIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon, XCircleIcon, 
  MapPinIcon, AcademicCapIcon, ArrowPathIcon, FileSpreadsheet,
  FileText, ArrowDownTrayIcon, ArrowRightIcon
} from './Icons';

interface TeacherDataProps {
  onBack: () => void;
  userRole: UserRole;
}

const TeacherData: React.FC<TeacherDataProps> = ({ onBack, userRole }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({
      status: 'PNS'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.GURU;

  // --- REALTIME DATA LISTENER ---
  useEffect(() => {
    setLoading(true);

    if (isMockMode) {
        getTeachers().then(data => {
            setTeachers(data);
            setLoading(false);
        });
        return;
    }

    if (!db) {
        setLoading(false);
        return;
    }

    const unsubscribe = db.collection('teachers')
        .orderBy('name')
        .onSnapshot(
            snapshot => {
                const liveData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
                setTeachers(liveData);
                setLoading(false);
            },
            error => {
                console.error("Error fetching realtime teachers:", error);
                if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
                    toast.error("Akses Database Terbatas. Pastikan aturan keamanan (Security Rules) telah dikonfigurasi.");
                    setTeachers([]); // Kosongkan
                } else {
                    toast.error("Gagal memuat data guru.");
                }
                setLoading(false);
            }
        );

    return () => unsubscribe();
  }, []);

  // Derived Statistics
  const stats = useMemo(() => {
      return {
          total: teachers.length,
          pns: teachers.filter(t => t.status === 'PNS').length,
          honorer: teachers.filter(t => t.status === 'Honorer').length,
          pppk: teachers.filter(t => t.status === 'PPPK').length,
          gty: teachers.filter(t => t.status === 'GTY').length
      };
  }, [teachers]);

  // Unique Subjects for Filter
  const uniqueSubjects = useMemo(() => {
      const subjects = teachers.map(t => t.subject).filter(Boolean);
      return Array.from(new Set(subjects)).sort();
  }, [teachers]);

  // Filter Logic
  const processedTeachers = useMemo(() => {
      const lowerQuery = searchQuery.toLowerCase().trim();
      return teachers.filter(t => {
          const name = String(t.name || '').toLowerCase();
          const nip = String(t.nip || '').toLowerCase();
          const subject = String(t.subject || '').toLowerCase();
          
          const matchesSearch = lowerQuery === '' || 
                                name.includes(lowerQuery) || 
                                nip.includes(lowerQuery) ||
                                subject.includes(lowerQuery);
          const matchesSubject = selectedSubject === 'All' || t.subject === selectedSubject;
          const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
          return matchesSearch && matchesSubject && matchesStatus;
      });
  }, [teachers, searchQuery, selectedSubject, selectedStatus]);

  // CRUD Handlers
  const handleEdit = (teacher: Teacher) => {
      setEditingId(teacher.id || null);
      setFormData({ ...teacher });
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
      if (window.confirm(`Hapus data guru ${name}?`)) {
          try {
              await deleteTeacher(id);
              // Optimistic update not needed with onSnapshot
              if (isMockMode) {
                  setTeachers(prev => prev.filter(t => t.id !== id));
              }
              toast.success("Data guru berhasil dihapus");
          } catch (e) {
              toast.error("Gagal menghapus data");
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.subject) {
          toast.error("Nama dan Mata Pelajaran wajib diisi");
          return;
      }

      const toastId = toast.loading("Menyimpan data...");
      try {
          if (editingId) {
              await updateTeacher(editingId, formData);
              // Mock Mode manual update
              if (isMockMode) {
                  setTeachers(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } as Teacher : t));
              }
              toast.success("Data diperbarui", { id: toastId });
          } else {
              const newTeacher = { ...formData, nip: formData.nip || '-' } as Teacher;
              await addTeacher(newTeacher);
              // Mock Mode manual fetch
              if (isMockMode) {
                  const data = await getTeachers();
                  setTeachers(data);
              }
              toast.success("Guru ditambahkan", { id: toastId });
          }
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ status: 'PNS' });
      } catch (e) {
          console.error(e);
          toast.error("Gagal menyimpan", { id: toastId });
      }
  };

  // --- IMPORT / EXPORT HANDLERS ---

  const handleDownloadTemplate = () => {
      const templateData = [
          {
              "Nama Lengkap": "Contoh: Budi Santoso, S.Pd",
              "NIP": "1980xxxx (kosongkan jika tidak ada)",
              "Mata Pelajaran": "Matematika",
              "Status": "PNS",
              "No. Telepon": "0812xxxx",
              "Email": "budi@email.com",
              "Tanggal Lahir": "1980-01-01",
              "Alamat": "Jl. Merdeka No. 1"
          },
          {
              "Nama Lengkap": "Contoh: Siti Aminah",
              "NIP": "-",
              "Mata Pelajaran": "Bahasa Inggris",
              "Status": "Honorer",
              "No. Telepon": "0852xxxx",
              "Email": "siti@email.com",
              "Tanggal Lahir": "1995-05-20",
              "Alamat": "Jl. Anggrek"
          }
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");
      XLSX.writeFile(workbook, "Template_Import_Guru.xlsx");
      toast.success("Template berhasil diunduh");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const toastId = toast.loading("Mengimpor data guru...");

      try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newTeachers: Teacher[] = jsonData.map((row: any) => ({
              name: row["Nama Lengkap"] || "Tanpa Nama",
              nip: row["NIP"] || "-",
              subject: row["Mata Pelajaran"] || "Umum",
              status: (row["Status"] as any) || "Honorer",
              phone: row["No. Telepon"] || "",
              email: row["Email"] || "",
              birthDate: row["Tanggal Lahir"] || "",
              address: row["Alamat"] || ""
          }));

          if (newTeachers.length > 0) {
              await bulkImportTeachers(newTeachers);
              toast.success(`Berhasil mengimpor ${newTeachers.length} data guru`, { id: toastId });
              // Automatic update via onSnapshot
          } else {
              toast.error("File kosong atau format salah", { id: toastId });
          }
      } catch (error) {
          console.error("Import Error:", error);
          toast.error("Gagal mengimpor file", { id: toastId });
      } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const handleExportExcel = () => {
      if (processedTeachers.length === 0) {
          toast.warning("Tidak ada data untuk diekspor");
          return;
      }
      const dataToExport = processedTeachers.map(t => ({
          "Nama Lengkap": t.name,
          "NIP": t.nip,
          "Mata Pelajaran": t.subject,
          "Status": t.status,
          "No. Telepon": t.phone,
          "Email": t.email,
          "Tanggal Lahir": t.birthDate,
          "Alamat": t.address
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Guru");
      XLSX.writeFile(workbook, `Data_Guru_MAN1HST_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success("Berhasil ekspor ke Excel");
  };

  const handleExportPDF = () => {
      if (processedTeachers.length === 0) {
          toast.warning("Tidak ada data untuk diekspor");
          return;
      }
      const doc = new jsPDF();
      
      doc.setFontSize(14);
      doc.text("LAPORAN DATA GURU DAN TENAGA KEPENDIDIKAN", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text("MAN 1 HULU SUNGAI TENGAH", 105, 22, { align: "center" });
      doc.text(`Total: ${processedTeachers.length} Guru`, 14, 30);

      const tableColumn = ["No", "Nama Lengkap", "NIP", "Mapel", "Status", "No. HP"];
      const tableRows = processedTeachers.map((t, index) => [
          index + 1,
          t.name,
          t.nip,
          t.subject,
          t.status,
          t.phone || '-'
      ]);

      autoTable(doc, {
          startY: 35,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] }, // Indigo
          styles: { fontSize: 8 }
      });

      doc.save(`Laporan_Guru_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("Berhasil ekspor ke PDF");
  };

  return (
    <Layout
      title="Data Guru"
      subtitle={`Direktori Pengajar • ${teachers.length} Total`}
      icon={BriefcaseIcon}
      onBack={onBack}
      actions={
          <div className="flex gap-2">
                <button 
                    onClick={handleExportPDF}
                    className="p-2.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title="Export PDF"
                >
                    <FileText className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleExportExcel}
                    className="p-2.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors"
                    title="Export Excel"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
          </div>
      }
    >
      <div className="p-4 lg:p-6 pb-24 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Guru</p>
                  <div className="flex items-center gap-2 mt-1">
                      <BriefcaseIcon className="w-5 h-5 text-indigo-500" />
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.total}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">PNS / PPPK</p>
                  <div className="flex items-center gap-2 mt-1">
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.pns + stats.pppk}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Honorer / GTT</p>
                  <div className="flex items-center gap-2 mt-1">
                      <AcademicCapIcon className="w-5 h-5 text-orange-500" />
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.honorer}</span>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">GTY</p>
                  <div className="flex items-center gap-2 mt-1">
                      <UserIcon className="w-5 h-5 text-blue-500" />
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{stats.gty}</span>
                  </div>
              </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1 relative">
                  <input 
                      type="text" 
                      placeholder="Cari nama, NIP, atau mapel..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <div className="relative min-w-[140px]">
                      <select
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                      >
                          <option value="All">Semua Mapel</option>
                          {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                          <ArrowRightIcon className="w-3 h-3 rotate-90" />
                      </div>
                  </div>

                  <div className="relative min-w-[130px]">
                      <select
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                      >
                          <option value="All">Semua Status</option>
                          <option value="PNS">PNS</option>
                          <option value="PPPK">PPPK</option>
                          <option value="GTY">GTY</option>
                          <option value="Honorer">Honorer</option>
                      </select>
                      <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                          <ArrowRightIcon className="w-3 h-3 rotate-90" />
                      </div>
                  </div>
              </div>
          </div>

          {/* Admin Toolbar */}
          {canManage && (
              <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="flex gap-2">
                        <button 
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" /> Template
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 transition-colors flex items-center gap-2"
                        >
                            {importing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
                            Import Excel
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                  </div>
                  
                  <button 
                      onClick={() => {
                          setEditingId(null);
                          setFormData({ status: 'PNS' });
                          setIsModalOpen(true);
                      }}
                      className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none ml-auto"
                  >
                      <PlusIcon className="w-4 h-4" /> Tambah Manual
                  </button>
              </div>
          )}

          {/* List */}
          {loading ? (
              <div className="text-center py-12 text-slate-400">
                  <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Memuat data...
              </div>
          ) : processedTeachers.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-4">Nama & NIP</th>
                                  <th className="px-6 py-4">Mapel</th>
                                  <th className="px-6 py-4">Status</th>
                                  <th className="px-6 py-4 hidden md:table-cell">Kontak</th>
                                  {canManage && <th className="px-6 py-4 text-center">Aksi</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {processedTeachers.map((t) => (
                                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-slate-800 dark:text-slate-200">{t.name}</div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{t.nip}</div>
                                      </td>
                                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                          {t.subject}
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                              t.status === 'PNS' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                              t.status === 'PPPK' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                              'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                          }`}>
                                              {t.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 hidden md:table-cell">
                                          <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                                              {t.phone && (
                                                  <div className="flex items-center gap-1.5">
                                                      <PhoneIcon className="w-3 h-3" /> {t.phone}
                                                  </div>
                                              )}
                                              {t.email && (
                                                  <div className="flex items-center gap-1.5">
                                                      <EnvelopeIcon className="w-3 h-3" /> {t.email}
                                                  </div>
                                              )}
                                          </div>
                                      </td>
                                      {canManage && (
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex justify-center gap-2">
                                                  <button 
                                                      onClick={() => handleEdit(t)}
                                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                                                  >
                                                      <PencilIcon className="w-4 h-4" />
                                                  </button>
                                                  <button 
                                                      onClick={() => handleDelete(t.id || '', t.name)}
                                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                  >
                                                      <TrashIcon className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </td>
                                      )}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-slate-500 dark:text-slate-400">Tidak ada data guru ditemukan untuk filter ini.</p>
              </div>
          )}

          {/* Modal - Full Screen Mobile */}
          {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-w-lg md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-full md:max-h-[90vh]">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                              {editingId ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                          </h3>
                          <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                              <XCircleIcon className="w-6 h-6 text-slate-400" />
                          </button>
                      </div>
                      
                      <div className="p-6 overflow-y-auto max-h-[70vh] flex-1">
                          <form id="teacherForm" onSubmit={handleSave} className="space-y-6">
                              {/* Identitas Section */}
                              <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Identitas & Profesi</h4>
                                  
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Lengkap & Gelar *</label>
                                      <input 
                                          required
                                          type="text" 
                                          value={formData.name || ''} 
                                          onChange={e => setFormData({...formData, name: e.target.value})}
                                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                          placeholder="Contoh: Budi Santoso, S.Pd"
                                      />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">NIP / NIY</label>
                                          <input 
                                              type="text" 
                                              value={formData.nip || ''} 
                                              onChange={e => setFormData({...formData, nip: e.target.value})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                              placeholder="-"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tanggal Lahir</label>
                                          <input 
                                              type="date" 
                                              value={formData.birthDate || ''} 
                                              onChange={e => setFormData({...formData, birthDate: e.target.value})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                          />
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
                                          <select 
                                              value={formData.status || 'PNS'} 
                                              onChange={e => setFormData({...formData, status: e.target.value as any})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                          >
                                              <option value="PNS">PNS</option>
                                              <option value="PPPK">PPPK</option>
                                              <option value="GTY">GTY</option>
                                              <option value="Honorer">Honorer</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mata Pelajaran Utama *</label>
                                          <input 
                                              required
                                              type="text" 
                                              value={formData.subject || ''} 
                                              onChange={e => setFormData({...formData, subject: e.target.value})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                              placeholder="Contoh: Matematika"
                                          />
                                      </div>
                                  </div>
                              </div>

                              {/* Kontak Section */}
                              <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Kontak & Alamat</h4>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">No. Telepon</label>
                                          <input 
                                              type="tel" 
                                              value={formData.phone || ''} 
                                              onChange={e => setFormData({...formData, phone: e.target.value})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                              placeholder="08..."
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
                                          <input 
                                              type="email" 
                                              value={formData.email || ''} 
                                              onChange={e => setFormData({...formData, email: e.target.value})}
                                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                              placeholder="nama@email.com"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Alamat Domisili</label>
                                      <textarea 
                                          rows={2}
                                          value={formData.address || ''} 
                                          onChange={e => setFormData({...formData, address: e.target.value})}
                                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                          placeholder="Jl. ..."
                                      />
                                  </div>
                              </div>
                          </form>
                      </div>

                      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                          <button 
                              onClick={() => setIsModalOpen(false)}
                              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                          >
                              Batal
                          </button>
                          <button 
                              type="submit"
                              form="teacherForm"
                              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                          >
                              Simpan
                          </button>
                      </div>
                  </div>
              </div>
          )}

      </div>
    </Layout>
  );
};

export default TeacherData;