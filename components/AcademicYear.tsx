/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * Developed by: Akhmad Arifin (Lead Developer & System Architect)
 * NIP: 19901004 202521 1012
 * Role: Fullstack & UI/UX Engineer
 * Description: Mengembangkan solusi teknologi pendidikan untuk efisiensi dan transparansi manajemen madrasah.
 * Copyright (c) 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';
import { CalendarIcon, CheckCircleIcon, PlusIcon, TrashIcon, Loader2 } from './Icons';
import { toast } from 'sonner';

interface AcademicYearData {
    id: string;
    name: string; // e.g., "2023/2024"
    semester: 'Ganjil' | 'Genap';
    isActive: boolean;
    startDate: string;
    endDate: string;
}

interface AcademicYearProps {
  onBack: () => void;
}

const AcademicYear: React.FC<AcademicYearProps> = ({ onBack }) => {
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback Mock Data
  const mockYears: AcademicYearData[] = [
      { id: '1', name: '2023/2024', semester: 'Genap', isActive: true, startDate: '2024-01-02', endDate: '2024-06-20' },
      { id: '2', name: '2023/2024', semester: 'Ganjil', isActive: false, startDate: '2023-07-10', endDate: '2023-12-15' },
  ];

  useEffect(() => {
    if (isMockMode) {
        setAcademicYears(mockYears);
        setLoading(false);
        return;
    }

    if (!db) return;

    const unsubscribe = db.collection('academic_years').orderBy('name', 'desc').onSnapshot(snapshot => {
        const years = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicYearData));
        // Sort by name desc, then semester (Genap first for same year usually means later)
        years.sort((a, b) => {
            if (a.name > b.name) return -1;
            if (a.name < b.name) return 1;
            return a.semester === 'Genap' ? -1 : 1;
        });
        setAcademicYears(years);
        setLoading(false);
    }, err => {
        console.error("Academic Years Error:", err);
        if (err.code === 'permission-denied') {
             toast.error("Akses data terbatas. Menampilkan data simulasi.");
             setAcademicYears(mockYears);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeYear = academicYears.find(y => y.isActive);

  const handleActivate = async (id: string) => {
      if (isMockMode) {
        setAcademicYears(prev => prev.map(y => ({ ...y, isActive: y.id === id })));
        toast.success("Tahun ajaran aktif berhasil diperbarui (Simulasi).");
        return;
      }

      if (!db) return;

      try {
          const batch = db.batch();
          // Deactivate all
          academicYears.forEach(y => {
              const ref = db!.collection('academic_years').doc(y.id);
              batch.update(ref, { isActive: false });
          });
          // Activate target
          const targetRef = db.collection('academic_years').doc(id);
          batch.update(targetRef, { isActive: true });
          
          await batch.commit();
          toast.success("Tahun ajaran aktif berhasil diperbarui.");
      } catch (error) {
          console.error("Error activating year:", error);
          toast.error("Gagal mengubah tahun ajaran aktif.");
      }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
          if (isMockMode) {
              setAcademicYears(prev => prev.filter(y => y.id !== id));
              toast.success("Data berhasil dihapus (Simulasi).");
              return;
          }

          if (!db) return;
          try {
              await db.collection('academic_years').doc(id).delete();
              toast.success("Data berhasil dihapus.");
          } catch (error) {
              console.error("Error deleting:", error);
              toast.error("Gagal menghapus data.");
          }
      }
  };

  const handleAddYear = async () => {
      const lastYear = academicYears[0] || { name: '2023/2024', semester: 'Genap' };
      let newName = lastYear.name;
      let newSemester: 'Ganjil' | 'Genap' = 'Ganjil';

      if (lastYear.semester === 'Ganjil') {
          newSemester = 'Genap';
      } else {
          // Increment year string "2023/2024" -> "2024/2025"
          const parts = lastYear.name.split('/');
          if (parts.length === 2) {
             newName = `${parseInt(parts[0]) + 1}/${parseInt(parts[1]) + 1}`;
          }
      }

      const newYearData = {
          name: newName,
          semester: newSemester,
          isActive: false,
          startDate: new Date().toISOString().split('T')[0],
          endDate: ''
      };

      if (isMockMode) {
          const newId = (parseInt(academicYears[0]?.id || '0') + 1).toString();
          setAcademicYears([{ id: newId, ...newYearData } as AcademicYearData, ...academicYears]);
          toast.success(`Tahun ajaran ${newName} ${newSemester} berhasil ditambahkan (Simulasi).`);
          return;
      }

      if (!db) return;

      try {
          await db.collection('academic_years').add(newYearData);
          toast.success(`Tahun ajaran ${newName} ${newSemester} berhasil ditambahkan.`);
      } catch (error) {
          console.error("Error adding year:", error);
          toast.error("Gagal menambah data.");
      }
  };

  return (
    <Layout
      title="Tahun Ajaran"
      subtitle="Pengaturan Kalender Akademik"
      icon={CalendarIcon}
      onBack={onBack}
      actions={
          <button 
            onClick={handleAddYear}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
              <PlusIcon className="w-4 h-4" /> Tambah Baru
          </button>
      }
    >
      <div className="p-6 pb-24 space-y-6">
          
          {/* Active Year Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
              <div className="relative z-10 flex justify-between items-end">
                  <div>
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3 border border-white/10">
                          <CheckCircleIcon className="w-4 h-4 text-green-300" />
                          Status: Aktif
                      </div>
                      <p className="text-indigo-200 text-sm font-medium mb-1">Tahun Ajaran Saat Ini</p>
                      <h2 className="text-3xl font-bold tracking-tight">
                          {activeYear?.name || "Belum Ada"} <span className="opacity-80 font-medium text-2xl">{activeYear?.semester}</span>
                      </h2>
                      <p className="text-indigo-100 text-xs mt-2 opacity-80">
                          {activeYear?.startDate ? `${activeYear.startDate} — ${activeYear.endDate}` : 'Jadwal belum diatur'}
                      </p>
                  </div>
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <CalendarIcon className="w-8 h-8 text-white" />
                  </div>
              </div>
          </div>

          {/* List */}
          <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4">Riwayat Tahun Ajaran</h3>
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Tahun Ajaran</th>
                                <th className="px-6 py-4">Semester</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : academicYears.length > 0 ? (
                                academicYears.map((year) => (
                                    <tr key={year.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                            {year.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${year.semester === 'Ganjil' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                {year.semester}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {year.isActive ? (
                                                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold text-xs">
                                                    <CheckCircleIcon className="w-4 h-4" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Tidak Aktif</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {!year.isActive && (
                                                    <button 
                                                        onClick={() => handleActivate(year.id)}
                                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        Aktifkan
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDelete(year.id)}
                                                    className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400">Belum ada data.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      </div>
    </Layout>
  );
};

export default AcademicYear;
