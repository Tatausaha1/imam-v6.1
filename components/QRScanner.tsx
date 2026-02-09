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
  CheckCircleIcon, ShieldCheckIcon, ClockIcon, XCircleIcon
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
    type: 'success' | 'error' | 'warning' | 'haid';
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
  const [showFlash, setShowFlash] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessing = useRef(false);
  const isMounted = useRef(true);

  // OPTIMASI AUDIO: Pre-load audio objects
  const audioSuccess = useRef<HTMLAudioElement | null>(null);
  const audioError = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inisialisasi audio hanya sekali di awal
    audioSuccess.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioError.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');
    
    if (audioSuccess.current) audioSuccess.current.volume = 0.3;
    if (audioError.current) audioError.current.volume = 0.3;
  }, []);

  const playBeep = (type: 'success' | 'error') => {
    const audio = type === 'success' ? audioSuccess.current : audioError.current;
    if (audio) {
      // Reset ke awal agar bisa diputar berulang kali dengan cepat (0.5s)
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
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

    const mLimit = config ? toMin(config.masukLimit) : 480; 
    const dStart = config ? toMin(config.duhaStart) : 481; 
    const dEnd = config ? toMin(config.duhaEnd) : 600;     
    const zStart = config ? toMin(config.zuhurStart) : 720; 
    const zEnd = config ? toMin(config.zuhurEnd) : 840;     
    const aStart = config ? toMin(config.asharStart) : 900; 
    const aEnd = config ? toMin(config.asharEnd) : 1020;     
    
    let pLimitStr = config?.pulangLimit || "16:00";
    if (currentDay === 5) pLimitStr = config?.pulangLimitJumat || "11:30";
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
    if (!cleanCode || isProcessing.current) return;
    
    isProcessing.current = true;

    if (session === 'Luar Sesi') {
        setShowFlash('warning');
        playBeep('error');
        const result: RecentScan = {
            id: cleanCode,
            name: "Siswa Terdeteksi",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "Belum Masuk Sesi Aktif",
            type: 'warning'
        };
        setLastScanned(result);
        setTimeout(() => { 
            if (isMounted.current) {
                setLastScanned(null); 
                setShowFlash(null); 
                isProcessing.current = false; 
            }
        }, 500); 
        return;
    }

    try {
      const result = await recordAttendanceByScan(cleanCode, session as AttendanceSession, isHaidMode);
      
      if (result.success) {
          setShowFlash(isHaidMode ? 'haid' : 'success');
          playBeep('success'); // Instant Playback
          if (navigator.vibrate) navigator.vibrate(80);

          const newScan: RecentScan = {
              id: cleanCode,
              name: result.student?.namaLengkap || 'Identitas Terverifikasi',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: result.message,
              type: isHaidMode ? 'haid' : 'success'
          };
          setLastScanned(newScan);
          setScanHistory(prev => [newScan, ...prev].slice(0, 3));
      } else {
          const isAlreadyScanned = result.message.includes("SUDAH SCAN");
          
          if (isAlreadyScanned) {
              setShowFlash('warning');
              // Sesuai request sebelumnya: Sudah Scan tanpa suara
              const warnScan: RecentScan = {
                  id: cleanCode,
                  name: result.student?.namaLengkap || "Perhatian",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: result.message,
                  type: 'warning'
              };
              setLastScanned(warnScan);
          } else {
              setShowFlash('error');
              playBeep('error'); // Instant Playback
              const errScan: RecentScan = {
                  id: cleanCode,
                  name: result.student?.namaLengkap || "Gagal Absensi",
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: result.message,
                  type: 'error'
              };
              setLastScanned(errScan);
          }
      }
      
      // ULTRA SPEED: Reset processing state in 0.5s
      setTimeout(() => { 
        if (isMounted.current) {
          setLastScanned(null); 
          setShowFlash(null);
          isProcessing.current = false; 
        }
      }, 500);
    } catch (e) { 
        isProcessing.current = false; 
        setShowFlash(null);
    }
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
      
      const width = window.innerWidth;
      const height = window.innerHeight;

      await html5QrCode.start(
        { facingMode: mode }, 
        { 
            fps: 60,
            // NO QRBOX: Full Frame active sensor for maximum speed
            aspectRatio: width / height,
            videoConstraints: { 
                focusMode: "continuous", 
                facingMode: mode,
                frameRate: { ideal: 60, min: 30 }
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
      if (mode === "environment" && isMounted.current) setFacingMode("user");
    }
  }, [handleScan]);

  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
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
    init();
    return () => { isMounted.current = false; };
  }, [detectSession]);

  useEffect(() => { 
      if (!isInitializing) startScanner(facingMode);
      return () => { 
          if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
            scannerRef.current.stop().catch(() => {});
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

  const getFlashColor = () => {
      if (showFlash === 'success') return 'bg-emerald-500/20';
      if (showFlash === 'error') return 'bg-rose-500/20';
      if (showFlash === 'warning') return 'bg-amber-500/20';
      if (showFlash === 'haid') return 'bg-pink-500/20';
      return 'bg-transparent';
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden select-none">
        
        {/* FLASH EFFECT LAYER */}
        <div className={`absolute inset-0 z-[100] pointer-events-none transition-all duration-100 ${getFlashColor()}`}></div>

        {/* --- CAMERA ENGINE --- */}
        <div id="reader-core" className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover opacity-100"></div>

        {/* --- DYNAMIC NOTIFICATION --- */}
        <div className="absolute top-6 inset-x-0 z-[150] flex justify-center pointer-events-none px-4">
            {lastScanned && (
                <div className={`w-full max-w-[340px] backdrop-blur-3xl px-5 py-3.5 rounded-[2.2rem] border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-in slide-in-from-top-10 duration-300 ring-4 ring-black/20 ${
                    lastScanned.type === 'success' ? 'bg-emerald-600/90 border-emerald-400/40' :
                    lastScanned.type === 'error' ? 'bg-rose-600/90 border-rose-400/40' :
                    lastScanned.type === 'haid' ? 'bg-pink-600/90 border-pink-400/40' :
                    'bg-amber-600/90 border-amber-400/40'
                }`}>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                        {lastScanned.type === 'success' || lastScanned.type === 'haid' ? <CheckCircleIcon className="w-5 h-5 text-white" /> : <XCircleIcon className="w-5 h-5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-black text-white uppercase truncate tracking-tight">{lastScanned.name}</h4>
                        <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest mt-0.5">{lastScanned.status}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[8px] font-mono text-white/60">{lastScanned.time}</span>
                    </div>
                </div>
            )}
        </div>

        {/* --- FLOATING CONTROLS --- */}
        <div className="absolute top-16 inset-x-6 z-50 flex items-start justify-between pointer-events-auto">
            <button 
                onClick={onBack} 
                className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 transition-all shadow-2xl"
            >
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-end gap-2">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl flex flex-col items-end shadow-2xl">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${session === 'Luar Sesi' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {session === 'Luar Sesi' ? 'Sesi Tutup' : session.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-black text-white opacity-60">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>

        {/* --- BOTTOM ACTIVITY REEL & CONTROLS --- */}
        <div className="absolute bottom-10 inset-x-0 z-50 flex flex-col items-center gap-6">
            
            <div className="w-full max-w-xs space-y-1.5 px-6 pointer-events-none">
                {scanHistory.slice(0, 2).map((h, i) => (
                    <div key={i} className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5 animate-in slide-in-from-bottom-2" style={{ opacity: 1 - (i * 0.4) }}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black ${h.type === 'haid' ? 'bg-pink-500/20 text-pink-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {h.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-white/80 uppercase truncate">{h.name}</p>
                            <p className="text-[7px] font-bold text-white/20 uppercase tracking-tighter">{h.status}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-8 pointer-events-auto">
                <button 
                    onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                    className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-75 transition-all shadow-xl"
                >
                    <ArrowPathIcon className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={() => {
                        const next = !isHaidMode;
                        setIsHaidMode(next);
                        toast.info(`Mode Haid ${next ? 'AKTIF' : 'NONAKTIF'}`);
                    }}
                    className={`w-18 h-18 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 border-2 shadow-2xl ${isHaidMode ? 'bg-pink-600 border-pink-400 text-white animate-pulse' : 'bg-white/5 backdrop-blur-md border-white/10 text-white'}`}
                >
                    <HeartIcon className={`w-7 h-7 ${isHaidMode ? 'fill-current' : ''}`} />
                </button>

                {hasTorch && (
                    <button 
                        onClick={toggleTorch}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-75 shadow-xl border ${isTorchOn ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'bg-white/5 backdrop-blur-md border-white/10 text-white'}`}
                    >
                        <SunIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>

        {/* INITIALIZING SCREEN */}
        {isInitializing && (
            <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-6">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-40" />
                <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.5em] animate-pulse">Lense Engine v6.4 Ultra-Fast</p>
            </div>
        )}
    </div>
  );
};

export default QRScanner;