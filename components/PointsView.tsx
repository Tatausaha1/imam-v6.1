
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import Layout from './Layout';
import { 
  ShieldCheckIcon, Loader2, CommandLineIcon, SparklesIcon 
} from './Icons';

const PointsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <Layout 
      title="Disiplin & Poin" 
      subtitle="Kernel Module v6.1" 
      icon={ShieldCheckIcon} 
      onBack={onBack}
    >
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center animate-in fade-in zoom-in duration-700">
          
          <div className="relative mb-10">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] flex items-center justify-center relative">
                  <ShieldCheckIcon className="w-10 h-10 text-indigo-500 opacity-20" />
                  <div className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-[2.5rem] animate-spin"></div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <CommandLineIcon className="w-5 h-5 text-amber-500" />
              </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-100 dark:border-amber-800 mb-6">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Pembaruan Kernel</span>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Modul Dalam Pengembangan</h2>
          
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed font-medium">
              Sistem sedang melakukan sinkronisasi algoritma kredit poin dan integrasi database pelanggaran. Fitur ini akan segera aktif dalam rilis kernel berikutnya.
          </p>

          <div className="mt-12 flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={onBack}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Kembali ke Dashboard
              </button>
              <p className="text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                Kernel build: v6.1.4-discipline-sync
              </p>
          </div>
      </div>
    </Layout>
  );
};

export default PointsView;
