# IMAM - Integrated Madrasah Academic Manager 🏫
**Version 6.2 - Enterprise Cloud Edition**

**IMAM** adalah ekosistem manajemen madrasah modern yang dirancang untuk **MAN 1 Hulu Sungai Tengah**. Aplikasi ini mengintegrasikan administrasi cerdas, presensi berbasis QR Code tingkat tinggi, dan asisten pendidikan bertenaga AI dalam satu platform *mobile-first*.

---

## 📸 Tampilan Antarmuka (Preview)
*Berikut adalah tampilan aplikasi jika dijalankan di perangkat seluler:*

<div align="center">
  <table table-layout="fixed" width="100%">
    <tr>
      <td width="33%" align="center">
        <img src="./public/screenshots/dashboard.png" width="250" alt="Dashboard Utama" />
        <br /><b>Dashboard Utama</b>
      </td>
      <td width="33%" align="center">
        <img src="./public/screenshots/scanner.png" width="250" alt="Lensa Presensi QR" />
        <br /><b>Ultra-Fast QR Scanner</b>
      </td>
      <td width="33%" align="center">
        <img src="./public/screenshots/idcard.png" width="250" alt="Kartu Pelajar Digital" />
        <br /><b>Kartu Pelajar Digital</b>
      </td>
    </tr>
  </table>
</div>

> **💡 Cara Memunculkan Gambar Anda:**
> 1. Ambil screenshot aplikasi dari HP Anda.
> 2. Simpan foto ke folder `public/screenshots/` dengan nama `dashboard.png`, `scanner.png`, dan `idcard.png`.
> 3. Lakukan `git add .`, `git commit`, dan `git push`. Gambar akan otomatis muncul di sini.

---

## 🚀 Fitur Unggulan
- **⚡ Smart QR Presence**: Pemindaian full-frame dengan jeda respons hanya 0.5 detik. Mendukung mode Haid dan pencatatan sholat berjamaah.
- **🤖 AI Academic Assistant**: Integrasi Google Gemini 3 Flash untuk pembuatan RPP, draf kuis, dan pengumuman otomatis.
- **💬 Hybrid AI Helpdesk**: Layanan chat bantuan teknis yang menggabungkan kecerdasan GPT-4 dan Gemini.
- **🪪 Digital Identification**: Kartu identitas siswa cerdas yang terhubung langsung dengan database cloud.
- **✉️ Digital PTSP**: Alur surat menyurat mandiri dengan verifikasi berjenjang dan tanda tangan digital (QR Seal).
- **🛡️ Enterprise Grade Security**: Proteksi database Firestore dengan aturan keamanan tingkat tinggi berbasis peran (role).

---

## 🛠️ Persiapan Teknis
Sebelum melakukan deployment, pastikan variabel berikut sudah dikonfigurasi:
- **Google Gemini API Key**: Untuk otak AI Generator.
- **OpenAI API Key**: Untuk fitur Live Chat GPT-4.
- **Firebase Project**: Firestore, Auth, dan Hosting diaktifkan.

---

## 🔼 Deployment ke Vercel (Gratis)
Aplikasi ini dioptimasi untuk berjalan di paket **Vercel Hobby (Gratis)**.
1. Hubungkan repository GitHub ini ke Vercel.
2. Masukkan `GEMINI_API_KEY` dan `OPENAI_API_KEY` di tab Environment Variables.
3. Klik **Deploy**.

---

## 📊 Spesifikasi Sistem
- **Frontend**: React 19, Tailwind CSS, Vite 6.
- **Database**: Google Firebase (Realtime Persistence).
- **AI Core**: Gemini 3 Flash & OpenAI GPT-4 Turbo.
- **Tools**: jsPDF, XLSX, Html5-QRCode.

---

## 📝 Kontributor
- **Lead Developer**: Akhmad Arifin (NIP: 19901004 202521 1012)
- **Instansi**: MAN 1 Hulu Sungai Tengah
- **Peran**: Penata Layanan Operasional / Fullstack Engineer

© 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
