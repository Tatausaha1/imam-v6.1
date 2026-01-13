import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';
import { MadrasahData } from '../types';
import { toast } from 'sonner';
import { 
    BuildingLibraryIcon, SaveIcon, Loader2, 
    IdentificationIcon, MapPinIcon, PhoneIcon, 
    EnvelopeIcon, UserIcon, GlobeAltIcon
} from './Icons';

const MadrasahInfo: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<MadrasahData>({
    nama: 'MAN 1 HULU SUNGAI TENGAH',
    nsm: '131163070001',
    npsn: '30315354',
    alamat: 'Jl. H. Damanhuri No. 12 Barabai',
    telepon: '0517-41234',
    email: 'info@man1hst.sch.id',
    website: 'www.man1hst.sch.id',
    kepalaNama: 'Drs. H. Syamsul Arifin',
    kepalaNip: '196808171995031002'
  });

  useEffect(() => {
    if (isMockMode) { setLoading(false); return; }
    if (!db) return;

    db.collection('settings').doc('madrasahInfo').get().then(doc => {
      if (doc.exists) {
        setData(doc.data() as MadrasahData);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Menyimpan data madrasah...");

    try {
      if (isMockMode) {
        await new Promise(r => setTimeout(r, 1000));
      } else if (db) {
        await db.collection('settings').doc('madrasahInfo').set(data);
      }
      toast.success("Data Madrasah diperbarui!", { id: toastId });
    } catch (err) {
      toast.error("Gagal menyimpan data", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, icon: Icon, value, onChange, placeholder }: any) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
        <input 
          type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
        />
      </div>
    </div>
  );

  return (
    <Layout title="Profil Madrasah" subtitle="Identitas & Legalitas Instansi" icon={BuildingLibraryIcon} onBack={onBack}>
      <div className="p-3 lg:p-6 pb-32">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
        ) : (
          <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-4">
            
            {/* Identitas Utama */}
            <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <IdentificationIcon className="w-3.5 h-3.5" /> Identitas Utama
              </h3>
              <InputField label="Nama Madrasah" icon={BuildingLibraryIcon} value={data.nama} onChange={(v: string) => setData({...data, nama: v})} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="NSM" icon={IdentificationIcon} value={data.nsm} onChange={(v: string) => setData({...data, nsm: v})} />
                <InputField label="NPSN" icon={IdentificationIcon} value={data.npsn} onChange={(v: string) => setData({...data, npsn: v})} />
              </div>
            </div>

            {/* Kontak & Lokasi */}
            <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <MapPinIcon className="w-3.5 h-3.5" /> Kontak & Lokasi
              </h3>
              <InputField label="Alamat Lengkap" icon={MapPinIcon} value={data.alamat} onChange={(v: string) => setData({...data, alamat: v})} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Telepon" icon={PhoneIcon} value={data.telepon} onChange={(v: string) => setData({...data, telepon: v})} />
                <InputField label="Email Sekolah" icon={EnvelopeIcon} value={data.email} onChange={(v: string) => setData({...data, email: v})} />
              </div>
              <InputField label="Website Resmi" icon={GlobeAltIcon} value={data.website} onChange={(v: string) => setData({...data, website: v})} />
            </div>

            {/* Pimpinan */}
            <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5" /> Pimpinan Madrasah
              </h3>
              <InputField label="Nama Kepala Madrasah" icon={UserIcon} value={data.kepalaNama} onChange={(v: string) => setData({...data, kepalaNama: v})} />
              <InputField label="NIP Kepala" icon={IdentificationIcon} value={data.kepalaNip} onChange={(v: string) => setData({...data, kepalaNip: v})} />
            </div>

            <div className="pt-2">
              <button 
                type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
                <span className="uppercase tracking-widest text-[10px]">Simpan Perubahan</span>
              </button>
            </div>

          </form>
        )}
      </div>
    </Layout>
  );
};

export default MadrasahInfo;