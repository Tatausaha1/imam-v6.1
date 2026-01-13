
import { GoogleGenAI } from "@google/genai";

// Fix: Removed global initialization to ensure the most up-to-date API key is used and to comply with guidelines.

export const getEduContent = async (prompt: string, type: 'rpp' | 'quiz' | 'announcement'): Promise<string> => {
  try {
    // Check if API key is present before making the call to avoid unnecessary errors
    if (!process.env.API_KEY) {
        throw new Error("API Key missing");
    }

    // Fix: Initialize Gemini right before making an API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Fix: systemInstruction defined as a string
    let systemInstruction = `Anda adalah konsultan pendidikan ahli dan asisten AI untuk guru di MAN 1 Hulu Sungai Tengah menggunakan sistem IMAM. 
    Tujuan Anda adalah membantu guru dalam tugas administrasi dan pedagogis. Jawablah selalu dalam Bahasa Indonesia yang baik dan benar.`;

    if (type === 'rpp') {
      systemInstruction += ` Buat Rencana Pelaksanaan Pembelajaran (RPP) yang mendetail berdasarkan topik pengguna. Sertakan tujuan, kegiatan, dan metode penilaian. Format dengan rapi menggunakan Markdown.`;
    } else if (type === 'quiz') {
      systemInstruction += ` Buat daftar 5 soal pilihan ganda beserta kunci jawaban yang benar berdasarkan topik yang diberikan.`;
    } else {
      systemInstruction += ` Buat draf pengumuman sekolah resmi berdasarkan detail input.`;
    }

    // Fix: Using 'gemini-3-flash-preview' for basic text tasks and calling ai.models.generateContent directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Tidak dapat membuat konten.";
  } catch (error) {
    console.warn("Gemini API Error or Offline Mode:", error);
    
    // Fallback Mock Response for demo/offline purposes
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

    if (type === 'rpp') {
        return `## Rencana Pelaksanaan Pembelajaran (RPP) Simulasi
**Topik:** ${prompt.substring(0, 50)}...
**Durasi:** 2 x 45 Menit

### 1. Tujuan Pembelajaran
*   Siswa mampu memahami konsep dasar materi.
*   Siswa mampu menganalisis studi kasus terkait topik.
*   Siswa mampu menyajikan hasil diskusi dengan percaya diri.

### 2. Kegiatan Inti
**Pendahuluan (15 Menit)**
*   Guru membuka kelas dengan salam dan doa.
*   Guru menyampaikan persepsi tentang topik hari ini.

**Kegiatan Inti (60 Menit)**
*   Siswa dibagi menjadi kelompok kecil.
*   Diskusi kelompok membahas permasalahan yang diberikan.
*   Presentasi hasil diskusi kelompok.

**Penutup (15 Menit)**
*   Guru memberikan kesimpulan.
*   Refleksi dan doa penutup.

### 3. Penilaian
*   Observasi keaktifan siswa.
*   Hasil lembar kerja siswa (LKS).
*   Tes tertulis singkat.`;
    } else if (type === 'quiz') {
        return `## Kuis Simulasi: ${prompt.substring(0, 30)}...

**Soal 1**
Apa definisi utama dari topik yang dibahas?
A. Pilihan jawaban 1
B. Pilihan jawaban 2
C. Pilihan jawaban 3
D. Pilihan jawaban 4
**Jawaban:** A

**Soal 2**
Manakah di bawah ini yang merupakan contoh penerapan nyata?
A. Contoh A
B. Contoh B
C. Contoh C
D. Contoh D
**Jawaban:** C

**Soal 3**
Mengapa hal ini penting dipelajari?
A. Alasan 1
B. Alasan 2
C. Alasan 3
D. Alasan 4
**Jawaban:** B`;
    } else {
        return `## PENGUMUMAN RESMI

**Kepada: Seluruh Warga Sekolah**
**Perihal: ${prompt.substring(0, 50)}**

Assalamu’alaikum Warahmatullahi Wabarakatuh,

Diberitahukan kepada seluruh siswa dan guru bahwa sehubungan dengan topik tersebut di atas, maka kami sampaikan beberapa poin penting:

1. Kegiatan akan dilaksanakan sesuai jadwal yang ditentukan.
2. Dimohon kerjasamanya untuk menjaga ketertiban.
3. Informasi lebih lanjut dapat menghubungi tata usaha.

Demikian pengumuman ini kami sampaikan. Atas perhatiannya diucapkan terima kasih.

Wassalamu’alaikum Warahmatullahi Wabarakatuh.

**Kepala Madrasah**`;
    }
  }
};

export const getBambooAdvice = async (prompt: string): Promise<string> => {
  try {
     if (!process.env.API_KEY) {
        throw new Error("API Key missing");
    }

    // Fix: Initialize Gemini right before making an API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `Anda adalah IMAM AI, asisten virtual sekolah yang membantu dan berpengetahuan luas.
    Tujuan Anda adalah membantu pengguna (guru, siswa, atau orang tua) memahami informasi akademik, administrasi sekolah, dan tips pendidikan.
    Jawablah selalu dalam Bahasa Indonesia yang sopan, ramah, dan profesional. Hindari jawaban yang terlalu panjang jika tidak perlu.`;

    // Fix: Using 'gemini-3-flash-preview' and calling ai.models.generateContent directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Maaf, saya tidak dapat memberikan saran saat ini.";
  } catch (error) {
    console.warn("Gemini API Error or Offline Mode:", error);
    
    // Fallback Mock Response
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "Ini adalah respon simulasi dari Asisten AI. Dalam mode demo atau offline (tanpa API Key), saya tidak terhubung ke Gemini API, tetapi saya siap membantu Anda menavigasi aplikasi ini!";
  }
};
