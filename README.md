# IMAM - Integrated Madrasah Academic Manager 🏫
**Version 6.1 - Smart Presence Edition**

**IMAM** adalah ekosistem manajemen madrasah modern yang dirancang untuk **MAN 1 Hulu Sungai Tengah**. Aplikasi ini mengintegrasikan administrasi cerdas, presensi berbasis QR Code tingkat tinggi, dan asisten pendidikan bertenaga AI dalam satu platform *mobile-first*.

---

## 🚀 Fitur Utama
- **Ultra-Fast QR Scanner**: Pemindaian full-frame dengan jeda respons 0.5 detik.
- **AI Academic Assistant**: Integrasi Google Gemini API untuk pembuatan RPP & Kuis otomatis.
- **Hybrid AI Chat**: Live helpdesk menggunakan GPT-4 & Gemini.
- **Digital Student ID**: Kartu pelajar interaktif dengan QR Code unik.
- **PTSP Digital**: Alur surat menyurat dengan Tanda Tangan Digital (QR Seal).
- **Enterprise Security**: Proteksi database Firestore dengan verifikasi role berjenjang.

---

## 🛠️ Persiapan Sebelum Hosting

Sebelum melakukan deployment, pastikan Anda telah menyiapkan:
1. **Google Gemini API Key**: Dapatkan di [Google AI Studio](https://aistudio.google.com/).
2. **OpenAI API Key** (Opsional): Jika ingin menggunakan fitur GPT-4.
3. **Firebase Project**: Aktifkan Firestore, Authentication, dan hosting di [Firebase Console](https://console.firebase.google.com/).

---

## 🔼 Deployment ke Vercel (Direkomendasikan)

Vercel adalah platform terbaik untuk aplikasi berbasis React/Vite.

### 1. Konfigurasi Project
Saat melakukan impor repository di Vercel:
- **Framework Preset**: Pilih `Other` atau `Vite`.
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2. Environment Variables
Masukkan variabel berikut di tab **Settings > Environment Variables**:
| Key | Value |
|---|---|
| `GEMINI_API_KEY` | `AIzaSy... (Key Anda)` |
| `OPENAI_API_KEY` | `sk-proj... (Key Anda)` |

### 3. Authorized Domains
Salin URL dari Vercel (misal: `imam-v6.vercel.app`) dan tambahkan ke:
- **Firebase Console > Auth > Settings > Authorized Domains**.

---

## 🔼 Deployment ke Netlify

### 1. Konfigurasi Build
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### 2. Penanganan Routing (Penting!)
Karena ini adalah Single Page Application (SPA), Anda perlu membuat file bernama `_redirects` di dalam folder `public` sebelum build, atau tambahkan di root setelah build:
```text
/*   /index.html   200
```

### 3. Environment Variables
Masukkan API Key di **Site settings > Environment variables**.

---

## 💻 Pengembangan Lokal

```bash
# Clone repository
git clone [url-repo]

# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev
```

Pastikan Anda memiliki file `.env` di root folder:
```env
GEMINI_API_KEY=YOUR_KEY_HERE
OPENAI_API_KEY=YOUR_KEY_HERE
```

---

## 📊 Spesifikasi Teknis
- **Frontend**: React 19, Tailwind CSS, Vite 6.
- **Database**: Google Firebase Firestore (Realtime Sync).
- **AI Engine**: Google Gemini 3 Flash & OpenAI GPT-4.
- **Scanner**: HTML5-QRCode (Zero-latency optimized).

---

## 📝 Kontributor & Lisensi
- **Lead Developer**: Akhmad Arifin (NIP: 19901004 202521 1012)
- **Instansi**: MAN 1 Hulu Sungai Tengah
- **Peran**: Penata Layanan Operasional / Fullstack Engineer

© 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
