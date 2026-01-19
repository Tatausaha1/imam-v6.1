
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import { db, isMockMode } from '../services/firebase';
import { 
  CheckCircleIcon, XCircleIcon, CameraIcon, 
  Loader2, HeartIcon, XMarkIcon, ShieldCheckIcon, ArrowPathIcon, ClockIcon
} from './Icons';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface QRScannerProps {
  onBack: () => void;
}

interface ScanResultDisplay {
  name: string;
  class: string;
  idUnik: string;
  status: 'success' | 'warning' | 'error' | 'haid';
  message: string;
  time: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const getAutoSession = (): AttendanceSession => {
    const hours = new Date().getHours();
    const timeVal = hours * 60 + new Date().getMinutes();
    if (timeVal >= 360 && timeVal <= 510) return 'Masuk';
    if (timeVal > 510 && timeVal <= 690) return 'Duha';
    if (timeVal > 690 && timeVal <= 840) return 'Zuhur';
    if (timeVal > 840 && timeVal <= 960) return 'Ashar';
    return 'Pulang';
  };

  const [session, setSession] = useState<AttendanceSession>(getAutoSession());
  const [isHaidMode, setIsHaidMode] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultDisplay | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedId = useRef<{id: string, time: number}>({ id: '', time: 0 });

  const showHaidToggle = session === 'Duha' || session === 'Zuhur' || session === 'Ashar';

  useEffect(() => {
    const prepareSystem = async () => {
      for (let i = 1; i <= 4; i++) {
        setSyncProgress((i / 4) * 100);
        await new Promise(r => setTimeout(r, 100));
      }
      setIsDataReady(true);
    };
    prepareSystem();
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    const now = Date.now();
    if (lastScannedId.current.id === decodedText && (now - lastScannedId.current.time < 5000)) return;
    lastScannedId.current = { id: decodedText, time: now };
    
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
        const result = await recordAttendanceByScan(decodedText, session, isHaidMode);
        if (result.success) {
            setScanResult({
                name: result.student?.namaLengkap || 'SISWA',
                class: result.student?.tingkatRombel || '-',
                idUnik: result.student?.idUnik || decodedText,
                status: (isHaidMode && ['Duha', 'Zuhur', 'Ashar'].includes(session)) ? 'haid' : (result.statusRecorded === 'Terlambat' ? 'warning' : 'success'),
                message: result.message,
                time: (isHaidMode && ['Duha', 'Zuhur', 'Ashar'].includes(session)) ? "HAID" : (result.timestamp ? result.timestamp.substring(0,5) : format(new Date(), "HH:mm"))
            });
            setTimeout(() => setScanResult(null), 4500);
        } else {
            setScanResult({
                name: "ID TIDAK DIKENAL",
                class: "DITOLAK",
                idUnik: decodedText,
                status: 'error',
                message: result.message,
                time: "REJECT"
            });
            setTimeout(() => setScanResult(null), 3000);
        }
    } catch (error) { 
        toast.error("GANGGUAN DATABASE"); 
    } finally { 
        setIsProcessing(false); 
    }
  }, [session, isHaidMode, isProcessing]);

  useEffect(() => {
    if (!isDataReady) return;

    const startScanner = async () => {
        try {
            // Pastikan tidak ada instance lama yang menggantung
            if (scannerRef.current) {
                await scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;
            
            const config = { 
                fps: 15, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
            };
            
            await scanner.start(
                { facingMode: "environment" }, 
                config, 
                onScanSuccess, 
                () => {} 
            );
        } catch (err: any) {
            console.error("Camera access error:", err);
            if (err.name === 'NotReadableError') {
                toast.error("Kamera sedang digunakan aplikasi lain. Silakan muat ulang.");
            } else {
                toast.error("Kamera tidak dapat diakses.");
            }
        }
    };

    startScanner();

    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
                scannerRef.current = null;
            }).catch(e => console.warn("Cleanup error:", e));
        }
    };
  }, [isDataReady, onScanSuccess]);

  const stopAndBack = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        try { await scannerRef.current.stop(); } catch (e) {}
    }
    onBack();
  };

  if (!isDataReady) {
    return (
        <div className="absolute inset-0 z-[200] bg-[#020617] flex flex-col items-center justify-center p-10">
            <ArrowPathIcon className="w-16 h-16 text-indigo-500 animate-spin mb-8" />
            <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${syncProgress}%` }}></div>
            </div>
        </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[100] bg-black flex flex-col font-sans overflow-hidden select-none">
      <div className="absolute top-0 inset-x-0 z-[120] p-6 flex items-start justify-between pointer-events-none">
          <button onClick={stopAndBack} className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white pointer-events-auto active:scale-90 shadow-2xl"><XMarkIcon className="w-5 h-5" /></button>
          <div className="flex flex-col items-center gap-2">
             <div className="px-5 py-2.5 bg-indigo-600/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div><span className="text-[11px] font-black text-white uppercase tracking-[0.25em]">{session}</span>
             </div>
             {isHaidMode && (
                <div className="px-4 py-1.5 bg-rose-600/95 backdrop-blur-md rounded-full border border-rose-400/40 shadow-lg animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-white"><HeartIcon className="w-3.5 h-3.5 fill-current animate-pulse" /><span className="text-[8px] font-black uppercase tracking-widest">Mode Haid Aktif</span></div>
                </div>
             )}
          </div>
          <div className="w-11"></div>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center z-10 overflow-hidden">
        <div id="qr-reader" className="w-full h-full [&_video]:object-cover"></div>
        {scanResult && (
            <div className="absolute top-32 inset-x-6 z-[150] animate-in slide-in-from-top-8 duration-500">
                <div className={`w-full max-w-sm mx-auto rounded-[2.5rem] p-6 border-2 shadow-2xl flex items-center gap-5 backdrop-blur-xl ${scanResult.status === 'success' ? 'bg-emerald-600/90 border-emerald-400/40' : scanResult.status === 'haid' ? 'bg-rose-600/90 border-rose-400/40' : scanResult.status === 'warning' ? 'bg-amber-600/90 border-amber-400/40' : 'bg-rose-900/95 border-rose-500/50'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                        {scanResult.status === 'success' ? <CheckCircleIcon className="w-8 h-8 text-white" /> : scanResult.status === 'haid' ? <HeartIcon className="w-8 h-8 text-white fill-current animate-pulse" /> : scanResult.status === 'warning' ? <ClockIcon className="w-8 h-8 text-white" /> : <XCircleIcon className="w-8 h-8 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0 text-white">
                        <h2 className="text-sm font-black uppercase tracking-tight truncate">{scanResult.name}</h2>
                        <p className="text-[10px] font-bold uppercase opacity-60 truncate">{scanResult.idUnik}</p>
                        <div className="mt-1 flex items-center justify-between"><span className="text-[8px] font-black uppercase tracking-widest text-white/50">{scanResult.message}</span><span className="text-xs font-black tracking-widest">{scanResult.time}</span></div>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      <div className="bg-[#0B1121] border-t border-white/5 p-6 pt-6 pb-12 z-[120] space-y-8 shadow-2xl">
          <div className="flex bg-white/5 rounded-[2rem] p-1.5 border border-white/5">
              {(['Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'] as AttendanceSession[]).map((s) => (
                  <button key={s} onClick={() => { setSession(s); setScanResult(null); }} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${session === s ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 opacity-50'}`}>{s.charAt(0)}</button>
              ))}
          </div>
          <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3.5 opacity-40"><ShieldCheckIcon className="w-5 h-5 text-indigo-500"/><h4 className="text-white text-[10px] font-black uppercase tracking-widest">AES-256 SECURED</h4></div>
              {showHaidToggle && (
                  <button onClick={() => { setIsHaidMode(!isHaidMode); setScanResult(null); }} className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all border-2 active:scale-95 ${isHaidMode ? 'bg-rose-600 text-white border-rose-400 shadow-xl' : 'bg-white/5 text-slate-500 border-white/5'}`}><HeartIcon className={`w-4 h-4 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} /> Mode Haid</button>
              )}
          </div>
      </div>
    </div>
  );
};

export default QRScanner;