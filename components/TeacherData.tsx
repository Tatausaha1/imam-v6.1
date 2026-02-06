
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher } from '../services/teacherService';
import { Teacher, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  BriefcaseIcon, Search, PlusIcon, PencilIcon, TrashIcon, 
  UserIcon, PhoneIcon, EnvelopeIcon, XCircleIcon, 
  Loader2, SaveIcon, ChevronDownIcon, IdentificationIcon, BookOpenIcon
} from './Icons';

const TeacherData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterNama, setFilterNama] = useState('');
  const [filterNIP, setFilterNIP] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Teacher>>({
      name: '', nip: '', subject: '', status: 'PNS', phone: '', email: '', birthDate: '', address: ''
  });

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.DEVELOPER;

  useEffect(() => {
    setLoading(true);
    if (!db && !isMockMode) return;

    const unsubscribe = isMockMode 
        ? () => {} 
        : db!.collection('teachers').orderBy('name').onSnapshot(snapshot => {
            setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
            setLoading(false);
        }, err => { setLoading(false); });

    if (isMockMode) {
        getTeachers().then(data => { setTeachers(data); setLoading(false); });
    }
    return () => unsubscribe();
  }, []);

  const processedTeachers = useMemo(() => {
      return teachers.filter(t => {
          const matchesNama = filterNama === '' || (t.name || '').toLowerCase().includes(filterNama.toLowerCase());
          const matchesNIP = filterNIP === '' || (t.nip || '').toLowerCase().includes(filterNIP.toLowerCase());
          const matchesMapel = filterMapel === '' || (t.subject || '').toLowerCase().includes(filterMapel.toLowerCase());
          const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
          return matchesNama && matchesNIP && matchesMapel && matchesStatus;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [teachers, filterNama, filterNIP, filterMapel, selectedStatus]);

  const handleEdit = (teacher: Teacher) => { 
      setEditingId(teacher.id || null); 
      setFormData({ ...teacher }); 
      setIsModalOpen(true); 
  };

  const handleDelete = async (id: string, name: string) => {
      if (!id) return;
      if (window.confirm(`Hapus permanen data guru ${name}?`)) {
          const toastId = toast.loading("Menghapus data...");
          try { 
              await deleteTeacher(id); 
              toast.success("Data guru dihapus.", { id: toastId }); 
          } catch (e) { 
              toast.error("Gagal menghapus.", { id: toastId }); 
          }
      }
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.subject) { 
          toast.error("Nama Lengkap dan Mata Pelajaran wajib diisi."); 
          return; 
      }
      
      setSaving(true);
      const toastId = toast.loading(editingId ? "Memperbarui data..." : "Menyimpan guru baru...");
      
      try {
          if (editingId) {
              await updateTeacher(editingId, formData);
          } else {
              await addTeacher(formData as Teacher);
          }
          toast.success("Database GTK berhasil diperbarui.", { id: toastId });
          setIsModalOpen(false);
      } catch (e) { 
          toast.error("Gagal menyimpan data.", { id: toastId }); 
      } finally { 
          setSaving(false); 
      }
  };

  return (
    <Layout title="Direktori GTK" subtitle="Excel Database View" icon={BriefcaseIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-32 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600"><BriefcaseIcon className="w-6 h-6" /></div>
                    <div><h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Data Guru & Staf</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{processedTeachers.length} Record GTK Online</p></div>
                </div>
                {canManage && (
                    <button onClick={() => { setEditingId(null); setFormData({ name: '', nip: '', subject: '', status: 'PNS' }); setIsModalOpen(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-indigo-700 transition-all"><PlusIcon className="w-4 h-4" /> Tambah GTK</button>
                )}
          </div>

          <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
                          <tr className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                              <th className="w-10 px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800">No</th>
                              <th className="w-[180px] px-3 py-3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky left-0 z-30">Nama Lengkap</th>
                              <th className="w-28 px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800">NIP/NIY</th>
                              <th className="w-[160px] px-3 py-3 border-r border-slate-200 dark:border-slate-800">Mata Pelajaran</th>
                              <th className="w-24 px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800">Status</th>
                              <th className="w-32 px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800">WhatsApp</th>
                              {canManage && <th className="w-20 px-2 py-3 text-center">Aksi</th>}
                          </tr>
                          <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                <th className="border-r border-slate-200 dark:border-slate-800"></th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-800 z-30">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                                        <input type="text" placeholder="Filter Nama..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[9px] font-bold outline-none" />
                                    </div>
                                </th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                    <input type="text" placeholder="NIP..." value={filterNIP} onChange={e => setFilterNIP(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[9px] font-bold outline-none text-center" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                    <input type="text" placeholder="Mapel..." value={filterMapel} onChange={e => setFilterMapel(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[9px] font-bold outline-none text-center" />
                                </th>
                                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-800">
                                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded text-[8px] font-black uppercase text-center outline-none">
                                        <option value="All">All</option>
                                        <option value="PNS">PNS</option>
                                        <option value="PPPK">PPPK</option>
                                        <option value="Honorer">Honorer</option>
                                    </select>
                                </th>
                                <th className="border-r border-slate-200 dark:border-slate-800" colSpan={canManage ? 2 : 1}></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {loading ? (
                              <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 opacity-20" /></td></tr>
                          ) : processedTeachers.map((t, idx) => (
                              <tr key={t.id} className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-[#151E32] font-black text-slate-800 dark:text-slate-200 uppercase truncate">
                                      {t.name}
                                  </td>
                                  <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-indigo-600">{t.nip || '-'}</td>
                                  <td className="px-3 py-3 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-500 truncate">{t.subject}</td>
                                  <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.status === 'PNS' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status}</span>
                                  </td>
                                  <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-400">{t.phone || '-'}</td>
                                  {canManage && (
                                      <td className="px-2 py-3 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                              <button onClick={() => handleEdit(t)} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-90" title="Koreksi Profil"><PencilIcon className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => handleDelete(t.id || '', t.name)} className="p-1.5 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-90" title="Hapus Permanen"><TrashIcon className="w-3.5 h-3.5" /></button>
                                          </div>
                                      </td>
                                  )}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-[#0B1121] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-white/10">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0B1121] z-10">
                      <div><h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-base leading-none">{editingId ? 'Edit Data Guru' : 'Tambah Guru Baru'}</h3><p className="text-[8px] font-bold text-indigo-500 uppercase mt-2">Sinkronisasi Database Pegawai</p></div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircleIcon className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                      <form id="teacherForm" onSubmit={handleSave} className="space-y-6">
                          <InputField label="Nama Lengkap & Gelar *" icon={UserIcon} value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} placeholder="Contoh: Akhmad Arifin, S.Pd" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <InputField label="NIP / NIY" icon={IdentificationIcon} value={formData.nip} onChange={(v: string) => setFormData({...formData, nip: v})} placeholder="Nomor Induk Pegawai" />
                              <InputField label="Mata Pelajaran *" icon={BookOpenIcon} value={formData.subject} onChange={(v: string) => setFormData({...formData, subject: v})} placeholder="Mata Pelajaran Utama" />
                          </div>
                          <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Kepegawaian</label><div className="relative"><select value={formData.status || 'PNS'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-[11px] font-bold outline-none cursor-pointer appearance-none shadow-inner"><option value="PNS">PNS</option><option value="PPPK">PPPK</option><option value="GTY">GTY</option><option value="Honorer">Honorer</option></select><ChevronDownIcon className="absolute right-4 top-3.5 w-4 h-4 text-slate-400" /></div></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                              <InputField label="No. WhatsApp" icon={PhoneIcon} value={formData.phone} onChange={(v: string) => setFormData({...formData, phone: v})} placeholder="Contoh: 08..." />
                              <InputField label="Email Resmi" icon={EnvelopeIcon} value={formData.email} onChange={(v: string) => setFormData({...formData, email: (v || '').toLowerCase()})} placeholder="alamat@email.com" />
                          </div>
                      </form>
                  </div>
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 relative z-10 bg-slate-50 dark:bg-slate-900">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-[1.5rem] bg-white dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                      <button type="submit" form="teacherForm" disabled={saving} className="flex-[2] py-4 rounded-[1.5rem] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
                        SIMPAN PERMANEN
                      </button>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

const InputField = ({ label, icon: Icon, value, onChange, placeholder }: any) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><Icon className="w-4 h-4" /></div>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" />
      </div>
    </div>
);

export default TeacherData;
