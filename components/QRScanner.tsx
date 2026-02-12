
/**
 * @license
 * IMAM System - Hyper-Scan Engine v11.3 (Ultra-Clean Mobile Edition)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import { 
  SunIcon, ArrowPathIcon, 
  HeartIcon, ArrowLeftIcon, 
  CheckCircleIcon, XCircleIcon,
  Loader2, CameraIcon
} from './Icons';
import { db } from '../services/firebase';
import { toast } from 'sonner';

interface StudentCache {
    id: string;
    idUnik: string;
    namaLengkap: string;
}

const QRScanner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [session, setSession] = useState<AttendanceSession | 'Luar Sesi'>('Luar Sesi');
  const [isHaidMode, setIsHaidMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastScanned, setLastScanned] = useState<any>(null);
  
  const studentMap = useRef<Map<string, StudentCache>>(new Map());
  const alreadyScannedLocal = useRef<Set<string>>(new Set());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isLocked = useRef(false);

  const initMobileEngine = () => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    startScanner(facingMode);
  };

  const playBeep = (type: 'success' | 'error') => {
    try {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'success') {
            osc.frequency.setValueAtTime(1000, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {}
  };

  const detectSession = useCallback((config: any): AttendanceSession | 'Luar Sesi' => {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const toM = (t: string) => { if(!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const c = config || { masukLimit: "07:30", duhaStart: "07:31", duhaEnd: "10:00", zuhurStart: "12:00", zuhurEnd: "14:00", asharStart: "15:30", asharEnd: "16:30", pulangLimit: "16:00" };
    if (cur <= toM(c.masukLimit)) return 'Masuk';
    if (cur >= toM(c.duhaStart) && cur <= toM(c.duhaEnd)) return 'Duha';
    if (cur >= toM(c.zuhurStart) && cur <= toM(c.zuhurEnd)) return 'Zuhur';
    if (cur >= toM(c.asharStart) && cur <= toM(c.asharEnd)) return 'Ashar';
    if (cur >= toM(c.pulangLimit)) return 'Pulang';
    return 'Luar Sesi';
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
    const code = decodedText.replace(/\s/g, '').trim();
    if (!code || isLocked.current || session === 'Luar Sesi') return;
    
    isLocked.current = true;
    const student = studentMap.current.get(code);

    if (!student) {
        playBeep('error');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setLastScanned({ name: 'ID TIDAK DIKENAL', status: 'GAGAL', type: 'error' });
    } else if (alreadyScannedLocal.current.has(code) && !isHaidMode) {
        playBeep('error');
        setLastScanned({ name: student.namaLengkap, status: 'SUDAH SCAN', type: 'warning' });
    } else {
        playBeep('success');
        if (navigator.vibrate) navigator.vibrate(80);
        
        alreadyScannedLocal.current.add(code);
        setLastScanned({ 
            name: student.namaLengkap, 
            status: isHaidMode ? 'STATUS HAID TERCATAT' : 'PRESENSI BERHASIL', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'success'
        });

        // Async record without blocking UI flow
        recordAttendanceByScan(code, session as AttendanceSession, isHaidMode).catch(() => {});
    }

    // REDUCED TIMEOUT FOR FASTER FLOW (2000ms -> 800ms)
    setTimeout(() => { 
        setLastScanned(null); 
        isLocked.current = false; 
    }, 800);
  }, [session, isHaidMode]);

  useEffect(() => {
    const initEngine = async () => {
        setIsInitializing(true);
        try {
            const configSnap = await db?.collection('academic_years').where('isActive', '==', true).limit(1).get();
            const sess = detectSession(!configSnap?.empty ? configSnap?.docs[0].data().config : null);
            setSession(sess);

            if (db) {
                const studentsSnap = await db.collection('students').where('status', '==', 'Aktif').get();
                studentsSnap.docs.forEach(doc => {
                    const d = doc.data();
                    const cacheData = { id: doc.id, idUnik: String(d.idUnik), namaLengkap: d.namaLengkap };
                    if (d.idUnik) studentMap.current.set(String(d.idUnik), cacheData);
                    if (d.nisn) studentMap.current.set(String(d.nisn), cacheData);
                });
            }
        } catch (e) { console.error("Cache Error:", e); }
        finally { setIsInitializing(false); }
    };
    initEngine();
    return () => { scannerRef.current?.stop().catch(() => {}); };
  }, [detectSession]);

  const startScanner = async (mode: "environment" | "user") => {
    if (scannerRef.current) await scannerRef.current.stop().catch(() => {});
    setCameraActive(false);
    
    try {
      const html5QrCode = new Html5Qrcode("reader-core");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
          { facingMode: mode }, 
          { 
              fps: 60, // INCREASED FPS FROM 30 TO 60 FOR FASTER DETECTION
              qrbox: (w, h) => { const s = Math.min(w, h) * 0.85; return { width: s, height: s }; } 
          }, 
          handleScan, 
          () => {}
      );
      setCameraActive(true);
      setHasTorch(!!(html5QrCode.getRunningTrackCapabilities() as any)?.torch);
    } catch (err) { 
        toast.error("Kamera tidak dapat diakses. Pastikan izin diberikan.");
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] } as any);
      setIsTorchOn(next);
    } catch(e) { toast.error("Hardware Error"); }
  };

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden select-none touch-none">
        
        {/* KAMERA FEED (FULL BACKGROUND) */}
        <div id="reader-core" className="absolute inset-0 w-full h-full z-0 bg-black"></div>

        {/* UI PERMISSION BRIDGE (TENGAH LAYAR) */}
        {!cameraActive && !isInitializing && (
            <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center mb-6 shadow-2xl">
                    <CameraIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-black text-lg uppercase tracking-tight mb-2">Lensa Presensi</h3>
                <p className="text-slate-400 text-xs mb-8">Ketuk tombol di bawah untuk memberikan akses kamera.</p>
                <button 
                    onClick={initMobileEngine}
                    className="w-full max-w-xs py-5 bg-white text-indigo-900 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                    Aktifkan Sensor
                </button>
            </div>
        )}

        {/* LOADING STATE */}
        {isInitializing && (
            <div className="absolute inset-0 z-[110] bg-slate-900 flex flex-col items-center justify-center text-white">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-indigo-500/20 rounded-full animate-ping"></div>
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sinkronisasi Kernel v11.3...</p>
            </div>
        )}

        {/* NOTIFIKASI POPUP (LAYER TERTINGGI - FIXED) */}
        {lastScanned && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in zoom-in duration-150">
                <div className={`w-full max-w-sm rounded-[3.5rem] p-10 border-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col items-center text-center ${
                    lastScanned.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 
                    lastScanned.type === 'warning' ? 'bg-amber-600 border-amber-400' : 
                    'bg-rose-600 border-rose-400'
                }`}>
                    <div className="w-20 h-20 rounded-[2.5rem] bg-white/20 flex items-center justify-center mb-6 border border-white/30">
                        {lastScanned.type === 'success' ? <CheckCircleIcon className="w-12 h-12 text-white" /> : <XCircleIcon className="w-12 h-12 text-white" />}
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2 leading-tight">{lastScanned.name}</h2>
                    <div className="px-6 py-2 bg-black/20 rounded-full mb-6 border border-white/10">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{lastScanned.status}</span>
                    </div>
                    {lastScanned.time && <div className="text-white/80 font-mono text-xl font-black tracking-widest">{lastScanned.time}</div>}
                </div>
            </div>
        )}

        {/* TOP CONTROLS (NAVIGATION & INFO) */}
        <div className="absolute top-0 inset-x-0 z-50 p-6 pt-14 flex justify-between items-start pointer-events-none">
            <button onClick={onBack} className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 pointer-events-auto shadow-2xl">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-[1.8rem] flex flex-col items-end shadow-2xl pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${session === 'Luar Sesi' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{session}</span>
                </div>
                <span className="text-xl font-mono font-black text-white tracking-tighter">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>

        {/* BOTTOM CONTROLS (ACTIONS) */}
        {cameraActive && (
            <div className="absolute bottom-10 inset-x-6 z-50 space-y-4">
                <div className="flex justify-center">
                    {['Duha', 'Zuhur', 'Ashar'].includes(session) && (
                        <button 
                            onClick={() => setIsHaidMode(!isHaidMode)} 
                            className={`px-10 py-4 rounded-full flex items-center gap-4 border-2 transition-all duration-300 font-black text-[10px] uppercase tracking-widest shadow-2xl ${isHaidMode ? 'bg-rose-600 border-rose-400 text-white scale-110' : 'bg-black/60 backdrop-blur-md border-white/20 text-white/50'}`}
                        >
                            <HeartIcon className={`w-5 h-5 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} /> 
                            {isHaidMode ? 'Mode Haid Aktif' : 'Atur Mode Haid?'}
                        </button>
                    )}
                </div>

                <div className="flex gap-4">
                    <button onClick={toggleTorch} disabled={!hasTorch} className={`flex-1 py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all border-2 active:scale-95 shadow-xl ${isTorchOn ? 'bg-yellow-400 border-yellow-300 text-black' : 'bg-black/60 backdrop-blur-md border-white/10 text-white/50 disabled:opacity-20'}`}>
                        <SunIcon className="w-7 h-7" /> <span className="text-[10px] font-black uppercase tracking-widest">Senter</span>
                    </button>
                    <button onClick={() => { setFacingMode(prev => prev === "environment" ? "user" : "environment"); startScanner(facingMode === "environment" ? "user" : "environment"); }} className="flex-1 py-6 rounded-[2rem] bg-indigo-600 border-2 border-indigo-400 text-white flex items-center justify-center gap-4 active:scale-95 shadow-indigo-600/40 shadow-2xl">
                        <ArrowPathIcon className="w-7 h-7" /> <span className="text-[10px] font-black uppercase tracking-widest">Rotasi</span>
                    </button>
                </div>
            </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
            #reader-core video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 0 !important; }
            #reader-core { position: absolute !important; inset: 0 !important; }
            #reader-core__scan_region { border: none !important; }
        `}} />
    </div>
  );
};

export default QRScanner;
