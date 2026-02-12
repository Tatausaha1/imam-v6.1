
/**
 * @license
 * IMAM System - Hyper-Scan Engine v10.0 (Ultra-Fast Offline Edition)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import { 
  SunIcon, ArrowPathIcon, 
  HeartIcon, ArrowLeftIcon, 
  CheckCircleIcon, XCircleIcon,
  ClockIcon, Loader2
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
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [flash, setFlash] = useState<'success' | 'warning' | 'error' | null>(null);
  
  // --- OFFLINE CACHE ENGINE ---
  const studentMap = useRef<Map<string, StudentCache>>(new Map());
  const alreadyScannedLocal = useRef<Set<string>>(new Set());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isLocked = useRef(false);
  const isMounted = useRef(true);

  // Audio Feedback High-Freq
  const playBeep = (type: 'success' | 'error') => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'success') {
            osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(audioCtx.currentTime + 0.3);
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

    // STEP 1: VALIDASI INSTAN DARI MEMORI
    const student = studentMap.current.get(code);

    if (!student) {
        setFlash('error'); playBeep('error');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setLastScanned({ name: 'ID TIDAK DIKENAL', status: 'GAGAL', type: 'error' });
    } else if (alreadyScannedLocal.current.has(code) && !isHaidMode) {
        setFlash('warning'); playBeep('error');
        setLastScanned({ name: student.namaLengkap, status: 'SUDAH SCAN', type: 'warning' });
    } else {
        // STEP 2: FEEDBACK SUKSES INSTAN (OPTIMISTIC)
        setFlash('success'); playBeep('success');
        if (navigator.vibrate) navigator.vibrate(80);
        
        alreadyScannedLocal.current.add(code);
        setLastScanned({ 
            name: student.namaLengkap, 
            status: isHaidMode ? 'STATUS HAID TERCATAT' : 'PRESENSI BERHASIL', 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'success'
        });

        // STEP 3: SYNC DATABASE (BACKGROUND)
        recordAttendanceByScan(code, session as AttendanceSession, isHaidMode)
            .catch(() => console.warn("Background sync active."));
    }

    setTimeout(() => { 
        if (isMounted.current) { setLastScanned(null); setFlash(null); isLocked.current = false; }
    }, 1500);
  }, [session, isHaidMode]);

  useEffect(() => {
    isMounted.current = true;
    const initEngine = async () => {
        setIsInitializing(true);
        try {
            const configSnap = await db?.collection('academic_years').where('isActive', '==', true).limit(1).get();
            const sess = detectSession(!configSnap?.empty ? configSnap?.docs[0].data().config : null);
            setSession(sess);

            if (db) {
                // WARMING CACHE: Ambil daftar siswa aktif (Hanya 1x request)
                const studentsSnap = await db.collection('students').where('status', '==', 'Aktif').get();
                studentsSnap.docs.forEach(doc => {
                    const d = doc.data();
                    const cacheData = { id: doc.id, idUnik: String(d.idUnik), namaLengkap: d.namaLengkap };
                    if (d.idUnik) studentMap.current.set(String(d.idUnik), cacheData);
                    if (d.nisn) studentMap.current.set(String(d.nisn), cacheData);
                });

                // CACHE STATUS HARI INI
                if (sess !== 'Luar Sesi') {
                    const today = new Date().toISOString().split('T')[0];
                    const attSnap = await db.collection('attendance').where('date', '==', today).get();
                    const fieldMap: any = { 'Masuk': 'checkIn', 'Duha': 'duha', 'Zuhur': 'zuhur', 'Ashar': 'ashar', 'Pulang': 'checkOut' };
                    attSnap.docs.forEach(doc => {
                        if (doc.data()[fieldMap[sess]]) {
                            for (const [code, info] of studentMap.current.entries()) {
                                if (info.id === doc.data().studentId) alreadyScannedLocal.current.add(code);
                            }
                        }
                    });
                }
            }
        } catch (e) { console.error("Engine Error:", e); }
        finally { if (isMounted.current) setIsInitializing(false); }
    };
    initEngine();
    return () => { isMounted.current = false; scannerRef.current?.stop().catch(() => {}); };
  }, [detectSession]);

  const startScanner = useCallback(async (mode: "environment" | "user") => {
    if (scannerRef.current) await scannerRef.current.stop().catch(() => {});
    if (!isMounted.current) return;
    try {
      const html5QrCode = new Html5Qrcode("reader-core", { verbose: false });
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
          { facingMode: mode }, 
          { fps: 60, qrbox: (w, h) => { const s = Math.min(w, h) * 0.7; return { width: s, height: s }; } }, 
          handleScan, 
          () => {}
      );
      setHasTorch(!!(html5QrCode.getRunningTrackCapabilities() as any)?.torch);
    } catch (err) { if (mode === "environment") setFacingMode("user"); }
  }, [handleScan]);

  useEffect(() => { if (!isInitializing) startScanner(facingMode); }, [facingMode, isInitializing, startScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] } as any);
      setIsTorchOn(next);
    } catch(e) { toast.error("Hardware Flash Error"); }
  };

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden select-none">
        <div className={`absolute inset-0 z-[100] pointer-events-none transition-opacity duration-200 ${
            flash === 'success' ? 'bg-emerald-500/40 opacity-100' : 
            flash === 'warning' ? 'bg-amber-500/40 opacity-100' :
            flash === 'error' ? 'bg-rose-500/60 opacity-100' : 'opacity-0'
        }`}></div>

        <div id="reader-core" className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:!object-cover"></div>

        {isInitializing && (
            <div className="absolute inset-0 z-[120] bg-slate-900 flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                <h3 className="font-black text-xs uppercase tracking-[0.4em]">Warming Up Engine</h3>
                <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-widest">Sinkronisasi Database Lokal...</p>
            </div>
        )}

        {!isInitializing && !lastScanned && (
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-72 h-72 relative">
                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[5px] border-l-[5px] border-indigo-500 rounded-tl-3xl shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[5px] border-r-[5px] border-indigo-500 rounded-tr-3xl shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[5px] border-l-[5px] border-indigo-500 rounded-bl-3xl shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[5px] border-r-[5px] border-indigo-500 rounded-br-3xl shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                    <div className="absolute left-4 right-4 h-[2px] bg-indigo-400 shadow-[0_0_15px_#818cf8] animate-laser-scanning"></div>
                </div>
                <div className="mt-16 px-6 py-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Hyper-Scan Ready</p>
                </div>
            </div>
        )}

        {lastScanned && (
            <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-in zoom-in duration-300">
                <div className={`w-full max-w-sm rounded-[3rem] p-10 border-2 shadow-2xl flex flex-col items-center text-center ${
                    lastScanned.type === 'success' ? 'bg-emerald-600/90 border-emerald-400' : 
                    lastScanned.type === 'warning' ? 'bg-amber-600/90 border-amber-400' : 'bg-rose-600/90 border-rose-400'
                }`}>
                    <div className="w-20 h-20 rounded-[1.8rem] bg-white/20 flex items-center justify-center mb-6 border border-white/30">
                        {lastScanned.type === 'success' ? <CheckCircleIcon className="w-12 h-12 text-white" /> : <XCircleIcon className="w-12 h-12 text-white" />}
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight leading-tight mb-2">{lastScanned.name}</h2>
                    <div className="px-4 py-1.5 bg-black/20 rounded-full border border-white/10 mb-6">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{lastScanned.status}</span>
                    </div>
                    {lastScanned.time && <div className="text-white/80 font-mono text-lg font-black">{lastScanned.time}</div>}
                </div>
            </div>
        )}

        <div className="absolute top-0 inset-x-0 z-50 p-6 pt-12 flex justify-between items-start pointer-events-none">
            <button onClick={onBack} className="p-4 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 text-white active:scale-90 pointer-events-auto shadow-2xl">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="bg-black/40 backdrop-blur-3xl border border-white/10 p-4 rounded-[1.8rem] flex flex-col items-end shadow-2xl min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${session === 'Luar Sesi' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/70">{session}</span>
                </div>
                <span className="text-xl font-mono font-black text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>

        {['Duha', 'Zuhur', 'Ashar'].includes(session) && !lastScanned && !isInitializing && (
            <div className="absolute bottom-44 inset-x-0 z-30 flex justify-center animate-in slide-in-from-bottom-4">
                <button onClick={() => setIsHaidMode(!isHaidMode)} className={`px-10 py-4 rounded-full flex items-center gap-4 border-2 transition-all duration-500 font-black text-[10px] uppercase tracking-widest shadow-2xl ${isHaidMode ? 'bg-rose-600 border-rose-400 text-white scale-110 shadow-rose-600/40' : 'bg-black/60 backdrop-blur-xl border-white/20 text-white/50'}`}>
                    <HeartIcon className={`w-5 h-5 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} /> {isHaidMode ? 'Mode Haid Aktif' : 'Aktifkan Mode Haid?'}
                </button>
            </div>
        )}

        <div className="absolute bottom-12 inset-x-6 z-40 flex gap-4">
            <button onClick={toggleTorch} disabled={!hasTorch} className={`flex-1 py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all active:scale-95 border-2 ${isTorchOn ? 'bg-yellow-400 border-yellow-300 text-black shadow-yellow-400/30' : 'bg-black/60 backdrop-blur-3xl border-white/10 text-white/50 disabled:opacity-20'}`}>
                <SunIcon className="w-7 h-7" /> <span className="text-[10px] font-black uppercase tracking-widest">Flash</span>
            </button>
            <button onClick={() => setFacingMode(prev => prev === "environment" ? "user" : "environment")} className="flex-1 py-6 rounded-[2rem] bg-indigo-600 border-2 border-indigo-400 text-white flex items-center justify-center gap-4 active:scale-95 shadow-indigo-600/40 shadow-xl">
                <ArrowPathIcon className="w-7 h-7" /> <span className="text-[10px] font-black uppercase tracking-widest">Kamera</span>
            </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes laser-scanning {
                0% { top: 5%; opacity: 0; }
                15% { opacity: 1; }
                85% { opacity: 1; }
                100% { top: 95%; opacity: 0; }
            }
            .animate-laser-scanning {
                position: absolute;
                animation: laser-scanning 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
        `}} />
    </div>
  );
};

export default QRScanner;
