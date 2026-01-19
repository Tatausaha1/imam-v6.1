/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * Developed by: Akhmad Arifin (Lead Developer & System Architect)
 * NIP: 19901004 202521 1012
 * Role: Fullstack & UI/UX Engineer
 * Description: Mengembangkan solusi teknologi pendidikan untuk efisiensi dan transparansi manajemen madrasah.
 * Copyright (c) 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
 */

import React from 'react';
import { ImamLogo, MapPinIcon, PhoneIcon, GlobeAltIcon, ArrowLeftIcon, SparklesIcon, InfoIcon, CommandLineIcon } from './Icons';

interface AboutProps {
  onBack: () => void;
}

const About: React.FC<AboutProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors">
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 pt-8 flex items-center gap-4 z-10 sticky top-0 border-b border-slate-100 dark:border-slate-700">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
           <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Tentang Aplikasi <InfoIcon className="w-5 h-5 text-indigo-500" />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Versi & Informasi Pengembang</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        
        {/* App Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 text-center mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
            
            <div className="flex justify-center mb-4">
               <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                  <ImamLogo className="w-10 h-10" />
               </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 relative z-10">IMAM System</h1>
            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-4 relative z-10">Integrated Madrasah Academic Manager</p>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto relative z-10 mb-6">
                Platform manajemen sekolah modern yang mengintegrasikan presensi digital, akademik, dan pelayanan administrasi dalam satu genggaman.
            </p>
            
            <div className="flex justify-center gap-3 relative z-10">
                <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600">
                    v2.1.0 Beta
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 border border-indigo-100 dark:border-indigo-800">
                    <SparklesIcon className="w-3 h-3" /> AI Powered
                </span>
            </div>
        </div>

        {/* Developer Info */}
        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-4 px-2">Tim Pengembang</h3>
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
            <div className="p-5 flex items-center gap-4 border-b border-slate-50 dark:border-slate-700/50">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                       <span className="font-bold text-lg text-slate-700 dark:text-white">AA</span>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Akhmad Arifin</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Lead Developer & System Architect</p>
                    <div className="flex gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">Fullstack</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">UI/UX</span>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-start gap-3">
                    <CommandLineIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mb-1">
                            NIP: 19901004 202521 1012
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Mengembangkan solusi teknologi pendidikan untuk efisiensi dan transparansi manajemen madrasah.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* School Contact */}
        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-4 px-2">Kontak Instansi</h3>
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            
            <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0">
                        <MapPinIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Alamat</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Jl. H. Damanhuri No. 12, Barabai, <br/>
                            Kab. Hulu Sungai Tengah, <br/>
                            Kalimantan Selatan, 71311
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 shrink-0">
                        <PhoneIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Telepon</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            (0517) 41234
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                        <GlobeAltIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Digital</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            www.man1hst.sch.id <br/>
                            info@man1hst.sch.id
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center pb-8">
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono mb-2">
                Build ID: 2025.05.24-RC1
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
                &copy; 2025 MAN 1 Hulu Sungai Tengah. <br/>Hak Cipta Dilindungi Undang-Undang.
            </p>
        </div>

      </div>
    </div>
  );
};

export default About;
