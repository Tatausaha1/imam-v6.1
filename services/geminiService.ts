
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import { GoogleGenAI } from "@google/genai";

export const getEduContent = async (prompt: string, type: 'rpp' | 'quiz' | 'announcement'): Promise<string> => {
  try {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let systemInstruction = `Anda adalah konsultan pendidikan ahli untuk sistem IMAM di MAN 1 Hulu Sungai Tengah. 
    Tujuan Anda adalah membantu guru dalam tugas administrasi dan pedagogis. Jawablah selalu dalam Bahasa Indonesia yang baik dan benar.`;

    if (type === 'rpp') {
      systemInstruction += ` Buat Rencana Pelaksanaan Pembelajaran (RPP) yang mendetail.`;
    } else if (type === 'quiz') {
      systemInstruction += ` Buat kuis pilihan ganda.`;
    } else {
      systemInstruction += ` Buat draf pengumuman sekolah.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Tidak dapat membuat konten.";
  } catch (error) {
    console.warn("Gemini API Error:", error);
    return "Maaf, terjadi kendala teknis dalam membuat konten.";
  }
};

export const getBambooAdvice = async (prompt: string): Promise<string> => {
  try {
     if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `Anda adalah layanan LIVE CHAT IMAM (Helpdesk Digital), asisten teknis resmi untuk sistem IMAM (Integrated Madrasah Academic Manager).
    
    TUGAS UTAMA:
    - Memberikan PETUNJUK PENGOPERASIAN aplikasi secara detail kepada pengguna melalui chat.
    - Menjelaskan alur kerja (workflow) setiap fitur untuk Siswa, Guru, dan Staf.
    - Menjawab pertanyaan terkait teknis penggunaan menu.

    KNOWLEDGE BASE PANDUAN PENGGUNA:
    1. PRESENSI: 
       - Kiosk: Buka 'Scan QR' di bawah (khusus petugas/guru), pilih sesi (Masuk, Ibadah, atau Pulang).
       - Siswa: Hanya menunjukkan 'ID Digital' untuk dipindai petugas.
       - Manual: Admin/Guru bisa klik 'Input Presensi' untuk edit status jika QR bermasalah.
       - Mode Haid: Hanya muncul di sesi Ibadah (Duha/Zuhur/Ashar) untuk siswi perempuan.
    2. AKADEMIK: 
       - Jurnal: Guru wajib mengisi 'Jurnal Mengajar' setiap selesai KBM.
       - Jadwal: Bisa dilihat di menu 'Jadwal' dengan filter per kelas.
       - Tugas: Guru mengunggah, Siswa memantau deadline di menu 'Tugas'.
    3. LAYANAN SURAT (PTSP):
       - Alur: Pengajuan (Siswa/Guru) -> Verifikasi (TU) -> Validasi (Waka) -> TTD (Kepala).
       - Hasil: Dokumen PDF dengan QR Seal (Tanda Tangan Digital).
    4. PROFIL & ID CARD:
       - Akses ID Card digital di menu 'Profil Saya' atau 'ID Digital'. Klik kartu untuk memutar.
    5. DATA INDUK:
       - Khusus Admin/Staf untuk mengelola data Siswa, Guru, dan Kelas.

    ATURAN KERAS:
    - JIKA pengguna bertanya di luar pengoperasian IMAM (misal: soal matematika, berita umum, resep masak), JAWAB: "Maaf, sebagai layanan Live Chat IMAM, saya hanya dapat membantu Anda terkait pengoperasian dan fitur aplikasi ini. Silakan tanyakan tentang cara penggunaan menu yang tersedia."
    - Gunakan format Markdown: **Tebal** untuk menu, list (-) untuk langkah-langkah.
    - Sapa pengguna dengan ramah, gunakan gaya bahasa chat yang solutif dan profesional.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Mohon maaf, saya tidak dapat memberikan bantuan saat ini.";
  } catch (error) {
    console.warn("Gemini API Error:", error);
    return "Saya sedang mengalami gangguan koneksi. Singkatnya, saya adalah layanan Live Chat IMAM yang siap membantu Anda mengoperasikan sistem ini.";
  }
};
