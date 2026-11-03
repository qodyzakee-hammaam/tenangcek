# TenangCek 🌿 — AI Health Triage Companion

> **"Bantu user memutuskan langkah berikutnya dengan tenang, bukan menebak penyakit."**  
> Proyek Interaksi Manusia dan Komputer (IMK) — Solusi untuk mengatasi kecemasan akibat _self-diagnosis_ di internet (_cyberchondria_).

---

## 🧭 Konsep Utama Aplikasi

1. **Describe (Ceritakan Gejala)**: Tanya jawab bertahap satu per satu (gejala, durasi, tingkat keparahan, gejala penyerta).
2. **Triage (Tingkat Urgensi)**: Menentukan 1 dari 4 level urgensi:
   - 🔴 **Darurat**: Berpotensi mengancam nyawa → Segera ke IGD / hubungi 119.
   - 🟠 **Segera**: Perlu pemeriksaan dalam waktu dekat → Periksa ke dokter dalam 24 jam.
   - 🔵 **Terjadwal**: Perlu dicek tetapi tidak mendesak → Buat janji dalam beberapa hari.
   - 🟢 **Pantau di Rumah**: Kondisi ringan → Perawatan mandiri dan pantau eskalasi.
3. **Understand (Pahami Alasannya)**: Alasan singkat dan kemungkinan umum yang lazim terlebih dahulu (bukan penyakit seram).
4. **Act (Ambil Langkah)**: 1-3 tindakan konkret, ringkasan gejala siap salin untuk dokter, dan latihan napas (_Calm Support_).
5. **Track (Pantau Perkembangan)**: _Symptom Diary_ harian untuk memantau perbaikan atau pengingat eskalasi ke dokter.

---

## 📁 Struktur Folder Project (Next.js App Router Fullstack)

```text
KesehatanKu/
├── src/
│   ├── app/                               # FRONTEND PAGES & BACKEND API ROUTES
│   │   ├── layout.tsx                     # Root layout, Navbar, DisclaimerBanner, Footer
│   │   ├── globals.css                    # Tailwind CSS v4 styling & animasi napas
│   │   ├── page.tsx                       # Landing page & pengenalan 4 level urgensi
│   │   ├── checkin/
│   │   │   └── page.tsx                   # Alur Check-in Gejala bertahap
│   │   ├── diary/
│   │   │   └── page.tsx                   # Halaman Symptom Diary & pemantauan
│   │   └── api/                           # BACKEND SERVER-SIDE ROUTE HANDLERS
│   │       ├── triage/
│   │       │   └── route.ts               # POST: Red Flag Rule -> Gemini AI -> Safety Layer
│   │       ├── chat/
│   │       │   └── route.ts               # GET: Pertanyaan bertahap (symptom step flow)
│   │       └── diary/
│   │           └── route.ts               # GET/POST: Pencatatan gejala harian
│   ├── components/                        # REUSABLE UI COMPONENTS
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                 # Header navigasi & status mode tamu
│   │   │   ├── DisclaimerBanner.tsx       # Banner peringatan batas medis
│   │   │   └── Footer.tsx                 # Footer kontak darurat 119 & catatan etika
│   │   ├── triage/
│   │   │   ├── StepChat.tsx               # Komponen chat bertahap interaktif
│   │   │   ├── TriageResultCard.tsx       # Kartu hasil 4 level urgensi lengkap
│   │   │   ├── RedFlagAlert.tsx           # Peringatan darurat langsung (cut-off alur)
│   │   │   ├── DoctorSummaryModal.tsx     # Ringkasan siap salin + 3 pertanyaan dokter
│   │   │   └── AnxietySlider.tsx          # Skala kecemasan 1-5 sebelum & sesudah
│   │   ├── calm/
│   │   │   └── BreathingExercise.tsx      # Latihan napas 4-4-6 interaktif
│   │   └── diary/
│   │       └── DiaryList.tsx              # Riwayat dan input catatan perkembangan
│   ├── lib/                               # LOGIKA BISNIS & INTEGRASI
│   │   ├── rules/
│   │   │   ├── redFlags.ts                # Rule-based detector tanda bahaya deterministik
│   │   │   └── safetyLayer.ts             # Validator batas etika & pencegah downgrade level
│   │   ├── gemini/
│   │   │   ├── client.ts                  # Inisialisasi Google Gen AI SDK
│   │   │   ├── prompts.ts                 # System prompt bernada menenangkan
│   │   │   └── schemas.ts                 # Skema JSON terstruktur
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Supabase browser client
│   │   │   └── server.ts                  # Supabase server admin client
│   │   └── utils/
│   │       └── formatters.ts              # Format tanggal dan badge status
│   └── types/                             # DEFINISI TIPE TYPESCRIPT
│       ├── triage.ts                      # Tipe data level urgensi, rule, result
│       ├── user.ts                        # Tipe profil personalisasi & diary
│       └── supabase.ts                    # Tipe tabel Supabase
├── supabase/
│   └── schema.sql                         # Skrip SQL tabel profiles, checkins, diary + RLS
├── .env.local                             # Kunci API & URL database lokal
├── .env.example                           # Template variabel lingkungan
├── next.config.mjs                        # Konfigurasi Next.js
└── package.json
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Development Server

```bash
npm run dev
```

Buka browser di [http://localhost:3000](http://localhost:3000).

### 2. Konfigurasi Variabel Lingkungan (`.env.local`)

```env
# Supabase (Frontend & Backend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Backend Server Only (Aman, tidak bocor ke client)
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

_(Catatan: Jika `GEMINI_API_KEY` belum diisi, TenangCek sudah dilengkapi **fallback engine cerdas** sehingga alur cek gejala dan red flag tetap dapat diuji coba sepenuhnya tanpa kendala)._

### 3. Setup Database (Prisma + Supabase)

Database dikelola oleh **Prisma Migrate**. Tambahkan juga `DATABASE_URL` (pooler) dan `DIRECT_URL` (koneksi langsung) dari _Project Settings → Database_, lalu jalankan:

```bash
npm run db:deploy     # menerapkan semua migrasi (tabel, RLS, trigger)
npm run prisma:generate
```

Untuk pengembangan skema: ubah `prisma/schema.prisma`, lalu `npm run db:migrate`.
RLS, trigger, dan CHECK constraint tetap ada di `prisma/migrations/` (ditulis tangan).
