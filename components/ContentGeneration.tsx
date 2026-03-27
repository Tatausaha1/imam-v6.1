
import React, { useState, useRef, useEffect } from 'react';
import { getEduContent } from '../services/geminiService';
import { 
  RobotIcon, CheckCircleIcon, SparklesIcon, BookOpenIcon, 
  StarIcon, MegaphoneIcon, ClipboardDocumentListIcon, ArrowPathIcon,
  HandThumbUpIcon, HandThumbDownIcon
} from './Icons';
import { toast } from 'sonner';

interface ContentGenerationProps {
  onBack: () => void;
}

type ToolType = 'rpp' | 'quiz' | 'announcement';

const formatText = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        if (trimmed.startsWith('###')) return <h3 key={idx} className="text-lg font-bold text-slate-800 dark:text-white mt-4">{trimmed.replace(/#/g, '')}</h3>;
        if (trimmed.startsWith('##')) return <h2 key={idx} className="text-xl font-bold text-slate-800 dark:text-white mt-5 border-b border-slate-200 dark:border-slate-700 pb-2">{trimmed.replace(/#/g, '')}</h2>;
        
        const parseBold = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        };

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
           return (
             <div key={idx} className="flex gap-2.5 ml-1">
               <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-500 mt-2 shrink-0"></div>
               <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{parseBold(trimmed.substring(1).trim())}</div>
             </div>
           );
        }
        
        if (/^\d+\./.test(trimmed)) {
            const number = trimmed.match(/^\d+\./)?.[0];
            const content = trimmed.replace(/^\d+\./, '').trim();
            return (
                 <div key={idx} className="flex gap-2.5 ml-1">
                   <div className="font-bold text-indigo-600 dark:text-indigo-400 min-w-[1.5rem]">{number}</div>
                   <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{parseBold(content)}</div>
                 </div>
            );
        }

        return <div key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed">{parseBold(trimmed)}</div>;
      })}
    </div>
  );
};

const ContentGeneration: React.FC<ContentGenerationProps> = ({ onBack }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('rpp');
  const [topic, setTopic] = useState('');
  const [detail, setDetail] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // LOGIKA AUTO-SAVE DRAF KE BROWSER
  useEffect(() => {
    const savedDraft = localStorage.getItem('imam_ai_draft');
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            setTopic(parsed.topic || '');
            setDetail(parsed.detail || '');
            setActiveTool(parsed.activeTool || 'rpp');
            if (parsed.result) setResult(parsed.result);
        } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const draft = { topic, detail, activeTool, result };
    localStorage.setItem('imam_ai_draft', JSON.stringify(draft));
  }, [topic, detail, activeTool, result]);

  const loadingSteps = [
      "Menganalisis topik dan konteks...",
      "Menghubungkan ke model pengetahuan...",
      "Menyusun kerangka konten...",
      "Menulis draf awal...",
      "Menyempurnakan tata bahasa...",
      "Finalisasi hasil..."
  ];

  const tools = [
    { id: 'rpp', label: 'RPP', icon: BookOpenIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'quiz', label: 'Kuis', icon: StarIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'announcement', label: 'Pengumuman', icon: MegaphoneIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setResult('');
    setCopied(false);
    setFeedback(null);
    
    let step = 0;
    setLoadingMessage(loadingSteps[0]);
    
    const intervalId = setInterval(() => {
        step = (step + 1) % loadingSteps.length;
        setLoadingMessage(loadingSteps[step]);
    }, 1500);
    
    let prompt = "";
    if (activeTool === 'rpp') {
        prompt = `Buatkan Rencana Pelaksanaan Pembelajaran (RPP) singkat dan padat untuk Mata Pelajaran/Topik: ${topic}. Target Siswa: ${detail || 'Umum'}. Format dengan struktur: Tujuan Pembelajaran, Kegiatan Inti, dan Penilaian. Gunakan Bahasa Indonesia yang formal.`;
    } else if (activeTool === 'quiz') {
        prompt = `Buatkan 5 soal kuis pilihan ganda tentang: ${topic}. Tingkat Kesulitan: ${detail || 'Menengah'}. Sertakan kunci jawaban di akhir. Gunakan Bahasa Indonesia.`;
    } else {
        prompt = `Buatkan teks pengumuman sekolah resmi tentang: ${topic}. Target Audiens: ${detail || 'Seluruh Warga Sekolah'}. Gunakan gaya bahasa yang sopan, jelas, dan menarik. Gunakan Bahasa Indonesia.`;
    }

    try {
        const generatedText = await getEduContent(prompt, activeTool);
        setResult(generatedText);
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } catch (error) {
        console.error("Error generating content:", error);
        setResult("Maaf, terjadi kesalahan saat menghubungi layanan AI.");
    } finally {
        clearInterval(intervalId);
        setLoading(false);
    }
  };

  const handleClear = () => {
      if (window.confirm("Hapus seluruh draf pengerjaan saat ini?")) {
          setTopic('');
          setDetail('');
          setResult('');
          localStorage.removeItem('imam_ai_draft');
          toast.success("Draf dibersihkan.");
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm p-4 pt-8 flex items-center justify-between z-20 sticky top-0 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            </button>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                Asisten Akademik <RobotIcon className="w-5 h-5 text-indigo-500" />
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draf Tersimpan Otomatis</p>
            </div>
        </div>
        <button onClick={handleClear} className="p-2.5 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl active:scale-90 transition-all border border-rose-100 dark:border-rose-800">
            <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-32 max-w-3xl mx-auto w-full">
         <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2rem] p-6 mb-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold mb-3">
                    <SparklesIcon className="w-3 h-3 text-yellow-300" />
                    <span>AI Content Generator</span>
                </div>
                <h1 className="text-xl font-bold mb-2">Buat Konten Pembelajaran</h1>
                <p className="text-indigo-100 text-xs opacity-90 max-w-md">Kecerdasan buatan membantu administrasi Anda lebih cepat.</p>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-3 mb-6">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as ToolType)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${activeTool === tool.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-lg ring-2 ring-indigo-500/10' : 'bg-white dark:bg-slate-800 border-transparent opacity-80'}`}
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tool.bg} ${tool.color} mb-1`}><tool.icon className="w-6 h-6" /></div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${activeTool === tool.id ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{tool.label}</span>
                </button>
            ))}
         </div>

         <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <div className="space-y-5">
                <div className="group">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Topik / Mata Pelajaran</label>
                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Misal: Sistem Tata Surya" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="group">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Detail (Kelas/Kesulitan)</label>
                    <textarea rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Misal: Kelas VII Semester 1" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:border-indigo-500 transition-all resize-none" />
                </div>
            </div>
            <button onClick={handleGenerate} disabled={loading || !topic} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />} MULAI GENERATE
            </button>
         </div>

         {loading && (
             <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-center animate-in fade-in zoom-in">
                 <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><RobotIcon className="w-8 h-8 text-indigo-500 animate-bounce" /></div>
                 <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{loadingMessage}</h3>
                 <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Generating Neural Response...</p>
             </div>
         )}

         {result && !loading && (
             <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                 <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                     <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 p-4 flex justify-between items-center">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hasil Generate AI</span></div>
                         <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-700 border text-slate-600 dark:text-slate-300'}`}>
                             {copied ? <CheckCircleIcon className="w-4 h-4" /> : <ClipboardDocumentListIcon className="w-4 h-4" />} {copied ? 'Tersalin' : 'Salin'}
                         </button>
                     </div>
                     <div className="p-6 lg:p-8">{formatText(result)}</div>
                     <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex justify-center gap-4">
                        <button onClick={() => toast.success("Feedback terkirim!")} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><HandThumbUpIcon className="w-5 h-5" /></button>
                        <button onClick={() => toast.success("Feedback terkirim!")} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><HandThumbDownIcon className="w-5 h-5" /></button>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

export default ContentGeneration;
