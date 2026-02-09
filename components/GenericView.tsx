
import React, { useState, useEffect } from 'react';
import { XCircleIcon, ClockIcon, SparklesIcon, ArrowLeftIcon, Loader2 } from './Icons';
import Layout from './Layout';
import { db, isMockMode } from '../services/firebase';

interface GenericViewProps {
  title: string;
  onBack: () => void;
  description?: string;
}

const GenericView: React.FC<GenericViewProps> = ({ title, onBack, description }) => {
  const [notice, setNotice] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const defaultNotice = "mohon maaf dikarenakan fasilitas kami sangat tidak mendukung satu fitur memakan waktu 30 hari kerja dengan waktu kerja 20 jam/hari";

  useEffect(() => {
    const fetchNotice = async () => {
      if (isMockMode || !db) {
        setNotice(defaultNotice);
        setLoading(false);
        return;
      }

      try {
        const doc = await db.collection('settings').doc('development_notice').get();
        if (doc.exists) {
          setNotice(doc.data()?.message || defaultNotice);
        } else {
          setNotice(defaultNotice);
        }
      } catch (e) {
        setNotice(defaultNotice);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, []);

  return (
    <Layout 
      title={title} 
      subtitle="Pemberitahuan Sistem" 
      icon={XCircleIcon} 
      onBack={onBack}
    >
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in fade-in zoom-in duration-700">
          
          <div className="relative mb-10">
              <div className="w-28 h-28 bg-rose-50 dark:bg-rose-900/20 rounded-[3rem] flex items-center justify-center relative">
                  <XCircleIcon className="w-14 h-14 text-rose-500 opacity-20" />
                  <div className="absolute inset-0 border-4 border-rose-500/10 border-t-rose-500 rounded-[3rem] animate-spin"></div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 ring-4 ring-slate-50 dark:ring-slate-900">
                  <ClockIcon className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-100 dark:border-amber-800 mb-6">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.2em]">404 - Under Development</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
            Fitur {title} <br/> Sedang Dibangun
          </h2>
          
          <div className="max-w-xs mx-auto p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner relative">
              {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
              ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-tighter italic">
                    "{notice}"
                  </p>
              )}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black italic shadow-lg shadow-indigo-500/30">!</div>
          </div>

          <p className="text-[10px] text-slate-400 mt-8 max-w-[240px] font-medium leading-relaxed uppercase tracking-widest opacity-60">
            {description || "Modul ini masuk dalam antrean pengerjaan kernel tingkat tinggi."}
          </p>

          <div className="mt-12 w-full max-w-xs">
              <button 
                onClick={onBack}
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                Kembali ke Beranda
              </button>
          </div>
      </div>
    </Layout>
  );
};

export default GenericView;
