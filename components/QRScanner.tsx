
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
  HeartIcon, Loader2
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
  timeDiff?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const [session, setSession] = useState<AttendanceSession>('Masuk');
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

  const detectSession = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    if (currentTime >= 360 && currentTime <= 450) return 'Masuk';
    if (currentTime > 450 && currentTime <= 600) return 'Duha';
    if (currentTime > 600 && currentTime <= 840) return 'Zuhur';
    if (currentTime > 840 && currentTime <= 960) return 'Ashar';
    if (currentTime > 960 || currentTime < 360) return 'Pulang';
    return 'Masuk';
  }, []);

  useEffect(() => {
    const currentSession = detectSession();
    setSession(currentSession as AttendanceSession);
    const interval = setInterval(() => {
        setSession(detectSession() as AttendanceSession);
    }, 300000);
    return () => clearInterval(interval);
  }, [detectSession]);

  const sessionRef = useRef(session);
  const haidRef = useRef(isHaidMode);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { haidRef.current = isHaidMode; }, [isHaidMode]);

  const playFeedback = (type: 'success' | 'error') => {
    if (navigator.vibrate) {
        navigator.vibrate(type === 'success' ? 50 : [100, 30, 100]);
    }
  };

  const handleScan = useCallback(async (decodedText: string) => {
    const cleanCode = decodedText.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
    if (!cleanCode) return;

    const now = Date.now();
    if (cleanCode === lastScannedRef.current.id && (now - lastScannedRef.current.time < 3000)) return;
    if (isLocked.current) return;

    isLocked.current = true;
    lastScannedRef.current = { id: cleanCode, time: now };

    try {
      const result = await recordAttendanceByScan(cleanCode, sessionRef.current, haidRef.current);
      
      let determinedStatus: NotificationItem['status'] = 'error';
      let diffText = '';

      if (result.success) {
          determinedStatus = haidRef.current ? 'haid' : 'success';
          if (result.message.includes('(+')) diffText = '+' + result.message.split('(+')[1].split(')')[0];
          if (result.message.includes('(-')) diffText = '-' + result.message.split('(-')[1].split(')')[0];
      } else if (result.message.includes('SUDAH')) {
          determinedStatus = 'warning';
      }

      const newItem: NotificationItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.student?.namaLengkap || (result.success ? 'TERVERIFIKASI' : 'DATA TIDAK VALID'),
        idUnik: result.student?.idUnik || cleanCode,
        className: result.student?.tingkatRombel || 'N/A',
        status: determinedStatus,
        message: result.message.split(' (')[0],
        timeDiff: diffText
      };

      playFeedback(result.success || determinedStatus === 'warning' ? 'success' : 'error');
      setNotifications(prev => [newItem, ...prev].slice(0, 3));
      
      setTimeout(() => { isLocked.current = false; }, 800);
      setTimeout(() => {
        setNotifications(prev => prev.filter(item => item.id !== newItem.id));
      }, 5000);
    } catch (e) {
      isLocked.current = false;
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

    await new Promise(r => setTimeout(r, 400));

    try {
      const html5QrCode = new Html5Qrcode("reader-core", { 
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          verbose: false 
      });
      scannerRef.current = html5QrCode;
      
      const config = {
          fps: 30,
          qrbox: (w: number, h: number) => {
              const minDim = Math.min(w, h);
              // Kotak bidik lebih besar dan responsif
              const boxSize = Math.floor(minDim * 0.65);
              return { width: boxSize, height: boxSize };
          },
          aspectRatio: undefined, // Biarkan browser menentukan aspect ratio terbaik (Full Feed)
          disableFlip: false,
          videoConstraints: {
              facingMode: facingMode,
              focusMode: "continuous",
              width: { ideal: 1920 },
              height: { ideal: 1080 }
          }
      };

      await html5QrCode.start({ facingMode: facingMode }, config, handleScan, () => {});
      setCameraActive(true);
      
      // Auto-set torch status
      try {
        const track = (html5QrCode as any).getRunningTrack();
        const caps = track?.getCapabilities();
        setHasTorch(!!caps?.torch);
      } catch(e) {}
    } catch (err: any) {
      setCameraError("Akses kamera ditolak atau tidak tersedia.");
      setCameraActive(false);
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
    } catch(e) {
        toast.error("Gagal mengontrol senter.");
    }
  };

  return (
    <Layout title="Lensa Presensi" subtitle={`Sesi: ${session}`} icon={CameraIcon} onBack={onBack}>
      <div className="flex flex-col h-full bg-black relative overflow-hidden select-none">
          
          {/* OVERLAY NOTIFIKASI - GLASSMORPHISM */}
          <div className="absolute top-4 inset-x-4 z-[70] flex flex-col gap-3 pointer-events-none">
              {notifications.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-3xl rounded-[2.5rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-10 duration-500 ring-1 ring-black/5"
                  >
                      <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg text-white relative ${
                          item.status === 'error' ? 'bg-rose-600 animate-pulse' : 
                          item.status === 'haid' ? 'bg-rose-50 border border-rose-200' :
                          item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                          {item.status === 'error' ? <XCircleIcon className="w-8 h-8" /> : 
                           item.status === 'haid' ? <HeartIcon className="w-8 h-8 fill-current text-rose-600" /> :
                           item.status === 'warning' ? <ClockIcon className="w-8 h-8" /> : <CheckCircleIcon className="w-8 h-8" />}
                          
                          {item.timeDiff && (
                              <div className={`absolute -bottom-2 -right-2 px-2 py-1 rounded-lg text-[10px] font-black border-2 border-white shadow-md animate-bounce ${item.timeDiff.includes('+') ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'}`}>
                                  {item.timeDiff}
                              </div>
                          )}
                      </div>

                      <div className="flex-1 min-w-0">
                          <h4 className={`text-[13px] font-black uppercase truncate leading-none mb-1.5 ${item.status === 'error' ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                              {item.name}
                          </h4>
                          <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                {item.className}
                              </span>
                              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.message}</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          {/* KONTROL STATUS SESI */}
          <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/60 to-transparent pt-6 text-center">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                  <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{session.toUpperCase()} • {cameraActive ? 'AKTIF' : 'OFFLINE'}</span>
              </div>
              
              <div className="mt-3 max-w-xs mx-auto">
                  <button 
                      onClick={() => setIsHaidMode(!isHaidMode)}
                      className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 border transition-all font-black text-[9px] uppercase tracking-[0.2em] ${
                          isHaidMode ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]' : 'bg-black/40 border-white/10 text-white/40'
                      }`}
                  >
                      <HeartIcon className={`w-4 h-4 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} />
                      Sesi Ibadah (Haid) {isHaidMode ? 'AKTIF' : ''}
                  </button>
              </div>
          </div>

          {/* VIEWPORT PEMINDAI - FULL FRAME CONFIGURATION */}
          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
              <div 
                id="reader-core" 
                className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
              ></div>
              
              {/* TARGETING FRAME */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                  <div className={`relative w-64 h-64 md:w-80 md:h-80 transition-all duration-700 ${notifications.length > 0 ? 'scale-75 opacity-10 blur-xl' : 'scale-100 opacity-100'}`}>
                      <div className={`absolute top-0 left-0 w-16 h-16 border-t-[6px] border-l-[6px] rounded-tl-[2.5rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'} shadow-[0_0_30px_rgba(79,70,229,0.3)]`}></div>
                      <div className={`absolute top-0 right-0 w-16 h-16 border-t-[6px] border-r-[6px] rounded-tr-[2.5rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'} shadow-[0_0_30px_rgba(79,70,229,0.3)]`}></div>
                      <div className={`absolute bottom-0 left-0 w-16 h-16 border-b-[6px] border-l-[6px] rounded-bl-[2.5rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'} shadow-[0_0_30px_rgba(79,70,229,0.3)]`}></div>
                      <div className={`absolute bottom-0 right-0 w-16 h-16 border-b-[6px] border-r-[6px] rounded-br-[2.5rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'} shadow-[0_0_30px_rgba(79,70,229,0.3)]`}></div>
                      
                      <div className={`absolute inset-x-12 h-1 bg-gradient-to-r from-transparent via-current to-transparent animate-scan-y top-0 opacity-80 ${isHaidMode ? 'text-rose-400' : 'text-indigo-400'}`}>
                          <div className={`absolute inset-0 blur-md ${isHaidMode ? 'bg-rose-400' : 'bg-indigo-400'}`}></div>
                      </div>
                  </div>
                  
                  <div className="mt-20 px-8 py-3 bg-black/60 backdrop-blur-2xl rounded-full border border-white/10 flex items-center gap-3 shadow-2xl">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] animate-pulse">
                        {isInitializing ? 'Sinkronisasi Kernel...' : 'Tempatkan Kode QR di Tengah'}
                    </span>
                  </div>
              </div>

              {/* DOCK KONTROL BAWAH */}
              <div className="absolute bottom-12 inset-x-0 z-40 flex justify-center items-center px-8">
                  <div className="flex items-center gap-8 bg-black/40 backdrop-blur-3xl p-5 rounded-[4rem] border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                      
                      <button 
                        onClick={toggleTorch}
                        disabled={!hasTorch || facingMode !== 'environment'}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-75 ${
                            isTorchOn ? 'bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.6)]' : 'bg-white/5 text-white hover:bg-white/10 disabled:opacity-10'
                        }`}
                      >
                        <SunIcon className="w-8 h-8" />
                      </button>

                      <button 
                        onClick={toggleCamera}
                        disabled={isInitializing}
                        className="relative w-24 h-24 rounded-full bg-white text-indigo-600 shadow-[0_0_60px_rgba(255,255,255,0.3)] flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 group border-[6px] border-white/10"
                      >
                        <div className={`transition-transform duration-1000 ease-in-out ${isInitializing ? 'animate-spin' : 'group-active:rotate-180'}`}>
                            <ArrowPathIcon className="w-12 h-12" />
                        </div>
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em]">Switch</span>
                        </div>
                      </button>

                      <div className="px-6 py-2 flex flex-col items-center justify-center text-white/40 border-l border-white/10">
                          <CameraIcon className={`w-8 h-8 mb-1 transition-colors ${facingMode === 'environment' ? 'text-indigo-400' : 'text-emerald-400'}`} />
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{facingMode === 'environment' ? 'BACK' : 'FRONT'}</span>
                      </div>
                  </div>
              </div>

              {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
                      <div className="w-24 h-24 bg-rose-500/20 rounded-[3rem] flex items-center justify-center mb-8 border border-rose-500/30">
                        <XCircleIcon className="w-12 h-12 text-rose-500" />
                      </div>
                      <h3 className="text-white text-xl font-black uppercase tracking-tight mb-4">Lensa Terblokir</h3>
                      <p className="text-slate-400 text-sm mb-12 leading-relaxed max-w-xs">Izin kamera diperlukan untuk operasional presensi digital madrasah.</p>
                      <button 
                        onClick={() => startScanner()} 
                        className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center gap-3 hover:bg-indigo-700"
                      >
                        <ArrowPathIcon className="w-5 h-5" /> Aktifkan Lensa
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default QRScanner;
