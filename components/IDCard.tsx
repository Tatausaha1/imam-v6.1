
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { db, auth, isMockMode } from '../services/firebase';
import { UserIcon, ArrowPathIcon, QrCodeIcon, ImamLogo } from './Icons';

interface IDCardProps {
  onBack: () => void;
}

interface StudentCardData {
  nama: string;
  nisn: string;
  idUnik?: string; // Added field for QR generation
  rombel: string;
  ttl: string;
  alamat: string;
  foto?: string;
}

const IDCard: React.FC<IDCardProps> = ({ onBack }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentCardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (isMockMode) {
            // Simulate network delay
            setTimeout(() => {
                setData({
                    nama: "DIENDE ADELLYA AQILLA",
                    nisn: "0086806447",
                    idUnik: "15012", // Mock ID Unik
                    rombel: "XII A",
                    ttl: "HST, 30 Mei 2008",
                    alamat: "Jl. Perintis Kemerdekaan"
                });
                setLoading(false);
            }, 800);
            return;
        }

        if (auth && auth.currentUser && db) {
            try {
                // Fetch basic user data
                const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    setData({
                        nama: userData?.displayName || auth.currentUser.displayName || "Siswa",
                        nisn: userData?.nisn || "-",
                        idUnik: userData?.idUnik || userData?.nisn || "00000", // Priority to idUnik
                        rombel: userData?.tingkatRombel || userData?.class || "-",
                        ttl: "-", // TTL is often not in auth profile, would come from academic DB
                        alamat: userData?.address || "-"
                    });
                } else {
                    // Fallback if no user doc
                    setData({
                        nama: auth.currentUser.displayName || "Siswa",
                        nisn: "-",
                        idUnik: "00000",
                        rombel: "-",
                        ttl: "-",
                        alamat: "-"
                    });
                }
            } catch (e) {
                console.error("Error fetching ID card data", e);
            }
        }
        setLoading(false);
    };
    fetchData();
  }, []);

  const cardStyle = {
      perspective: '1000px',
  };

  const innerStyle = {
      transformStyle: 'preserve-3d' as const,
      transition: 'transform 0.6s',
      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const frontStyle = {
      backfaceVisibility: 'hidden' as const,
      WebkitBackfaceVisibility: 'hidden' as const,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
  };

  const backStyle = {
      ...frontStyle,
      transform: 'rotateY(180deg)',
  };

  // Determine value for QR (Prioritize ID Unik)
  const qrValue = data?.idUnik || data?.nisn || "0";

  return (
    <Layout
      title="Kartu Pelajar"
      subtitle="Identitas Digital Siswa"
      icon={QrCodeIcon}
      onBack={onBack}
    >
      <div className="flex-1 flex flex-col items-center p-6 bg-slate-100 dark:bg-slate-900 min-h-full">
        
        {/* Card Container */}
        <div className="w-full max-w-sm mt-4" style={cardStyle}>
            <div 
                className="relative w-full aspect-[1.586/1] cursor-pointer"
                style={innerStyle}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {/* FRONT SIDE */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200" style={frontStyle}>
                    {/* Header Pattern */}
                    <div className="h-[28%] bg-teal-600 relative overflow-hidden flex items-center px-4 gap-3">
                        {/* Abstract Pattern overlay */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" style={{ backgroundSize: '10px 10px' }}></div>
                        
                        <div className="text-white z-10">
                            <h3 className="text-[9px] font-medium tracking-widest uppercase opacity-90">Kementerian Agama RI</h3>
                            <h1 className="text-xs font-bold leading-tight">MAN 1 HULU SUNGAI TENGAH</h1>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-4 flex gap-3 relative">
                        {/* Photo Area */}
                        <div className="w-[28%] aspect-[3/4] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative self-center">
                            {data?.foto ? (
                                <img src={data.foto} alt="Foto" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-10 h-10 text-slate-300" />
                            )}
                            <div className="absolute bottom-0 w-full bg-teal-600/90 text-white text-[7px] font-bold text-center py-0.5 tracking-wider">
                                SISWA
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-center gap-1 z-10 min-w-0">
                            {loading ? (
                                <div className="space-y-2 animate-pulse mt-2">
                                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-2 bg-slate-200 rounded w-full"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-1">
                                        <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Nama Lengkap</p>
                                        <h2 className="text-xs font-bold text-slate-800 leading-tight uppercase truncate">{data?.nama || "Nama Siswa"}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">ID / NISN</p>
                                            <p className="text-[10px] font-mono font-semibold text-slate-700">{data?.idUnik || data?.nisn || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Kelas</p>
                                            <p className="text-[10px] font-semibold text-slate-700">{data?.rombel || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                         <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Alamat</p>
                                         <p className="text-[9px] text-slate-600 leading-tight line-clamp-2">{data?.alamat || "-"}</p>
                                    </div>
                                    
                                    <div className="mt-auto flex justify-between items-end">
                                        <div className="text-[7px] text-slate-400 leading-tight w-2/3 pt-1">
                                            Kartu ini adalah identitas resmi siswa MAN 1 HST.
                                        </div>
                                        <div className="bg-white p-0.5 rounded shadow-sm border border-slate-100">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrValue}`}
                                                className="w-10 h-10 mix-blend-multiply"
                                                alt="QR"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Bottom Bar */}
                    <div className="h-1.5 bg-teal-500 w-full"></div>
                </div>

                {/* BACK SIDE */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 p-5" style={backStyle}>
                    <div className="border-b border-slate-200 pb-2 mb-2">
                        <h3 className="text-center font-bold text-slate-800 text-xs uppercase tracking-wide">Tata Tertib Singkat</h3>
                    </div>
                    <ul className="text-[9px] text-slate-600 list-disc list-outside ml-4 space-y-1.5 leading-relaxed flex-1">
                        <li>Kartu ini wajib dibawa selama berada di lingkungan madrasah.</li>
                        <li>Dilarang meminjamkan kartu ini kepada orang lain.</li>
                        <li>Kehilangan kartu harap segera melapor ke Tata Usaha.</li>
                        <li>Kartu ini berlaku selama tercatat sebagai siswa aktif.</li>
                        <li>Gunakan kartu untuk presensi dan peminjaman buku perpustakaan.</li>
                    </ul>
                    
                    <div className="mt-4 flex flex-col items-center">
                        <p className="text-[9px] text-slate-400 mb-6">Barabai, Juli 2024</p>
                        <div className="w-32 border-b border-slate-800 border-dashed"></div>
                        <p className="text-[9px] font-bold text-slate-800 mt-1 uppercase">Kepala Madrasah</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center space-y-4">
            <p className="text-slate-500 dark:text-slate-400 text-xs animate-pulse">Ketuk kartu untuk membalik</p>
            <button 
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center justify-center gap-2 mx-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all font-semibold text-sm border border-slate-200 dark:border-slate-700"
            >
                <ArrowPathIcon className="w-4 h-4" /> Putar Kartu
            </button>
        </div>

      </div>
    </Layout>
  );
};

export default IDCard;
