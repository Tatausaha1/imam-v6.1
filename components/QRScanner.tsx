
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
  const [flipRotation, setFlipRotation] = useState(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{id: string, time: number}>({ id: '', time: 0 });
  const isLocked = useRef(false);

  const detectSession = useCallback(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (currentTime >= 360 && currentTime <= 450) return 'Masuk';
    if (currentTime > 450 && currentTime <= 600) return 'Duha';
    if (currentTime > 600 && currentTime <= 840) return 'Zuhur';
    if (currentTime > 840 && currentTime <= 960) return 'Ashar';
    return 'Pulang';
  }, []);

  useEffect(() => {
    const currentSession = detectSession();
    setSession(currentSession as AttendanceSession);
    const interval = setInterval(() => setSession(detectSession() as AttendanceSession), 300000);
    return () => clearInterval(interval);
  }, [detectSession]);

  const sessionRef = useRef(session);
  const haidRef = useRef(isHaidMode);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { haidRef.current = isHaidMode; }, [isHaidMode]);

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
          if (sessionRef.current !== 'Masuk' && result.message.includes('(-')) {
              diffText = '-' + result.message.split('(-')[1].split(')')[0];
          }
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

      if (navigator.vibrate) navigator.vibrate(result.success ? 50 : [100, 30, 100]);
      setNotifications(prev => [newItem, ...prev].slice(0, 3));
      setTimeout(() => { isLocked.current = false; }, 800);
      setTimeout(() => setNotifications(prev => prev.filter(item => item.id !== newItem.id)), 5000);
    } catch (e) { isLocked.current = false; }
  }, []);

  const startScanner = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    setCameraError(null);

    if (scannerRef.current) {
        try { if (scannerRef.current.isScanning) await scannerRef.current.stop(); } catch (e) {}
    }

    try {
      const html5QrCode = new Html5Qrcode("reader-core", { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], verbose: false });
      scannerRef.current = html5QrCode;
      await html5QrCode.start({ facingMode }, { fps: 30, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.65); return { width: s, height: s }; } }, handleScan, () => {});
      setCameraActive(true);
      const track = (html5QrCode as any).getRunningTrack();
      setHasTorch(!!track?.getCapabilities()?.torch);
    } catch (err: any) {
      setCameraError("Akses kamera ditolak.");
      setCameraActive(false);
    } finally { setIsInitializing(false); }
  };

  useEffect(() => { startScanner(); return () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); }; }, [facingMode]);

  const toggleCamera = () => {
      if (isInitializing) return;
      setFlipRotation(prev => prev + 180);
      setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await (scannerRef.current as any).applyVideoConstraints({ advanced: [{ torch: next }] });
      setIsTorchOn(next);
    } catch(e) { toast.error("Gagal senter."); }
  };

  return (
    <Layout title="Lensa Presensi" subtitle={`Sesi: ${session}`} icon={CameraIcon} onBack={onBack}>
      <div className="flex flex-col h-full bg-black relative overflow-hidden select-none">
          
          {/* Notifications Stack */}
          <div className="absolute top-4 inset-x-4 z-[70] flex flex-col gap-3 pointer-events-none">
              {notifications.map((item) => (
                  <div key={item.id} className="bg-white/95 dark:bg-[#0B1121]/95 backdrop-blur-2xl rounded-[2rem] p-4 shadow-2xl border border-white/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-10 duration-500">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white relative ${item.status === 'error' ? 'bg-rose-600' : item.status === 'haid' ? 'bg-rose-50 border border-rose-200' : item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                          {item.status === 'error' ? <XCircleIcon className="w-7 h-7" /> : item.status === 'haid' ? <HeartIcon className="w-7 h-7 fill-current text-rose-600" /> : item.status === 'warning' ? <ClockIcon className="w-7 h-7" /> : <CheckCircleIcon className="w-7 h-7" />}
                          {item.timeDiff && <div className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-lg text-[8px] font-black border-2 border-white shadow-md bg-rose-600 text-white">{item.timeDiff}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h4 className={`text-xs font-black uppercase truncate mb-0.5 ${item.status === 'error' ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{item.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.message}</p>
                      </div>
                  </div>
              ))}
          </div>

          <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/60 to-transparent pt-6 text-center">
              <button onClick={() => setIsHaidMode(!isHaidMode)} className={`px-5 py-2.5 rounded-full inline-flex items-center gap-2 border transition-all font-black text-[9px] uppercase tracking-[0.2em] ${isHaidMode ? 'bg-rose-600 border-rose-400 text-white shadow-lg' : 'bg-white/10 border-white/10 text-white/50'}`}>
                  <HeartIcon className={`w-3.5 h-3.5 ${isHaidMode ? 'fill-current animate-pulse' : ''}`} />
                  {isHaidMode ? 'Haid Aktif' : 'Mode Haid'}
              </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-black">
              <div id="reader-core" className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"></div>
              
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                  <div className={`relative w-64 h-64 md:w-80 md:h-80 transition-all duration-700 ${notifications.length > 0 ? 'scale-75 opacity-10 blur-xl' : 'scale-100'}`}>
                      <div className={`absolute top-0 left-0 w-12 h-12 border-t-[4px] border-l-[4px] rounded-tl-[2rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                      <div className={`absolute top-0 right-0 w-12 h-12 border-t-[4px] border-r-[4px] rounded-tr-[2rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                      <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-[4px] border-l-[4px] rounded-bl-[2rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                      <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-[4px] border-r-[4px] rounded-br-[2rem] transition-colors duration-500 ${isHaidMode ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                      <div className={`absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent animate-scan-y top-0 opacity-60 ${isHaidMode ? 'text-rose-400' : 'text-indigo-400'}`}></div>
                  </div>
                  <div className="mt-16 px-6 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/5 text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">
                      {isInitializing ? 'Sinkronisasi...' : 'Scan QR Siswa'}
                  </div>
              </div>

              {/* Minimalist Floating Control Pill */}
              <div className="absolute bottom-10 inset-x-0 z-40 flex justify-center px-8">
                  <div className="flex items-center gap-3 bg-black/50 backdrop-blur-2xl px-3 py-3 rounded-full border border-white/10 shadow-2xl ring-1 ring-white/5">
                      
                      <button 
                        onClick={toggleTorch}
                        disabled={!hasTorch}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-75 ${isTorchOn ? 'bg-yellow-400 text-black shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-5'}`}
                      >
                        <SunIcon className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={toggleCamera}
                        disabled={isInitializing}
                        className="w-16 h-16 rounded-full bg-white text-indigo-600 shadow-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                      >
                        <div style={{ transform: `rotate(${flipRotation}deg)` }} className="transition-transform duration-500 ease-in-out">
                            <ArrowPathIcon className="w-7 h-7" />
                        </div>
                      </button>

                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 text-white/40">
                         <CameraIcon className={`w-5 h-5 transition-colors ${facingMode === 'environment' ? 'text-indigo-400/60' : 'text-emerald-400/60'}`} />
                      </div>
                  </div>
              </div>

              {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-10 text-center">
                      <div className="w-20 h-20 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mb-6 border border-rose-500/20">
                        <XCircleIcon className="w-10 h-10 text-rose-500" />
                      </div>
                      <h3 className="text-white text-lg font-black uppercase mb-2">Akses Terputus</h3>
                      <p className="text-slate-500 text-xs mb-8 max-w-xs leading-relaxed">Izin kamera diperlukan untuk sistem presensi digital.</p>
                      <button onClick={() => startScanner()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-xl">
                        <ArrowPathIcon className="w-4 h-4" /> Reset Lensa
                      </button>
                  </div>
              )}
          </div>
      </div>
    </Layout>
  );
};

export default QRScanner;
