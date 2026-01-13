import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { recordAttendanceByScan, AttendanceSession } from '../services/attendanceService';
import { isMockMode } from '../services/firebase';
import Layout from './Layout';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon, CameraIcon, Loader2, ClockIcon, ArrowPathIcon } from './Icons';
import { toast } from 'sonner';

interface QRScannerProps {
  onBack: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const [session, setSession] = useState<AttendanceSession>('Masuk');
  const [lastResult, setLastResult] = useState<{name: string, time: string, status: 'success' | 'warning' | 'error' | 'duplicate'} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const lastCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isMountedRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const sessionRef = useRef(session);
  const readerId = "reader-stream";

  useEffect(() => {
      sessionRef.current = session;
      lastCodeRef.current = null;
  }, [session]);

  // --- AUDIO FEEDBACK GENERATOR ---
  const playSound = (type: 'success' | 'warning' | 'error' | 'duplicate') => {
      if (!isMountedRef.current) return;
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const now = ctx.currentTime;

          const createPulse = (freq: number, startTime: number, duration: number, oscType: OscillatorType = 'sine', volume: number = 0.2) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = oscType;
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(volume, startTime);
              gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(startTime);
              osc.stop(startTime + duration);
              // Close context after play to save resources
              setTimeout(() => { if(ctx.state !== 'closed') ctx.close(); }, (startTime + duration + 0.1) * 1000);
          };

          if (type === 'success') createPulse(880, now, 0.1, 'sine');
          else if (type === 'warning') createPulse(1500, now, 0.4, 'sine', 0.25);
          else if (type === 'duplicate') {
              createPulse(440, now, 0.08, 'square', 0.1);
              createPulse(440, now + 0.12, 0.08, 'square', 0.1);
          } else if (type === 'error') {
              createPulse(220, now, 0.1, 'sawtooth', 0.15);
              createPulse(220, now + 0.15, 0.1, 'sawtooth', 0.15);
              createPulse(220, now + 0.3, 0.1, 'sawtooth', 0.15);
          }
      } catch (e) {
          console.warn("Audio Context failed", e);
      }
  };

  const stopCamera = useCallback(async () => {
      if (scannerRef.current) {
          const scanner = scannerRef.current;
          try {
              if (scanner.isScanning) {
                  await scanner.stop();
              }
          } catch (e) {
              console.warn("Scanner stop error:", e);
          } finally {
              try {
                  scanner.clear();
              } catch (clearErr) {
                  console.warn("Scanner clear error:", clearErr);
              }
              scannerRef.current = null;
              if (isMountedRef.current) setCameraActive(false);
          }
      }
  }, []);

  const handleScan = useCallback(async (decodedText: string) => {
      const now = Date.now();
      if (decodedText === lastCodeRef.current && (now - lastScanTimeRef.current < 5000)) {
          if (!isProcessing) {
              playSound('duplicate');
              setLastResult({ name: 'Sudah Diproses', time: 'Tolak Scan Ganda', status: 'duplicate' });
              toast.info(`Siswa ini baru saja diproses.`, { duration: 2000 });
              setTimeout(() => { if (isMountedRef.current) setLastResult(null); }, 800);
          }
          return;
      }

      if (isProcessing || !isMountedRef.current) return; 
      setIsProcessing(true);
      lastCodeRef.current = decodedText;
      lastScanTimeRef.current = now;

      if (scannerRef.current && scannerRef.current.isScanning) {
          try { scannerRef.current.pause(); } catch (e) {}
      }

      try {
          const result = await recordAttendanceByScan(decodedText, sessionRef.current);
          if (result.success) {
              const statusRecorded = result.statusRecorded || 'Hadir';
              const studentName = result.student?.namaLengkap || 'Siswa';
              const jamText = result.timestamp?.substring(0, 5) || '--:--';

              if (statusRecorded === 'Terlambat') {
                  playSound('warning');
                  setLastResult({ name: studentName, time: result.timestamp || '', status: 'warning' });
              } else {
                  playSound('success');
                  setLastResult({ name: studentName, time: result.timestamp || '', status: 'success' });
              }
          } else {
              playSound('error');
              setLastResult({ name: 'Gagal / Tidak Ada', time: decodedText, status: 'error' });
          }

          setTimeout(async () => {
              if (!isMountedRef.current) return;
              setLastResult(null);
              setIsProcessing(false);
              if (scannerRef.current && !scannerRef.current.isScanning) {
                  try { await scannerRef.current.resume(); } catch (e) { 
                      await stopCamera();
                      await startCamera(facingMode);
                  }
              }
          }, 600); 

      } catch (e) {
          setIsProcessing(false);
          if (scannerRef.current) try { await scannerRef.current.resume(); } catch (e) {}
      }
  }, [isProcessing, stopCamera, facingMode]); 

  const startCamera = async (mode: "environment" | "user" = "environment") => {
    // Pastikan scanner lama bersih total
    await stopCamera();
    
    // Tunggu DOM stabil sebelum inisialisasi baru
    await new Promise(r => setTimeout(r, 250));
    if (!isMountedRef.current) return;

    try {
        const scanner = new Html5Qrcode(readerId, {
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], 
            verbose: false
        });
        scannerRef.current = scanner;
        
        await scanner.start(
            { facingMode: mode },
            {
                fps: 20, // Turunkan sedikit untuk stabilitas mobile
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            },
            (decodedText) => { if (isMountedRef.current) handleScan(decodedText); },
            () => {}
        );
        
        if (isMountedRef.current) { 
            setCameraActive(true); 
            setPermissionError(false); 
        }
    } catch (err) {
        console.error("Camera start error:", err);
        if (isMountedRef.current) { 
            setPermissionError(true); 
            setCameraActive(false); 
        }
        scannerRef.current = null;
    }
  };

  const toggleCamera = async () => {
      if (isProcessing) return;
      const nextMode = facingMode === "environment" ? "user" : "environment";
      setFacingMode(nextMode);
      await startCamera(nextMode);
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCamera(facingMode);
    return () => {
        isMountedRef.current = false;
        // Gunakan cleanup yang tidak memblokir tapi aman
        if (scannerRef.current) {
            const s = scannerRef.current;
            if (s.isScanning) {
                s.stop().then(() => {
                    try { s.clear(); } catch(e) {}
                }).catch(() => {});
            } else {
                try { s.clear(); } catch(e) {}
            }
        }
    };
  }, []);

  const sessions: AttendanceSession[] = ['Masuk', 'Duha', 'Zuhur', 'Ashar', 'Pulang'];

  return (
    <Layout 
      title="Scanner Presensi" 
      subtitle={`Mode: Kamera ${facingMode === 'environment' ? 'Belakang' : 'Depan'}`} 
      icon={QrCodeIcon} 
      onBack={onBack}
    >
      <div className="flex flex-col h-full bg-slate-900 relative">
          <div className="bg-white dark:bg-slate-800 shadow-sm z-20 py-3 px-4">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
                  {sessions.map((s) => (
                      <button
                          key={s}
                          onClick={() => setSession(s)}
                          className={`snap-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                              session === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}
                      >
                          {s}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative bg-black overflow-hidden">
              <div className="relative w-full h-full lg:max-w-[400px] lg:max-h-[700px] lg:rounded-[3rem] lg:overflow-hidden bg-black">
                  {/* Container Scanner */}
                  <div id={readerId} className="w-full h-full object-cover"></div>
                  
                  {!cameraActive && !permissionError && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 text-white/70 bg-slate-900">
                          <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                      </div>
                  )}

                  {permissionError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900 text-white p-8 text-center">
                          <XCircleIcon className="w-12 h-12 text-red-500 mb-4" />
                          <h3 className="font-bold">Gagal Memulai Kamera</h3>
                          <p className="text-xs opacity-60 mt-2">Pastikan izin kamera diberikan atau refresh halaman.</p>
                          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-white text-black rounded-lg text-sm font-bold active:scale-95">Refresh Halaman</button>
                      </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
                      <div className="flex justify-between items-start mt-4 pointer-events-auto">
                          <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                              {session}
                          </div>

                          <button 
                            onClick={toggleCamera}
                            className="p-3 bg-black/60 backdrop-blur-md rounded-2xl text-white border border-white/10 active:scale-90 transition-all pointer-events-auto"
                            title="Tukar Kamera"
                          >
                              <ArrowPathIcon className="w-5 h-5" />
                          </button>
                      </div>
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-xl -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-xl -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-xl -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-xl -mb-1 -mr-1"></div>
                                {cameraActive && !isProcessing && <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] animate-scan-y top-1/2"></div>}
                            </div>
                      </div>
                  </div>

                  {lastResult && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in zoom-in duration-150">
                          <div className={`bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-xs text-center shadow-2xl relative overflow-hidden border-t-8 ${
                              lastResult.status === 'success' ? 'border-green-500' : 
                              lastResult.status === 'warning' ? 'border-orange-500' : 
                              lastResult.status === 'duplicate' ? 'border-indigo-500' : 'border-red-500'
                          }`}>
                              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                                  lastResult.status === 'success' ? 'bg-green-100 text-green-600' : 
                                  lastResult.status === 'warning' ? 'bg-orange-100 text-orange-600' : 
                                  lastResult.status === 'duplicate' ? 'bg-indigo-100 text-indigo-600' : 'bg-red-100 text-red-600'
                              }`}>
                                  {lastResult.status === 'success' && <CheckCircleIcon className="w-12 h-12 animate-checkmark" />}
                                  {lastResult.status === 'warning' && <ClockIcon className="w-12 h-12 animate-bounce" />}
                                  {lastResult.status === 'duplicate' && <QrCodeIcon className="w-12 h-12 opacity-50" />}
                                  {lastResult.status === 'error' && <XCircleIcon className="w-12 h-12" />}
                              </div>
                              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">
                                  {lastResult.status === 'duplicate' ? 'Sudah Di-scan' : lastResult.status === 'success' ? 'Berhasil!' : lastResult.status === 'warning' ? 'Terlambat!' : 'Gagal'}
                              </h3>
                              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mt-2">
                                <p className="text-base font-bold text-slate-800 dark:text-white leading-tight uppercase">{lastResult.name}</p>
                                <p className="text-xs text-slate-500 mt-1 font-mono">{lastResult.time}</p>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </Layout>
  );
};

export default QRScanner;