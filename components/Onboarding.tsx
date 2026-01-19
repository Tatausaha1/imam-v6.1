
import React, { useState } from 'react';
import { 
  ArrowRightIcon, 
  AppLogo,
  SparklesIcon
} from './Icons';

interface OnboardingProps {
  onStart: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Konsistensi Foto Kepala Sekolah di seluruh tahap
  const principalPhoto = "https://lh3.googleusercontent.com/d/1u07MwVk1zqVWQeB6anL9WJe_y86Q2FFS";

  const steps = [
    {
      id: 1,
      title: "Inovasi Manajemen Akademik Madrasah",
      description: "Kelola data siswa, guru, dan administrasi sekolah dalam satu platform yang terintegrasi dan efisien.",
      icon: principalPhoto,
      isImage: true
    },
    {
      id: 2,
      title: "Akademik & Penilaian",
      description: "Pantau perkembangan akademik, input nilai, dan akses rapor digital secara realtime di mana saja.",
      icon: principalPhoto,
      isImage: true
    },
    {
      id: 3,
      title: "Presensi QR Code",
      description: "Sistem absensi modern yang cepat dan akurat menggunakan teknologi pemindaian QR Code.",
      icon: principalPhoto,
      isImage: true
    },
    {
      id: 4,
      title: "Panduan Bantuan AI",
      description: "Dukungan asisten digital untuk membantu pengoperasian aplikasi dan fitur sistem secara cerdas.",
      icon: principalPhoto,
      isImage: true
    }
  ];

  const handleStartApp = () => {
    localStorage.setItem('imam_onboarding_done', 'true');
    onStart();
  };

  const handleNext = () => {
    if (isAnimating) return;
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      handleStartApp();
    }
  };

  const activeContent = steps[currentStep];

  const renderIcon = (className: string) => {
    return (
      <div className="relative group">
        {/* Glow Effect behind photo */}
        <div className="absolute inset-0 bg-yellow-400/20 blur-[60px] rounded-full scale-90 group-hover:scale-100 transition-transform duration-1000"></div>
        <img 
          src={principalPhoto} 
          alt="Kepala Sekolah" 
          className={`${className} object-cover rounded-[3.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white/10 relative z-10 transition-all duration-700 hover:scale-[1.02]`}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white relative overflow-hidden font-sans select-none transition-colors duration-1000">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${currentStep === 0 ? 'bg-indigo-400/20' : currentStep === 1 ? 'bg-sky-400/20' : currentStep === 2 ? 'bg-emerald-400/20' : 'bg-yellow-400/10'}`}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
      </div>

      {/* --- LEFT PANEL (Visual - Principal Photo) --- */}
      <div className="hidden md:flex flex-1 items-center justify-center relative z-10 p-12 border-r border-white/10">
         <div className={`relative transition-all duration-700 transform ${isAnimating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
            {renderIcon("w-96 h-[500px]")}
            
            {/* Decorative Orbits for prestige look */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-yellow-400/10 rounded-full animate-[spin_30s_linear_infinite]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-white/5 rounded-full animate-[spin_45s_linear_infinite_reverse]"></div>
         </div>
      </div>

      {/* --- RIGHT PANEL (Content) --- */}
      <div className="flex-1 flex flex-col relative z-10 p-8 md:p-16 lg:p-24 justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <AppLogo className="w-8 h-8" />
                <span className="text-sm font-black tracking-[0.3em] uppercase opacity-90 text-yellow-400">IMAM</span>
            </div>
            <button 
                onClick={handleStartApp}
                className="text-xs font-bold text-white/60 hover:text-white transition-colors bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5"
            >
                LEWATI
            </button>
        </div>

        {/* Center Content (Photo shown here only on mobile) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left py-12">
            <div className="md:hidden relative mb-10">
                <div className={`transition-all duration-500 transform ${isAnimating ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>
                    {renderIcon("w-48 h-64")}
                </div>
            </div>

            <div className={`transition-all duration-500 transform ${isAnimating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl uppercase tracking-tight">
                    {activeContent.title}
                </h2>
                <p className="text-base md:text-xl text-indigo-100 leading-relaxed font-medium max-w-md opacity-80">
                    {activeContent.description}
                </p>
            </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-8">
            {/* Pagination Dots */}
            <div className="flex justify-center md:justify-start gap-3">
                {steps.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-500 shadow-sm ${idx === currentStep ? 'w-12 bg-yellow-400' : 'w-3 bg-white/20'}`}
                    />
                ))}
            </div>

            {/* Action Button */}
            <button 
                onClick={handleNext}
                className="w-full md:w-fit md:px-12 bg-gradient-to-r from-yellow-400 to-amber-500 text-indigo-950 font-black text-lg py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(234,179,8,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                <span className="relative z-10 uppercase tracking-widest text-sm">
                    {currentStep === steps.length - 1 ? "Masuk Sekarang" : "Selanjutnya"}
                </span>
                <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform" />
                
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
        </div>
      </div>

    </div>
  );
};

export default Onboarding;
