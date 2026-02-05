
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
  AcademicCapIcon, Search, Loader2, IdentificationIcon, UserIcon, MapPinIcon
} from './Icons';

const AlumniData: React.FC<{ onBack: () => void, userRole: UserRole }> = ({ onBack, userRole }) => {
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNama, setFilterNama] = useState('');

  useEffect(() => {
    setLoading(true);
    if (!db && !isMockMode) return;
    
    const unsubscribe = isMockMode 
        ? () => {} 
        : db!.collection('alumni').orderBy('namaLengkap').onSnapshot(snapshot => {
            setAlumni(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, err => { setLoading(false); });

    if (isMockMode) {
        setAlumni([]);
        setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  const filteredAlumni = useMemo(() => {
    return alumni.filter(s => (s.namaLengkap || '').toLowerCase().includes(filterNama.toLowerCase()));
  }, [alumni, filterNama]);

  return (
    <Layout title="Database Alumni" subtitle="Arsip Lulusan Madrasah" icon={AcademicCapIcon} onBack={onBack}>
      <div className="p-4 lg:p-6 pb-40 space-y-6">
        <div className="bg-white dark:bg-[#151E32] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari nama alumni..." value={filterNama} onChange={e => setFilterNama(e.target.value)} className="flex-1 bg-transparent text-[11px] font-bold outline-none" />
        </div>

        <div className="bg-white dark:bg-[#151E32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                        <tr className="text-[10px] font-black text-slate-500 uppercase">
                            <th className="w-12 px-4 py-4 text-center">No</th>
                            <th className="px-4 py-4">Nama Lengkap</th>
                            <th className="w-28 px-4 py-4 text-center">ID Unik</th>
                            <th className="w-32 px-4 py-4 text-center">Tahun Lulus</th>
                            <th className="w-32 px-4 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                        ) : filteredAlumni.map((s, idx) => (
                            <tr key={s.id} className="text-[10px] hover:bg-slate-50">
                                <td className="px-4 py-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="px-4 py-4 font-black text-slate-700 dark:text-slate-200 uppercase">{s.namaLengkap}</td>
                                <td className="px-4 py-4 text-center font-mono font-bold text-indigo-600">{s.idUnik}</td>
                                <td className="px-4 py-4 text-center font-bold text-slate-500">{s.movedAt?.substring(0,4) || '-'}</td>
                                <td className="px-4 py-4 text-center"><button className="px-3 py-1.5 bg-slate-100 rounded-lg text-[8px] font-black uppercase">Detail Arsip</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!loading && filteredAlumni.length === 0 && (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <AcademicCapIcon className="w-12 h-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data alumni</p>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default AlumniData;
