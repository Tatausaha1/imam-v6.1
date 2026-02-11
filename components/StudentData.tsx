
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { deleteStudent, updateStudent, addStudent, moveStudentToCollection, bulkImportStudents, getStudentsPaginated } from '../services/studentService';
import { Student, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Layout from './Layout';
import { 
  UsersGroupIcon, PencilIcon, TrashIcon, Search, PlusIcon,
  Loader2, XCircleIcon, SaveIcon, 
  IdentificationIcon, ChevronDownIcon,
  PhoneIcon, ArrowRightIcon, FileSpreadsheet, ArrowDownTrayIcon, ArrowPathIcon
} from './Icons';

const StudentData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [classList, setClassList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Filter
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterKelas, setFilterKelas] = useState('All'); 
  const [filterStatus, setFilterStatus] = useState('All');

  const initialFormState: Partial<Student> = {
    idUnik: '', namaLengkap: '', nisn: '', nik: '', email: '', role: 'Siswa',
    tingkatRombel: '', status: 'Aktif', jenisKelamin: 'Laki-laki', 
    noTelepon: '', alamat: '', isClaimed: false
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormState);

  useEffect(() => {
    if (isMockMode) {
        setClassList(['10 A', '11 A', '12 A']);
        // Fix: Added missing required properties nisn and jenisKelamin to mock student object
        setStudents([{ id: '1', namaLengkap: 'ADELIA SRI', idUnik: '25002', nisn: '0081234567', tingkatRombel: '12 A', status: 'Aktif', jenisKelamin: 'Perempuan', isClaimed: false }]);
        setLoading(false);
        return;
    }
    
    // Initial Load
    loadStudents(true);
    
    if (db) {
      db.collection('classes').get().then(snap => {
        setClassList(snap.docs.map(d => d.data().name).sort());
      });
    }
  }, []);

  const loadStudents = async (isInitial: boolean = false) => {
    if (isMockMode) return;
    
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
        const { data, lastVisible: lastDoc } = await getStudentsPaginated(isInitial ? null : lastVisible, 20);
        
        if (isInitial) {
            setStudents(data);
        } else {
            setStudents(prev => [...prev, ...data]);
        }
        
        setLastVisible(lastDoc);
        setHasMore(data.length === 20);
    } catch (e) {
        toast.error("Gagal memuat data.");
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  const processedStudents = useMemo(() => {
    return students.filter(s => {
        const q = globalSearch.toLowerCase().trim();
        const matchesGlobal = q === '' || (s.namaLengkap || '').toLowerCase().includes(q) || String(s.idUnik || '').toLowerCase().includes(q);
        const matchesLevel = filterLevel === 'All' || s.tingkatRombel?.startsWith(filterLevel);
        const matchesKelas = filterKelas === 'All' || s.tingkatRombel === filterKelas;
        const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
        return matchesGlobal && matchesLevel && matchesKelas && matchesStatus;
    });
  }, [students, globalSearch, filterLevel, filterKelas, filterStatus]);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          if (editingId) await updateStudent(editingId, formData);
          else await addStudent(formData as Student);
          toast.success("Database diperbarui.");
          setIsModalOpen(false);
          loadStudents(true); // Refresh
      } catch (e: any) { toast.error("Gagal menyimpan."); } finally { setSaving(false); }
  };

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  return (
    <Layout title="Data Induk Siswa" subtitle="Database Terintegrasi" icon={UsersGroupIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-40 space-y-6">
        
        <div className="bg-white dark:bg-[#0B1121] p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Cari nama atau ID..." 
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-3 pl-11 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {canManage && (
                    <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"><PlusIcon className="w-4 h-4" /> Tambah</button>
                )}
                <button onClick={() => loadStudents(true)} className="p-3 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-2xl"><ArrowPathIcon className="w-4 h-4" /></button>
            </div>
        </div>

        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                            <th className="w-10 px-2 py-4 text-center">No</th>
                            <th className="px-4 py-4">Nama Lengkap</th>
                            <th className="w-24 px-2 py-4 text-center">ID Unik</th>
                            <th className="w-32 px-2 py-4 text-center">Kelas</th>
                            <th className="w-28 px-2 py-4 text-center">Gender</th>
                            <th className="w-24 px-2 py-4 text-center">Status</th>
                            {canManage && <th className="w-20 px-2 py-4 text-center">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                        ) : processedStudents.map((s, idx) => (
                            <tr key={s.id || s.idUnik} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-2 py-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="px-4 py-3.5 font-black text-slate-700 dark:text-slate-200 uppercase truncate">{s.namaLengkap}</td>
                                <td className="px-2 py-3.5 text-center font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                <td className="px-2 py-3.5 text-center font-black text-slate-500">{s.tingkatRombel || '-'}</td>
                                <td className="px-2 py-3.5 text-center font-bold text-slate-400">{s.jenisKelamin === 'Perempuan' ? 'P' : 'L'}</td>
                                <td className="px-2 py-3.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span>
                                </td>
                                {canManage && (
                                    <td className="px-2 py-3.5 text-center">
                                        <button onClick={() => { setEditingId(s.id!); setFormData({...s}); setIsModalOpen(true); }} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><PencilIcon className="w-3.5 h-3.5" /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {hasMore && !loading && (
                <div className="p-4 flex justify-center bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={() => loadStudents(false)}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                    >
                        {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowPathIcon className="w-3 h-3" />}
                        Tampilkan Lebih Banyak
                    </button>
                </div>
            )}
        </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in duration-300">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6">{editingId ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
                  <form onSubmit={handleSave} className="space-y-4">
                      <input required type="text" placeholder="ID UNIK" value={formData.idUnik} onChange={e => setFormData({...formData, idUnik: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold outline-none" />
                      <input required type="text" placeholder="NAMA LENGKAP" value={formData.namaLengkap} onChange={e => setFormData({...formData, namaLengkap: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold outline-none" />
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Batal</button>
                          <button type="submit" disabled={saving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">
                              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Simpan'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default StudentData;
