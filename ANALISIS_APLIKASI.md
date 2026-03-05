# Analisis Aplikasi IMAM v6.1

## Ringkasan Cepat
Aplikasi ini adalah web app **React + Vite** untuk manajemen akademik madrasah dengan banyak modul (presensi, akademik, surat, data induk, dll), berbasis **Firebase Auth + Firestore** dan didukung fitur **PWA/offline persistence**.

## Arsitektur
- Frontend utama: React single-page app, entry `index.tsx`, core orchestration di `components/App.tsx`.
- State navigasi masih berbasis `ViewState` enum + conditional rendering besar (belum memakai router deklaratif).
- Banyak modul sudah lazy-loaded sehingga initial load lebih ringan, tapi masih ada chunk utama besar.
- Backend pendamping: `server/server.js` sebagai proxy API Gemini/OpenAI + static file server.

## Temuan Positif
1. **Offline-first sudah nyata**: Firestore persistence aktif (`enablePersistence`) dan deteksi online/offline di UI.
2. **Role-based access**: Banyak halaman dibungkus `ProtectedRoute` dan role dijaga di level view.
3. **Modular domain service**: operasi data dipisah ke folder `services/*`.
4. **Build sehat**: produksi bisa build sukses.

## Risiko Teknis yang Perlu Diprioritaskan
1. **Secret/config sensitif masih hardcoded di client**
   - Konfigurasi Firebase berisi key dan identifier project langsung di frontend.
   - Ada inject env API key dari `vite.config.ts` ke bundle client.
2. **Ketidakkonsistenan arsitektur runtime**
   - Repositori ini Vite SPA, tetapi ada endpoint ala Next.js (`src/app/api/.../route.ts`) yang tidak dieksekusi oleh Vite runtime default.
   - Potensi kode mati, kebingungan deployment, dan bug integrasi SSO.
3. **Ukuran bundle masih besar**
   - Build warning menunjukkan chunk utama > 1 MB dan beberapa modul sangat besar (mis. scanner/advisor).
4. **Teknik navigasi sulit diskalakan**
   - `switch-case` besar di `App.tsx` rawan konflik merge dan menambah kompleksitas maintainability.

## Rekomendasi Tindakan (Urutan Eksekusi)
1. **Keamanan konfigurasi (minggu 1)**
   - Pastikan semua API key AI hanya dipakai lewat proxy server.
   - Hapus pemakaian key langsung di client (`process.env.*` untuk provider AI di frontend).
2. **Rapikan boundary arsitektur (minggu 1-2)**
   - Pilih satu pendekatan: tetap Vite + Express API, atau migrasi penuh ke framework fullstack.
   - Jika tetap Vite, pindahkan logic `src/app/api/...` ke `server/` agar benar-benar runnable.
3. **Optimasi performa bundle (minggu 2)**
   - Split modul berat (QR scanner/advisor) lebih granular.
   - Tambah `manualChunks` dan audit dependency yang paling berat.
4. **Refactor routing (minggu 3)**
   - Migrasi dari `ViewState` switch-case ke React Router berbasis route config + guard per route.
5. **Quality gate (berjalan)**
   - Tambah lint, type-check strict, test minimal untuk service kritikal (auth, attendance, letter flow).

## Estimasi Dampak
- **Security posture naik**: mengurangi risiko kebocoran key dan misuse API.
- **Onboarding dev lebih cepat**: arsitektur lebih jelas, minim kebingungan Vite vs Next style.
- **UX lebih stabil**: loading modul berat lebih terkendali.
- **Maintainability**: penambahan fitur baru lebih aman tanpa memperbesar file central app.
