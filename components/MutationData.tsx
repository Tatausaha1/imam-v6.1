
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Student, UserRole } from '../types';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';
import Layout from './Layout';
import { 
  BriefcaseIcon, Search, Loader2, IdentificationIcon, UserIcon, MapPinIcon
} from './Icons';

const MutationData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [mutasi, setMutasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNama, setFilterNama] = useState('');

  useEffect(() => {
    setLoading(true);
    if (!db && !isMockMode) return;
    
    const unsubscribe = isMockMode 
        ? () => {} 
        : db!.collection('mutasi').orderBy('namaLengkap').onSnapshot(snapshot => {
            setMutasi(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, err => { setLoading(false); });

    if (isMockMode) {
        setMutasi([]);
        setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  const filteredData = useMemo(() => {
    return mutasi.filter(s => (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase()));
  }, [mutasi, filterNama]);

  return (
    <Layout title="Database Mutasi" subtitle="Arsip Perpindahan Siswa" icon={BriefcaseIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-40 space-y-6">
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari nama siswa mutasi..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="flex-1 bg-transparent text-[11px] font-bold outline-none" />
        </div>

        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                        <tr className="text-[10px] font-black text-slate-500 uppercase">
                            <th className="w-12 px-4 py-4 text-center">No</th>
                            <th className="w-[160px] px-3 py-4 sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 border-r">Nama Lengkap</th>
                            <th className="w-28 px-4 py-4 text-center border-r">ID Unik</th>
                            <th className="w-32 px-4 py-4 text-center border-r">Tgl Mutasi</th>
                            <th className="w-32 px-4 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                        ) : filteredData.map((s, idx) => (
                            <tr key={s.id} className="text-[10px] hover:bg-slate-50">
                                <td className="px-4 py-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="px-3 py-4 font-black text-slate-700 dark:text-slate-200 uppercase truncate sticky left-0 bg-white dark:bg-[#151E32] z-10 border-r">{s.namaLengkap}</td>
                                <td className="px-4 py-4 text-center border-r font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                <td className="px-4 py-4 text-center border-r font-bold text-slate-500">{s.movedAt?.substring(0,10) || '-'}</td>
                                <td className="px-4 py-4 text-center"><button className="px-3 py-1.5 bg-slate-100 rounded-lg text-[8px] font-black uppercase">Detail Arsip</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!loading && filteredData.length === 0 && (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <BriefcaseIcon className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data mutasi</p>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default MutationData;
