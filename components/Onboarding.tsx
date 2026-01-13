import React, { useState } from 'react';
import { 
  ArrowRightIcon, 
  AcademicCapIcon, 
  QrCodeIcon, 
  RobotIcon, 
  BookOpenIcon,
  AppLogo,
  SparklesIcon
} from './Icons';

interface OnboardingProps {
  onStart: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps = [
    {
      id: 1,
      title: "Inovasi Manajemen Akademik Madrasah",
      description: "Kelola data siswa, guru, dan administrasi sekolah dalam satu platform yang terintegrasi dan efisien.",
      icon: AppLogo,
      color: "text-white"
    },
    {
      id: 2,
      title: "Akademik & Penilaian",
      description: "Pantau perkembangan akademik, input nilai, dan akses rapor digital secara realtime di mana saja.",
      icon: BookOpenIcon,
      color: "text-white"
    },
    {
      id: 3,
      title: "Presensi QR Code",
      description: "Sistem absensi modern yang cepat dan akurat menggunakan teknologi pemindaian QR Code.",
      icon: QrCodeIcon,
      color: "text-white"
    },
    {
      id: 4,
      title: "Asisten AI Pintar",
      description: "Dukungan kecerdasan buatan untuk membantu pembuatan konten ajar dan analisis data sekolah.",
      icon: RobotIcon,
      color: "text-white"
    }
  ];

  const handleNext = () => {
    if (isAnimating) return;
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      onStart();
    }
  };

  const activeContent = steps[currentStep];

  return (
    <div className="flex flex-col md:flex-row h-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white relative overflow-hidden font-sans select-none transition-colors duration-1000">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${currentStep === 0 ? 'bg-white/20' : currentStep === 1 ? 'bg-sky-100/20' : currentStep === 2 ? 'bg-emerald-100/20' : 'bg-rose-100/20'}`}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
      </div>

      {/* --- LEFT PANEL (Visual - Hidden on small, prominent on desktop) --- */}
      <div className="hidden md:flex flex-1 items-center justify-center relative z-10 p-12 border-r border-white/10">
         <div className={`relative transition-all duration-700 transform ${isAnimating ? 'scale-90 opacity-0 rotate-6' : 'scale-100 opacity-100 rotate-0'}`}>
            <activeContent.icon className="w-80 h-80 drop-shadow-2xl relative z-10" />
            
            {/* Decorative Orbits */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-white/20 rounded-full animate-[spin_15s_linear_infinite]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/10 rounded-full animate-[spin_25s_linear_infinite_reverse]"></div>
         </div>
      </div>

      {/* --- RIGHT PANEL (Content) --- */}
      <div className="flex-1 flex flex-col relative z-10 p-8 md:p-16 lg:p-24 justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-black tracking-[0.2em] uppercase opacity-90">IMAM</span>
            </div>
            <button 
                onClick={onStart}
                className="text-xs font-bold text-white/60 hover:text-white transition-colors bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md"
            >
                LEWATI
            </button>
        </div>

        {/* Center Content (Icon shown here only on mobile) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left py-12">
            <div className="md:hidden relative mb-12">
                <activeContent.icon className={`w-56 h-56 relative z-10 transition-all duration-500 transform ${isAnimating ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`} />
            </div>

            <div className={`transition-all duration-500 transform ${isAnimating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                    {activeContent.title}
                </h2>
                <p className="text-base md:text-xl text-blue-50 leading-relaxed font-medium max-w-md opacity-90">
                    {activeContent.description}
                </p>
            </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-8">
            {/* Pagination Dots */}
            <div className="flex justify-center md:justify-start gap-2.5">
                {steps.map((_, idx) => (
                    <div 
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-500 shadow-sm ${idx === currentStep ? 'w-10 bg-white' : 'w-2.5 bg-white/30'}`}
                    />
                ))}
            </div>

            {/* Action Button */}
            <button 
                onClick={handleNext}
                className="w-full md:w-fit md:px-12 bg-white text-blue-600 font-black text-lg py-5 rounded-[1.5rem] shadow-2xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                <span className="relative z-10">
                    {currentStep === steps.length - 1 ? "Masuk Sekarang" : "Selanjutnya"}
                </span>
                <ArrowRightIcon className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" />
                
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
        </div>
      </div>

    </div>
  );
};

export default Onboarding;