# IMAM v11 - Enterprise Offline-First 🏫

**IMAM (Integrated Madrasah Academic Manager)** adalah sistem manajemen madrasah mutakhir yang dirancang untuk stabilitas tinggi, efisiensi administrasi, dan kemudahan akses. Versi v11 fokus pada ketahanan sistem (Offline-First) dan otomatisasi presensi tingkat tinggi.

![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)
![Vite](https://img.shields.io/badge/Vite-6-purple?style=for-the-badge&logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange?style=for-the-badge&logo=firebase)

---

## 🚀 Fitur Unggulan v11
- **Hyper Scan 5 Sesi**: Deteksi otomatis sesi (Masuk, Duha, Zuhur, Ashar, Pulang) berdasarkan jam operasional tanpa input manual.
- **Integrated Haid Mode**: Pencatatan status halangan siswi yang otomatis menyinkronkan seluruh sesi ibadah.
- **Offline-First Engine**: Database tetap berfungsi meski internet tidak stabil di lokasi scan.
- **Haptic & Audio Feedback**: Respons suara frekuensi tinggi dan getaran ganda untuk pengalaman scan yang nyata.

---

## 🛠️ Panduan Hosting di Vercel (Penting)

Aplikasi ini dibangun menggunakan **Vite**. Agar logo dan fungsi berjalan sempurna di Vercel, ikuti pengaturan berikut:

### 1. Konfigurasi Proyek di Vercel Dashboard
Saat mengimpor repository ke Vercel, pastikan pengaturan **Build & Development Settings** adalah sebagai berikut:
- **Framework Preset**: `Vite` (Vercel mungkin mendeteksi "Other", ubah secara manual ke Vite).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2. Environment Variables
Tambahkan variabel berikut di **Settings > Environment Variables**:
| Key | Value |
|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` (Kunci dari Google AI Studio) |
| `OPENAI_API_KEY` | `sk-proj-...` (Kunci dari OpenAI - Opsional) |

### 3. Auto Deploy dari GitHub ke Vercel
Agar update aplikasi langsung ter-deploy otomatis:
- Hubungkan repository GitHub ke project Vercel.
- Set branch produksi (umumnya `main`) di **Project Settings > Git**.
- Set **Auto Deploy** aktif untuk push ke branch produksi.
- File `vercel.json` di repo ini sudah disiapkan untuk:
  - fallback SPA ke `index.html` untuk route client-side,
  - header cache khusus supaya `service-worker.js` tidak tersimpan stale.

---

## 🖼️ Menampilkan Logo IMAM di Domain

Agar logo **IMAM System** muncul di tab browser (Favicon) dan saat aplikasi diinstal di ponsel (PWA), sistem menggunakan arsitektur berikut yang sudah dikonfigurasi di kode sumber:

### Konfigurasi Metadata Logo
- **Favicon & Apple Icon**: Terletak di `<head>` pada `index.html`. Menggunakan link permanen Google Drive untuk memastikan logo muncul dengan resolusi tinggi.
- **Manifest PWA**: File `manifest.json` mengatur bagaimana logo tampil di Android/iOS.
- **Theme Color**: Diatur ke `#4f46e5` (Indigo) agar selaras dengan branding IMAM.

**Catatan Teknis**: Jika logo tidak muncul setelah update, bersihkan cache browser atau akses via Incognito untuk memicu update `service-worker.js`.

---

## 💻 Pengembangan Lokal

1. **Persiapan**:
   ```bash
   git clone [url-repo]
   cd imam-management-school
   npm install
   ```

2. **Jalankan Development**:
   ```bash
   npm run dev
   ```

3. **Build Produksi**:
   ```bash
   npm run build
   ```

---

## 📝 Kontributor & Lisensi
- **Lead Developer**: Akhmad Arifin (NIP: 19901004 202521 1012)
- **Instansi**: MAN 1 Hulu Sungai Tengah
- **Copyright**: © 2025 IMAM System. All rights reserved.

"Kejar versi paling tahan banting, bukan sekadar banyak fitur."