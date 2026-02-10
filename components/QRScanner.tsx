
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

  const playBeep = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.4;
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
    if (!cleanCode || isLocked.current) return;
    
    isLocked.current = true;

    if (session === 'Luar Sesi') {
        try {
            let studentName = "Siswa Tidak Dikenal";
            if (!isMockMode && db) {
                const studentDoc = await db.collection('students').doc(cleanCode).get();
                if (studentDoc.exists) {
                    studentName = studentDoc.data()?.namaLengkap || studentName;
                }
            } else if (isMockMode) {
                studentName = "Siswa Simulasi (Read-Only)";
            }

            playBeep();
            if (navigator.vibrate) navigator.vibrate(50);
            setShowFlash(true);
            setTimeout(() => setShowFlash(false), 200);

            const readOnlyResult: RecentScan = {
                id: cleanCode,
                name: studentName,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: "SESI TIDAK AKTIF",
                isReadOnly: true
            };

            setLastScanned(readOnlyResult);
            setScanHistory(prev => [readOnlyResult, ...prev].slice(0, 3));
            setTimeout(() => setLastScanned(null), 3000);
            setTimeout(() => { isLocked.current = false; }, 1500);
            return;
        } catch (e) {
            isLocked.current = false;
            return;
        }
    }

    try {
      const result = await recordAttendanceByScan(cleanCode, session as AttendanceSession, isHaidMode);
      
      if (result.success) {
          playBeep();
          if (navigator.vibrate) navigator.vibrate(150);
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 300);

          const newScan: RecentScan = {
              id: cleanCode,
              name: result.student?.namaLengkap || 'Unknown',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: result.message
          };

          setLastScanned(newScan);
          setScanHistory(prev => [newScan, ...prev].slice(0, 3));
          setTimeout(() => setLastScanned(null), 3000);
      } else {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          toast.error(result.message);
      }
      
      setTimeout(() => { isLocked.current = false; }, 1200);
    } catch (e) { isLocked.current = false; }
  }, [session, isHaidMode]);

  const startScanner = useCallback(async (mode: "environment" | "user") => {
    if (scannerRef.current) {
        try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) {}
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
            fps: 25, 
            aspectRatio: 1.0,
            videoConstraints: { facingMode: mode, focusMode: "continuous" } as any
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
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    toast.info(`Kamera dibalik ke ${nextMode === 'user' ? 'Depan' : 'Belakang'}`);
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden select-none">
        
        {/* FLASH EFFECT */}
        <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${showFlash ? 'opacity-40' : 'opacity-0'} ${isHaidMode ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>

        <div 
          className="flex-1 relative bg-black overflow-hidden" 
          onDoubleClick={toggleCamera}
        >
            {isInitializing ? (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.4em] animate-pulse">Initializing Lense v6.2</p>
                </div>
            ) : (
                <>
                    {/* CAMERA CONTAINER */}
                    <div 
                      id="reader-core" 
                      className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover opacity-100 overflow-hidden [&_canvas]:hidden"
                    ></div>

                    {/* SCANNED POPUP */}
                    {lastScanned && (
                        <div className="absolute top-28 inset-x-6 z-[80] flex justify-center animate-in slide-in-from-top-4 duration-500">
                            <div className={`w-full max-w-xs backdrop-blur-3xl px-6 py-4 rounded-[2rem] border-2 shadow-2xl flex items-center gap-4 ${
                                lastScanned.isReadOnly 
                                ? 'bg-amber-600/90 border-amber-400/50' 
                                : (isHaidMode ? 'bg-rose-600/90 border-rose-400/50' : 'bg-emerald-600/90 border-emerald-400/50')
                            }`}>
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                                    {lastScanned.isReadOnly ? <ShieldCheckIcon className="w-6 h-6 text-white" /> : <CheckCircleIcon className="w-6 h-6 text-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[11px] font-black text-white uppercase truncate">{lastScanned.name}</h4>
                                    <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-0.5">{lastScanned.status}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER STATUS (FLOATING) */}
                    <div className="absolute top-12 inset-x-4 z-50 flex items-start justify-between pointer-events-none">
                        <button onClick={onBack} className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 pointer-events-auto shadow-2xl transition-all">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="flex flex-col items-end gap-2">
                            <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-end shadow-2xl">
                                {session !== 'Luar Sesi' && (
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">
                                        SESI: {session.toUpperCase()}
                                    </span>
                                )}
                                <span className="text-sm font-mono font-black text-white">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <div className={`px-3 py-1 rounded-full border text-[7px] font-black uppercase tracking-tighter ${isDbConnected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
                                {isDbConnected ? '📡 Realtime Cloud' : '⚠️ Local Buffer'}
                            </div>
                        </div>
                    </div>

                    {/* MODE HAID SELECTOR */}
                    {session !== 'Luar Sesi' && (
                        <div className="absolute top-40 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
                            <button 
                                onClick={() => setIsHaidMode(!isHaidMode)} 
                                className={`px-8 py-3.5 rounded-full flex items-center gap-3 border transition-all font-black text-[9px] uppercase tracking-widest pointer-events-auto shadow-2xl ${
                                    isHaidMode 
                                    ? 'bg-rose-600 border-rose-400 text-white scale-110' 
                                    : 'bg-black/60 backdrop-blur-xl border-white/10 text-white/50'
                                }`}
                            >
                                <HeartIcon className={`w-3.5 h-3.5 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} />
                                {isHaidMode ? 'Mode Ibadah (Haid) AKTIF' : 'Ibadah (Haid)'}
                            </button>
                        </div>
                    )}

                    {/* ACTIVITY REEL */}
                    <div className="absolute bottom-44 inset-x-6 z-40 space-y-2 pointer-events-none">
                        {scanHistory.map((h, i) => (
                            <div key={i} className={`flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5 animate-in slide-in-from-left-4 fade-in duration-300`} style={{ opacity: 1 - (i * 0.3) }}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${h.isReadOnly ? 'bg-amber-500/20 text-amber-400' : (h.status.includes('HAID') ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400')}`}>
                                    {h.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-white/90 uppercase truncate">{h.name}</p>
                                    <p className="text-[7px] font-bold text-white/40 uppercase tracking-tighter">{h.status} • {h.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CONTROLS */}
                    <div className="absolute bottom-12 inset-x-0 z-40 flex justify-center pointer-events-none">
                        {hasTorch && (
                            <button 
                              onClick={toggleTorch} 
                              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-75 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 ${isTorchOn ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'bg-black/40 backdrop-blur-xl text-white/40'}`}
                            >
                                <SunIcon className="w-7 h-7" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default QRScanner;
