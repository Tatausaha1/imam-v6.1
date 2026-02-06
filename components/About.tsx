
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * Developed by: Akhmad Arifin (Lead Developer & System Architect)
 * NIP: 19901004 202521 1012
 * Role: Fullstack & UI/UX Engineer
 * Copyright (c) 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { db, isMockMode } from '../services/firebase';
import { AboutContent, FAQItemData } from '../types';
import { 
  ImamLogo, MapPinIcon, GlobeAltIcon, 
  ArrowLeftIcon, SparklesIcon, InfoIcon, CommandLineIcon,
  ChevronDownIcon, ShieldCheckIcon, ClockIcon, HeartIcon,
  DevicePhoneIcon, CloudIcon, BanknotesIcon, StarIcon,
  ChartBarIcon, UsersIcon, Loader2
} from './Icons';

interface AboutProps {
  onBack: () => void;
}

// Icon Map for dynamic icons from Firestore
const iconMap: Record<string, any> = {
    'BanknotesIcon': BanknotesIcon,
    'GlobeAltIcon': GlobeAltIcon,
    'ShieldCheckIcon': ShieldCheckIcon,
    'HeartIcon': HeartIcon,
    'ClockIcon': ClockIcon,
    'SparklesIcon': SparklesIcon
};

const FAQItem: React.FC<FAQItemData> = ({ question, answer, iconName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = iconMap[iconName] || InfoIcon;

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-all shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'}`}>
                <Icon className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 leading-tight uppercase tracking-tight">{question}</span>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-5 pt-0 animate-in fade-in slide-in-from-top-2">
            <div className="pl-12 pr-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-4">
                    {answer}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};

const About: React.FC<AboutProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<AboutContent & { devRole?: string }>({
    engineVersion: '6.1.4',
    brandingText: 'Ekosistem digital madrasah masa depan yang menjembatani teknologi, transparansi, dan inklusivitas pendidikan di MAN 1 Hulu Sungai Tengah.',
    devName: 'AKHMAD ARIFIN',
    devNip: '19901004 202521 1012',
    devRole: 'Penata Layanan Operasional',
    devQuote: 'Menghadirkan solusi teknologi yang memberikan dampak nyata bagi efisiensi layanan operasional pendidikan dan masyarakat.',
    faqs: [
        { iconName: 'BanknotesIcon', question: 'Mengapa program ini layak didanai?', answer: 'IMAM v6.1 bukan sekadar aplikasi, tapi infrastruktur masa depan. Penghematan biaya operasional rutin madrasah dijamin tercapai dalam waktu singkat melalu digitalisasi proses.' },
        { iconName: 'GlobeAltIcon', question: 'Apakah bisa dikembangkan lebih luas?', answer: 'Sangat bisa. Arsitektur kami bersifat Modular dan Scalable, siap direplikasi ke berbagai tingkatan satuan pendidikan madrasah.' },
        { iconName: 'ShieldCheckIcon', question: 'Bagaimana akuntabilitas pelaporannya?', answer: 'Sistem menyediakan dashboard khusus pimpinan yang mencatat setiap metrik penggunaan secara realtime untuk audit internal.' }
    ]
  });

  const devPhoto = "https://lh3.googleusercontent.com/d/1N61n6BzZXDnRCGA3BcmTpFYS0MYh6o4E";

  useEffect(() => {
    const fetchAbout = async () => {
        if (isMockMode) { setLoading(false); return; }
        if (!db) return;
        try {
            const doc = await db.collection('about_content').doc('main').get();
            if (doc.exists) {
                const data = doc.data();
                setContent(prev => ({ ...prev, ...data }));
            }
        } catch (e) {
            console.warn("Using local fallback content");
        } finally {
            setLoading(false);
        }
    };
    fetchAbout();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-4 pt-8 flex items-center gap-4 z-10 sticky top-0 border-b border-slate-100 dark:border-slate-700">
        <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-90 transition-all">
           <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
            Dokumentasi Sistem <InfoIcon className="w-4 h-4 text-indigo-500" />
          </h2>
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kolaborasi & Dampak Sosial</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 lg:p-8 pb-32 custom-scrollbar space-y-8">
        
        {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Konten...</p>
            </div>
        ) : (
            <div className="animate-in fade-in duration-700 space-y-8">
                {/* Main Branding Card */}
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    
                    <div className="flex justify-center mb-6">
                    <div className="w-32 h-32 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                        <ImamLogo className="w-full h-full" />
                    </div>
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tighter">IMAM System</h1>
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.25em] mb-4">Integrated Madrasah Academic Manager</p>
                    
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm mx-auto mb-8 font-medium">
                        {content.brandingText}
                    </p>
                    
                    <div className="flex justify-center gap-2">
                        <span className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800">
                            Engine v{content.engineVersion}
                        </span>
                        <span className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                            <SparklesIcon className="w-3.5 h-3.5" /> AI Integrated
                        </span>
                    </div>
                </div>

                {/* Developer Info Card - UPDATED WITH USER REQUESTED DATA */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Arsitek Sistem</h3>
                        <div className="px-2 py-1 bg-indigo-600 rounded text-[7px] font-black text-white uppercase tracking-widest">Verified Developer</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500">
                        <div className="p-6 flex items-center gap-5 border-b border-slate-50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-indigo-900/10">
                            <div className="w-20 h-20 rounded-[1.8rem] bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden shadow-lg border-2 border-indigo-100 dark:border-indigo-800 shrink-0 group">
                                <img src={devPhoto} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={content.devName} />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-lg leading-tight truncate">{content.devName}</h4>
                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                                    {content.devRole}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/30 dark:bg-slate-800/30">
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-600 shrink-0">
                                    <CommandLineIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-0.5 mb-3">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nomor Induk Pegawai</span>
                                        <p className="text-xs font-mono font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">
                                            {content.devNip}
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic pr-4 border-l-2 border-indigo-200 dark:border-indigo-800 pl-4">
                                        "{content.devQuote}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-indigo-500" /> Informasi Teknis & Strategis
                    </h3>
                    <div className="space-y-3">
                        {content.faqs.map((faq, idx) => (
                            <FAQItem 
                                key={idx}
                                iconName={faq.iconName}
                                question={faq.question} 
                                answer={faq.answer}
                            />
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Instansi Info */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100/50">
                    <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi Operasional</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold leading-relaxed">
                        Jl. H. Damanhuri No. 12, Barabai, <br/>
                        Hulu Sungai Tengah, Kalsel, 71311
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100/50">
                    <GlobeAltIcon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Informasi</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">
                        www.man1hst.sch.id <br/>
                        info@man1hst.sch.id
                    </p>
                </div>
            </div>
        </div>

        <div className="text-center pb-12 pt-4 opacity-40">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1 leading-relaxed">
                © {content.devName} I {content.devNip} I {content.devRole}
            </p>
            <p className="text-[8px] font-mono text-slate-400 mt-2 uppercase tracking-[0.2em]">
                &copy; 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
            </p>
        </div>

      </div>
    </div>
  );
};

export default About;
