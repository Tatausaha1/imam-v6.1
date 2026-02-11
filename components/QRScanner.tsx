
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import { 
  CameraIcon, SunIcon, ArrowPathIcon, 
  HeartIcon, Loader2, ArrowLeftIcon, 
  CheckCircleIcon, SignalIcon, WifiIcon, ClockIcon,
  XCircleIcon, UsersIcon, ShieldCheckIcon
} from './Icons';
import { db, isMockMode } from '../services/firebase';
import { toast } from 'sonner';

interface QRScannerProps {
  onBack: () => void;
}

interface RecentScan {
    id: string;
    name: string;
    time: string;
    status: string;
    isReadOnly?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const [session, setSession] = useState<AttendanceSession | 'Luar Sesi'>('Luar Sesi');
  const [isHaidMode, setIsHaidMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [lastScanned, setLastScanned] = useState<RecentScan | null>(null);
  const [scanHistory, setScanHistory] = useState<RecentScan[]>([]);
  const [showFlash, setShowFlash] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isLocked = useRef(false);
  const isMounted = useRef(true);

  // Audio feedback minimalis
  const playBeep = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.3;
      audio.play();
    } catch (e) {}
  };

  const detectSession = useCallback((config: any): AttendanceSession | 'Luar Sesi' => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    if (config?.workingDays && !config.workingDays.includes(currentDay)) return 'Luar Sesi';
    
    const toMin = (t: string) => {
        if(!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const configData = config || {
        masukLimit: "07:30",
        duhaStart: "07:31",
        duhaEnd: "10:00",
        zuhurStart: "12:00",
        zuhurEnd: "14:00",
        asharStart: "15:30",
        asharEnd: "16:30",
        pulangLimit: "16:00",
        pulangLimitJumat: "11:30"
    };

    const mLimit = toMin(configData.masukLimit);
    const dStart = toMin(configData.duhaStart);
    const dEnd = toMin(configData.duhaEnd);
    const zStart = toMin(configData.zuhurStart);
    const zEnd = toMin(configData.zuhurEnd);
    const aStart = toMin(configData.asharStart);
    const aEnd = toMin(configData.asharEnd);
    
    let pLimitStr = configData.pulangLimit;
    if (currentDay === 5) pLimitStr = configData.pulangLimitJumat;
    const pLimit = toMin(pLimitStr);

    if (currentTime <= mLimit) return 'Masuk';
    if (currentTime >= dStart && currentTime <= dEnd) return 'Duha';
    if (currentTime >= zStart && currentTime <= zEnd) return 'Zuhur';
    if (currentTime >= aStart && currentTime <= aEnd) return 'Ashar';
    if (currentTime >= pLimit && currentTime <= (pLimit + 240)) return 'Pulang';

    return 'Luar Sesi';
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode || isLocked.current) return;
    
    isLocked.current = true; // Lock immediately to prevent double reads

    try {
      const result = await recordAttendanceByScan(cleanCode, session as AttendanceSession, isHaidMode);
      
      if (result.success) {
          playBeep();
          if (navigator.vibrate) navigator.vibrate(100);
          
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 200);

          const newScan: RecentScan = {
              id: cleanCode,
              name: result.student?.namaLengkap || 'Terverifikasi',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: result.message
          };

          setLastScanned(newScan);
          setScanHistory(prev => [newScan, ...prev].slice(0, 3));
          
          // Reset pop up setelah 3 detik
          setTimeout(() => setLastScanned(null), 3000);
      } else {
          toast.error(result.message);
      }
      
      // Jeda lock 1.5 detik untuk stabilitas biaya Firestore
      setTimeout(() => { isLocked.current = false; }, 1500);
    } catch (e) { isLocked.current = false; }
  }, [session, isHaidMode]);

  const startScanner = useCallback(async (mode: "environment" | "user") => {
    if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch (e) {}
    }

    const container = document.getElementById("reader-core");
    if (!container || !isMounted.current) return;

    try {
      const html5QrCode = new Html5Qrcode("reader-core", { 
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], 
          verbose: false 
      });
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: mode }, 
        { 
            fps: 30, // Optimized for smooth scanning
            aspectRatio: 1.0, // Force square for performance
            qrbox: { width: 250, height: 250 },
            videoConstraints: { 
                facingMode: mode, 
                focusMode: "continuous",
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 }
            } as any
        }, 
        handleScan, 
        () => {}
      );
      
      if (isMounted.current) {
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          setHasTorch(!!(capabilities as any)?.torch);
        } catch (e) { setHasTorch(false); }
      }
    } catch (err: any) {
      console.warn("Scanner failed to start:", err);
      if (mode === "environment" && isMounted.current) {
          setFacingMode("user");
      }
    }
  }, [handleScan]);

  useEffect(() => {
    isMounted.current = true;
    const initScannerSystem = async () => {
        setIsInitializing(true);
        let config = null;
        if (!isMockMode && db) {
            try {
                const snap = await db.collection('academic_years').where('isActive', '==', true).limit(1).get();
                if (!snap.empty) {
                    config = snap.docs[0].data().config;
                    setIsDbConnected(true);
                }
            } catch (e) { setIsDbConnected(false); }
        } else { setIsDbConnected(true); }

        if (isMounted.current) {
          setSession(detectSession(config));
          setIsInitializing(false);
        }
    };
    initScannerSystem();
    return () => { isMounted.current = false; };
  }, [detectSession]);

  useEffect(() => { 
      if (!isInitializing) {
          startScanner(facingMode);
      }
      return () => { 
          if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
          }
      }; 
  }, [facingMode, isInitializing, startScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] } as any);
      setIsTorchOn(next);
    } catch(e) {}
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden select-none safe-pt">
        
        {/* FLASH EFFECT ON SUCCESS */}
        <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${showFlash ? 'opacity-30' : 'opacity-0'} ${isHaidMode ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>

        <div className="flex-1 relative bg-black overflow-hidden">
            
            {/* GUIDING TARGET */}
            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/20 rounded-[2.5rem] relative">
                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-[1.5rem]"></div>
                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-[1.5rem]"></div>
                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-[1.5rem]"></div>
                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-[1.5rem]"></div>
                </div>
            </div>

            {isInitializing ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-40" />
                    <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.4em]">Initializing Module</p>
                </div>
            ) : (
                <>
                    {/* CAMERA CORE */}
                    <div 
                      id="reader-core" 
                      className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover overflow-hidden [&_canvas]:hidden"
                      style={{ transform: 'translateZ(0)' }}
                    ></div>

                    {/* OVERLAY: HEADER */}
                    <div className="absolute top-6 inset-x-4 z-50 flex items-start justify-between pointer-events-none">
                        <button onClick={onBack} className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 pointer-events-auto">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-end shadow-2xl">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${session === 'Luar Sesi' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {session.toUpperCase()}
                            </span>
                            <span className="text-sm font-mono font-black text-white">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    {/* OVERLAY: HAID TOGGLE */}
                    {['Duha', 'Zuhur', 'Ashar'].includes(session) && (
                        <div className="absolute top-32 inset-x-0 z-30 flex justify-center pointer-events-none">
                            <button 
                                onClick={() => setIsHaidMode(!isHaidMode)} 
                                className={`px-8 py-3.5 rounded-full flex items-center gap-3 border transition-all font-black text-[9px] uppercase tracking-widest pointer-events-auto shadow-2xl ${
                                    isHaidMode 
                                    ? 'bg-rose-600 border-rose-400 text-white scale-110' 
                                    : 'bg-black/40 backdrop-blur-xl border-white/10 text-white/50'
                                }`}
                            >
                                <HeartIcon className={`w-3.5 h-3.5 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} />
                                {isHaidMode ? 'Mode Ibadah (Haid) AKTIF' : 'Ibadah (Haid)'}
                            </button>
                        </div>
                    )}

                    {/* RECENT SCAN POPUP (MOBILE OPTIMIZED) */}
                    {lastScanned && (
                        <div className="absolute bottom-40 inset-x-6 z-[80] animate-in slide-in-from-bottom-8 duration-500">
                            <div className={`w-full backdrop-blur-3xl px-6 py-5 rounded-[2.5rem] border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 ${
                                isHaidMode ? 'bg-rose-600/90 border-rose-400/50' : 'bg-emerald-600/90 border-emerald-400/50'
                            }`}>
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                                    <CheckCircleIcon className="w-7 h-7 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-black text-white uppercase truncate tracking-tight">{lastScanned.name}</h4>
                                    <p className="text-[9px] font-bold text-white/70 uppercase tracking-[0.15em] mt-1">{lastScanned.status}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HARDWARE CONTROLS */}
                    <div className="absolute bottom-10 right-6 z-40 flex flex-col gap-4 pointer-events-none">
                        {hasTorch && (
                            <button 
                              onClick={toggleTorch} 
                              className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-75 pointer-events-auto border border-white/10 ${isTorchOn ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'bg-black/40 backdrop-blur-xl text-white/40'}`}
                            >
                                <SunIcon className="w-6 h-6" />
                            </button>
                        )}
                        <button 
                            onClick={toggleCamera} 
                            className="w-14 h-14 rounded-[1.5rem] bg-black/40 backdrop-blur-xl border border-white/10 text-white/40 flex items-center justify-center active:scale-75 pointer-events-auto transition-all"
                        >
                            <ArrowPathIcon className="w-6 h-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default QRScanner;
