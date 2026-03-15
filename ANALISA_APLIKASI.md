# Analisa Singkat Aplikasi IMAM v6.1

## Ringkasan Arsitektur
- **Frontend**: React + Vite + TypeScript, pola SPA dengan `ViewState` enum sebagai router internal sederhana.
- **Data layer**: Firebase Auth + Firestore (compat API), termasuk mode offline persistence.
- **Backend/SSO**: Tersedia endpoint SSO (`src/app/api/auth/login-sso/route.ts`) untuk verifikasi token dan provisioning user Firebase.
- **Deployment target**: Build statik Vite (`dist`), dengan dukungan PWA/service worker.

## Temuan Positif
1. **Modularisasi fitur cukup rapi**
   - Banyak halaman di-*lazy load* di `components/App.tsx`, membantu performa initial load.
2. **Role-based access sudah diterapkan**
   - `ProtectedRoute` dipakai untuk membatasi akses per role.
3. **Offline-first real use case**
   - Firestore persistence diaktifkan, cocok untuk skenario sekolah dengan internet tidak stabil.
4. **Build produksi berhasil**
   - `npm run build` sukses tanpa error blocking.

## Risiko / Catatan Teknis
1. **Konfigurasi Firebase tertanam langsung di source**
   - Konfigurasi disimpan hardcoded di `services/firebase.ts`; disarankan pindah ke environment variables agar lebih aman dan fleksibel antar lingkungan.
2. **Mode simulasi SSO masih aktif lewat token statis**
   - Token `"SSO-Imam-token"` masih bisa memicu login simulasi di client dan API route; ini perlu dipastikan nonaktif di production.
3. **Ukuran bundle utama besar**
   - Hasil build menunjukkan chunk utama `index-*.js` > 1 MB dan ada warning Vite tentang chunk >500 kB.
4. **Tidak ada script test/lint bawaan**
   - Pada `package.json`, script masih terbatas ke `dev`, `build`, `preview`; quality gate otomatis belum ada.

## Rekomendasi Prioritas (Praktis)
1. **Security hardening (P1)**
   - Pindahkan konfigurasi sensitif ke `.env` (`VITE_*`) dan audit semua token simulasi.
2. **Pisahkan mode dev vs prod (P1)**
   - Bungkus simulation bypass SSO dengan guard environment (`import.meta.env.DEV` atau flag backend).
3. **Optimasi performa bundle (P2)**
   - Tambahkan `manualChunks` pada `vite.config.ts`, pecah vendor besar (firebase, qr scanner, pdf).
4. **Tambah quality gate (P2)**
   - Tambahkan `lint`, `typecheck`, dan test minimal smoke agar regresi mudah terdeteksi.

## Kesimpulan
Aplikasi sudah punya fondasi yang kuat untuk kebutuhan operasional madrasah (fitur banyak, role-based, dan offline support). Fokus perbaikan paling penting saat ini ada di **keamanan mode simulasi**, **pengelolaan konfigurasi environment**, dan **optimasi performa bundle produksi**.
