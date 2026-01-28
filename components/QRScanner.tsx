
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import Layout from './Layout';
import { 
  CheckCircleIcon, XCircleIcon, CameraIcon, 
  ClockIcon, SunIcon, ArrowPathIcon, 
  HeartIcon
} from './Icons';
import { toast } from 'sonner';

interface QRScannerProps {
  onBack: () => void;
}

interface NotificationItem {
  id: string;
  name: string;
  idUnik: string;
  className: string;
  status: 'success' | 'error' | 'warning' | 'haid';
  message: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  // LOGIKA 5 SESI OTOMATIS BERDASARKAN JAM
  const getAutoSession = (): AttendanceSession => {
    const hours = new Date().getHours();
    const minutes = new Date().getMinutes();
    const timeVal = hours * 60 + minutes;
    
    if (timeVal < 450) return 'Masuk';      // Sebelum 07:30
    if (timeVal < 660) return 'Duha';       // 07:30 - 11:00
    if (timeVal < 840) return 'Zuhur';      // 11:00 - 14:00
    if (timeVal < 975) return 'Ashar';      // 14:00 - 16:15
    return 'Pulang';                        // Setelah 16:15
  };

  const [session, setSession] = useState<AttendanceSession>(getAutoSession());
  const [isHaidMode, setIsHaidMode] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{id: string, time: number}>({ id: '', time: 0 });
  const isLocked = useRef(false);

  const sessionRef = useRef(session);
  const haidRef = useRef(isHaidMode);
  
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { haidRef.current = isHaidMode; }, [isHaidMode]);

  const playFeedback = (type: 'success' | 'error') => {
    if (navigator.vibrate) {
        navigator.vibrate(type === 'success' ? 50 : [100, 30, 100]);
    }
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'square';
      if (type === 'success') {
        osc.frequency.setValueAtTime(1600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(80, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {}
  };

  const handleScan = useCallback(async (decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScannedRef.current.id && (now - lastScannedRef.current.time < 800)) return;
    if (isLocked.current) return;

    isLocked.current = true;
    lastScannedRef.current = { id: decodedText, time: now };

    try {
      const result = await recordAttendanceByScan(decodedText, sessionRef.current, haidRef.current);
      
      // Klasifikasi Status Visual
      let determinedStatus: NotificationItem['status'] = 'error';
      if (result.success) {
          determinedStatus = haidRef.current ? 'haid' : 'success';
      } else if (result.message.includes('SUDAH TERREKAM')) {
          determinedStatus = 'warning';
      }

      const newItem: NotificationItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.student?.namaLengkap || (result.success ? 'NAMA TERVERIFIKASI' : 'ID TIDAK DIKENAL'),
        idUnik: result.student?.idUnik || decodedText,
        className: result.student?.tingkatRombel || 'KELAS N/A',
        status: determinedStatus,
        message: result.message
      };

      const feedbackSound = (determinedStatus === 'success' || determinedStatus === 'warning' || determinedStatus === 'haid') ? 'success' : 'error';
      playFeedback(feedbackSound);
      
      setNotifications(prev => [newItem, ...prev].slice(0, 4));

      setTimeout(() => { isLocked.current = false; }, 300);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(item => item.id !== newItem.id));
      }, 3500);

    } catch (e) {
      isLocked.current = false;
      toast.error("Sensor Failure");
    }
  }, []);

  const startScanner = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setCameraError(null);

    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch (e) {}
    }

    try {
      const html5QrCode = new Html5Qrcode("reader-core", { 
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          verbose: false 
      });
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: facingMode },
        { 
          fps: 60,
          qrbox: (w, h) => { 
              const s = Math.min(w, h) * 0.85; 
              return { width: s, height: s }; 
          },
          aspectRatio: 1.0,
          disableFlip: false
        },
        handleScan,
        () => {}
      );

      setCameraActive(true);
      try {
        const track = (html5QrCode as any).getRunningTrack();
        setHasTorch(!!track?.getCapabilities()?.torch);
      } catch(e) {}
    } catch (err: any) {
      setCameraError("Akses kamera ditolak.");
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
      if (isInitializing) return;
      setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await (scannerRef.current as any).applyVideoConstraints({ advanced: [{ torch: next }] });
      setIsTorchOn(next);
    } catch(e) {}
  };

  return (
    <Layout title="IMAM Hyper Scan" subtitle={`${session} Mode • 5 Sesi Aktif`} icon={CameraIcon} onBack={onBack}>
      <div className="flex flex-col h-full bg-black relative overflow-hidden select-none">
          
          {/* FLOATING NOTIFICATIONS */}
          <div className="absolute top-4 inset-x-4 z-[70] flex flex-col gap-3 pointer-events-none">
              {notifications.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white/95 dark:bg-[#0B1121]/95 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/20 flex items-center gap-5 animate-in fade-in slide-in-from-top-4 duration-500 ring-2 ring-black/5"
                  >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white transform transition-transform animate-bounce ${
                          item.status === 'error' ? 'bg-rose-600 shadow-rose-500/30' : 
                          item.status === 'haid' ? 'bg-rose-500 shadow-rose-400/30' :
                          item.status === 'warning' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'
                      }`}>
                          {item.status === 'error' ? <XCircleIcon className="w-9 h-9" /> : 
                           item.status === 'haid' ? <HeartIcon className="w-9 h-9 fill-current" /> :
                           item.status === 'warning' ? <ClockIcon className="w-9 h-9" /> : <CheckCircleIcon className="w-9 h-9" />}
                      </div>

                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                 item.status === 'error' ? 'bg-rose-50 text-rose-600' : 
                                 item.status === 'warning' ? 'bg-amber-50 text-amber-600' :
                                 item.status === 'haid' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'
                             }`}>
                                {item.message}
                             </span>
                          </div>
                          
                          <h4 className={`text-base font-black uppercase truncate leading-none mb-2 ${item.status === 'error' ? 'text-rose-600' : item.status === 'haid' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                              {item.name}
                          </h4>

                          <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">ID UNIK</span>
                                <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400">{item.idUnik}</span>
                              </div>
                              <div className="w-px h-6 bg-slate-100 dark:bg-slate-800"></div>
                              <div className="flex flex-col">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">KELAS</span>
                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">{item.className}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          {/* TOP CONTROLS (5 SESI SCROLLABLE) */}
          <div className="absolute top-0 inset-x-0 z-30 p-3 bg-gradient-to-b from-black/70 to-transparent pt-6">
              <div className="flex flex-col gap-3">
                  <div className="flex gap-1.5 bg-white/10 backdrop-blur-2xl p-1.5 rounded-[1.8rem] border border-white/10 w-full shadow-2xl overflow-x-auto scrollbar-hide">
                      {['Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'].map((s) => (
                          <button
                              key={s}
                              onClick={() => setSession(s as AttendanceSession)}
                              className={`flex-1 min-w-[75px] py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                  session === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/30 hover:bg-white/5'
                              }`}
                          >
                              {s}
                          </button>
                      ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                        onClick={() => setIsHaidMode(!isHaidMode)}
                        className={`flex-[4] py-4 rounded-[1.5rem] flex items-center justify-center gap-3 border transition-all font-black text-[10px] uppercase tracking-widest ${
                            isHaidMode ? 'bg-rose-600 border-rose-400 text-white animate-pulse shadow-lg shadow-rose-600/20' : 'bg-black/40 border-white/10 text-white/40'
                        }`}
                    >
                        <HeartIcon className={`w-4 h-4 ${isHaidMode ? 'fill-current' : ''}`} />
                        Mode Haid {isHaidMode ? 'AKTIF' : ''}
                    </button>
                    <button onClick={toggleCamera} className="flex-1 py-4 rounded-[1.5rem] bg-white/10 backdrop-blur-xl text-white border border-white/10 flex items-center justify-center active:scale-95 transition-all">
                        <ArrowPathIcon className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
              </div>
          </div>

          {/* SCANNER VIEWPORT */}
          <div className="flex-1 relative flex items-center justify-center bg-slate-950 overflow-hidden">
              <div id="reader-core" className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover opacity-80"></div>
              
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                  <div className={`relative w-72 h-72 transition-all duration-500 ${notifications.length > 0 ? 'scale-75 opacity-20 blur-sm' : 'scale-100 opacity-100'}`}>
                      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-indigo-500 rounded-tl-3xl shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-indigo-500 rounded-tr-3xl shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-indigo-500 rounded-bl-3xl shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-indigo-500 rounded-br-3xl shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
                      <div className="absolute inset-x-6 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_20px_#6366f1] animate-scan-y top-0"></div>
                  </div>
                  
                  <div className="mt-16 flex flex-col items-center gap-6 pointer-events-auto">
                      <div className="px-6 py-2 bg-black/80 backdrop-blur-2xl rounded-full border border-white/10 flex items-center gap-3 shadow-2xl">
                        <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`}></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">{cameraActive ? 'Lensa Aktif: Arahkan ke Kode' : 'Menghubungkan Sensor...'}</span>
                      </div>
                      <div className="flex gap-5">
                          {hasTorch && facingMode === 'environment' && (
                              <button onClick={toggleTorch} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all border ${isTorchOn ? 'bg-yellow-400 border-yellow-300 text-black shadow-xl' : 'bg-black/60 border-white/10 text-white'}`}><SunIcon className="w-7 h-7" /></button>
                          )}
                          <button onClick={toggleCamera} className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white shadow-2xl flex items-center justify-center transition-all border border-indigo-400/50 active:scale-90"><CameraIcon className="w-7 h-7" /></button>
                      </div>
                  </div>
              </div>

              {cameraError && (
                  <div className="absolute inset-0 bg-slate-950 z-40 flex flex-col items-center justify-center p-10 text-center">
                      <XCircleIcon className="w-20 h-20 text-rose-500 mb-6" />
                      <p className="text-white text-lg font-black mb-8 uppercase tracking-widest leading-none">Sensor Offline</p>
                      <button onClick={() => startScanner()} className="px-12 py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95">Restart Lensa</button>
                  </div>
              )}
          </div>
      </div>
    </Layout>
  );
};

export default QRScanner;
