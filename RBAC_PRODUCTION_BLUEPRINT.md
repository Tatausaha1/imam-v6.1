# IMAM V6 – RBAC & Arsitektur Production Blueprint

## 1) System Architecture Explanation

### Arsitektur saat ini (ringkas)
- Frontend SPA React + Vite, state-based navigation.
- Otorisasi UI berbasis role dari dokumen Firestore `users/{uid}`.
- Sebagian modul sudah realtime listener (`attendance`, `students`, `letters`, dsb).
- Dashboard sudah memiliki percabangan `SISWA` vs `GURU`/lainnya, tetapi domain logic masih berada langsung di komponen.

### Arsitektur target (production-ready)
Gunakan 4 lapis jelas:
1. **Identity Layer**: Firebase Auth + Custom Claims.
2. **Authorization Layer**: policy engine terpusat (RBAC guard).
3. **Data Access Layer**: repository/service per domain.
4. **Presentation Layer**: dashboard widget modular per role.

Diagram alur:
```text
Login -> Firebase Auth -> Claims -> User Profile Firestore
     -> Policy Engine -> Load Role Dashboard Widgets
     -> Realtime subscriptions (scoped)
```

---

## 2) RBAC Improvement Suggestions

### 2.1 Standarisasi Role
Semua role WAJIB uppercase konsisten:
- ADMIN, KEPALA_MADRASAH, KURIKULUM, TATA_USAHA
- GURU, WALI_KELAS, PIKET
- BK, KESISWAAN
- SISWA, KETUA_KELAS, ORANG_TUA
- STAF, HUMAS, KOMITE, PERPUSTAKAAN

### 2.2 User Model (Firestore)
```ts
interface UserDoc {
  uid: string;
  madrasahId: string;
  nama: string;
  email?: string;
  nip?: string;
  nisn?: string;
  roles: string[];       // multi-role
  primaryRole: string;   // role utama aktif
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.3 Custom Claims (Auth)
Claims minimal:
```json
{
  "madrasahId": "MAN1-HST",
  "roles": ["GURU", "WALI_KELAS"],
  "primaryRole": "GURU"
}
```

### 2.4 Policy Engine
Buat file policy terpusat:
- `canReadDashboard(role)`
- `canWriteAttendance(role, classScope)`
- `canManageUsers(role)`
- `canReadStudent(role, ownerScope)`

Hindari hardcode role di komponen UI.

---

## 3) Database Optimization (Firestore)

### 3.1 Koleksi utama
- users
- students
- teachers
- classes
- attendance
- points
- reports
- journals
- documents
- notifications

### 3.2 Optimasi high-frequency attendance
Tambahkan agregat:
- `attendance_daily_stats/{madrasahId_date_classId}`
- `attendance_student_daily/{studentId_date}`
- `dashboard_cache/{madrasahId_role_scope}`

### 3.3 Index penting
- attendance: `(date, class)`
- attendance: `(studentId, date)`
- students: `(status, tingkatRombel)`
- points: `(studentId, updatedAt desc)`
- documents: `(status, createdAt desc)`

### 3.4 Query rule
- Selalu scope dengan `madrasahId`
- Hindari query tanpa filter tenant
- Batasi realtime listener hanya pada widget yang aktif

---

## 4) Performance Optimization

1. **Scoped Realtime**
   - Mount listener hanya saat widget visible.
2. **Hybrid load**
   - Initial read dari cache dokumen agregat.
   - Delta update via listener/event.
3. **Background aggregation**
   - Gunakan Cloud Run job/trigger untuk update statistik harian.
4. **Chunk splitting**
   - Modul berat (`QRScanner`, `Advisor`, `Reports`) lazy + manualChunks.
5. **Client cache strategy**
   - SW hanya cache static assets; data sensitif jangan di-cache agresif.

---

## 5) Security Recommendations

### 5.1 Firestore Rules wajib claims-based
- `request.auth != null`
- `request.auth.token.madrasahId == resource.data.madrasahId`
- validasi role per path

### 5.2 Provisioning akun siswa
- Hentikan password default statis untuk production.
- Terapkan force-reset password saat login pertama.
- Jangan tampilkan kredensial plaintext di UI.

### 5.3 Audit logging
Buat koleksi `audit_logs`:
- actorUid, actorRole, action, targetType, targetId
- beforeHash, afterHash
- ipHash, deviceHash
- timestamp

### 5.4 Device/session monitoring
- Catat session aktif per perangkat
- Alert login anomali (device baru/lokasi abnormal/jam abnormal)
- Endpoint revoke all sessions

---

## 6) Dashboard Architecture by Role (UI/UX)

### 6.1 Student Dashboard
Fokus:
- Status 5 sesi realtime (Masuk, Duha, Zuhur, Ashar, Pulang)
- Ringkasan poin (Merit/Demerit)
- ID Card QR
- Bottom navigation mobile-first

### 6.2 Teacher/Wali Dashboard
Fokus:
- Statistik kehadiran kelas harian
- Quick actions: jurnal, presensi manual, input nilai
- Jadwal mengajar
- Akses riwayat presensi + poin siswa kelas

### 6.3 Admin/Leadership Dashboard
Fokus:
- KPI global realtime
- Surat masuk/keluar
- AI insight tren kehadiran
- Kontrol sistem (user management, tahun akademik, logs)

### 6.4 Parent Dashboard
Fokus:
- Monitoring check-in/check-out anak
- Notifikasi poin kedisiplinan
- Layanan izin sakit / permintaan dokumen

---

## 7) AI Capability Roadmap (Gemini)

1. **Behavior Risk Score**
   - prediksi risiko pelanggaran disiplin per siswa.
2. **Attendance Prediction**
   - prediksi ketidakhadiran berdasarkan histori.
3. **Anomaly Detection**
   - deteksi outlier (keterlambatan massal, anomali check-out).
4. **Narrative Reporting**
   - auto summary mingguan/bulanan untuk kepala madrasah.
5. **Parent Nudges**
   - notifikasi rekomendasi tindakan untuk orang tua.

---

## 8) Multi-school Scalability Strategy

### Fase 1 (Tenant-ready)
- Tambahkan `madrasahId` pada semua dokumen domain.
- Tambahkan `madrasahId` pada custom claims.

### Fase 2 (Tenant isolation)
- Firestore rules strict per tenant.
- Semua query wajib filter tenant.

### Fase 3 (Control plane)
- Cloud Run services untuk:
  - role/claims management
  - aggregation pipeline
  - AI orchestration
  - audit export

### Fase 4 (Platform mode)
- Super-admin panel multi-madrasah
- Template onboarding tenant baru
- Monitoring SLA/cost per tenant

---

## 9) Future Feature Roadmap (12 minggu)

### Sprint 1 (M1-M2): RBAC Foundation
- Standard role enum
- Multi-role schema users
- Claims sync service
- Firestore rules v1

### Sprint 2 (M3-M4): Dashboard Refactor
- Dashboard modular per role
- Policy engine terpusat
- Shared data repositories

### Sprint 3 (M5-M8): Cost & Performance
- Attendance aggregate docs
- Dashboard cache
- Realtime optimization

### Sprint 4 (M9-M12): AI Intelligence
- Risk score
- Attendance forecast
- Anomaly alerts
- Narrative reports

---

## 10) Definition of Done (Production)
- [ ] Claims-based RBAC aktif
- [ ] Firestore rules role + tenant enforced
- [ ] Audit logs end-to-end
- [ ] Session/device monitoring aktif
- [ ] Dashboard per role modular
- [ ] Load test 1000 siswa / 50+ staff lulus

