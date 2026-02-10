
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  BellIcon, MegaphoneIcon, SparklesIcon, 
  ClockIcon, ArrowLeftIcon, Loader2,
  CheckCircleIcon, XCircleIcon, InfoIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { AppNotification } from '../types';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale/id';

interface NotificationCenterProps {
  onBack: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
        setNotifications([
            { id: '1', title: 'PPDB 2025 Dibuka', message: 'Penerimaan peserta didik baru telah resmi dibuka hari ini. Silakan cek menu Berita untuk detail alur pendaftaran.', date: new Date().toISOString(), type: 'announcement', sender: 'Panitia PPDB' },
            { id: '2', title: 'Pembaruan Sistem v6.2', message: 'Fitur Laporan Presensi kini lebih optimal untuk tampilan ponsel. Nikmati kemudahan monitoring database.', date: new Date(Date.now() - 86400000).toISOString(), type: 'update', sender: 'Developer Team' }
        ]);
        setLoading(false);
        return;
    }

    if (!db) return;
    
    // Fix: Menambahkan error handler pada onSnapshot
    const unsub = db.collection('announcements').orderBy('date', 'desc').limit(20).onSnapshot(
        snap => {
            setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
            setLoading(false);
        },
        err => {
            console.warn("Firestore: Gagal memuat pengumuman.", err.message);
            setLoading(false);
        }
    );

    return () => unsub();
  }, []);

  const getTypeStyle = (type: string) => {
    switch (type) {
        case 'announcement': return { icon: MegaphoneIcon, bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' };
        case 'update': return { icon: SparklesIcon, bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' };
        case 'alert': return { icon: XCircleIcon, bg: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' };
        default: return { icon: InfoIcon, bg: 'bg-slate-50 text-slate-600 dark:bg-slate-900/20' };
    }
  };

  return (
    <Layout title="Pemberitahuan" subtitle="Update Sistem & Pengumuman" icon={BellIcon} onBack={onBack}>
      <div className="p-4 lg:p-8 pb-32 max-w-2xl mx-auto w-full space-y-6">
        {loading ? (
            <div className="py-20 text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Sinkronisasi Pesan...</p>
            </div>
        ) : notifications.length > 0 ? (
            <div className="space-y-3 animate-in fade-in duration-500">
                {notifications.map((notif) => {
                    const style = getTypeStyle(notif.type);
                    return (
                        <div key={notif.id} className="bg-white dark:bg-[#151E32] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${style.bg}`}>
                                    <style.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none truncate pr-2">{notif.title}</h4>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                            {format(new Date(notif.date), "dd MMM", { locale: localeID })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-3">{notif.message}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{notif.sender}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-300">
                                            <ClockIcon className="w-3 h-3" />
                                            <span className="text-[8px] font-bold">{format(new Date(notif.date), "HH:mm")}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
                <BellIcon className="w-16 h-16 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Belum ada pemberitahuan</p>
            </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationCenter;
