# architecture.md — TenangCek

> Dokumen ini menjawab: **bagaimana aplikasi disusun.**
> Lihat juga: `product.md` (apa & untuk siapa), `database.md` (data), `design-system.md` (tampilan), `AGENTS.md` (aturan kerja AI).

---

## 1. Tech Stack

| Komponen  | Tools yang dipakai                                                                 | Peran                                                                         |
| --------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Framework | **Next.js 16 (App Router)**                                                        | Frontend + Route Handler; semua panggilan AI terjadi di server                |
| UI        | **React 19** + **lucide-react**                                                    | Chat, kartu hasil, dashboard, diary                                           |
| Bahasa    | **TypeScript** (strict)                                                            | Tipe payload, hasil triage, dan data database                                 |
| Styling   | **Tailwind CSS v4** (`@tailwindcss/postcss`, token di `src/app/globals.css`)       | Token warna urgensi, radius, dan font tanpa `tailwind.config.ts`              |
| AI        | **Gemini API** via `@google/genai`                                                 | Triage JSON terstruktur, chat streaming, surat dokter                         |
| DB & Auth | **Supabase Auth + Postgres**, diakses lewat **Prisma 7** (`@prisma/adapter-pg`)    | Login, profil, riwayat, check-in, diary; RLS ditegakkan lewat `withUserContext` |
| VCS       | GitHub                                                                             | Kolaborasi                                                                    |
| Deploy    | Vercel free tier (opsional)                                                        | Hosting demo; API key lewat env var                                           |

Tidak ada library UI eksternal, tidak ada zod, dan tidak ada state manager tambahan. Validasi input ditulis manual di Route Handler; tipe dipakai bersama dari `src/types/`.

> Free tier Gemini dan Supabase punya batas yang bisa berubah. Panjang percakapan dan jumlah request dibatasi di aplikasi (lihat §6).

---

## 2. Diagram Alur Sistem

```text
USER
  ↓
Next.js UI (React + TypeScript + Tailwind)
  ↓
POST /api/triage (Route Handler, server-side)
  ↓
Rule-based Red Flag Check (src/lib/rules/redFlags.ts)
  ├─ terdeteksi → hasil darurat dibuat langsung (Gemini tidak dipanggil)
  ↓ tidak terdeteksi
Gemini API — structured JSON (TRIAGE_MODEL_LADDER)
  ├─ gagal / tidak dikonfigurasi → fallback rule-based lokal
  ↓
Safety Layer (src/lib/rules/safetyLayer.ts)
  ↓
Persist opsional (Prisma + RLS; hanya login + consent)
  ↓
TriageResult + meta.aiSource → UI
  ↓
Chat lanjutan /api/chat (streaming) dan surat dokter /api/chat/letter
```

**Prinsip arsitektur:**

1. **Keamanan di atas AI.** Red flag dan safety layer adalah kode deterministik, bukan keputusan model.
2. **Server-side only untuk AI.** `GEMINI_API_KEY` hanya dibaca di Route Handler.
3. **Guest-first.** Seluruh alur inti berjalan tanpa akun; data tamu tidak pernah ditulis ke database.
4. **Minimal data.** Simpan hanya yang perlu, dengan persetujuan eksplisit.
5. **Gagal dengan tenang.** Gemini yang sibuk tidak boleh membuat pengguna kehilangan hasil; fallback lokal tetap melewati safety layer.

---

## 3. Struktur Folder (aktual)

```text
TenangCek/
├─ AGENTS.md
├─ docs/
│  ├─ product.md
│  ├─ architecture.md
│  ├─ database.md
│  └─ design-system.md
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
│     ├─ 20261103120000_init/            # tabel, index, FK, CHECK
│     └─ 20261103120100_rls_triggers/    # RLS, policy, trigger, grant, stub auth
├─ scripts/
│  └─ smoke-db.cjs                       # npm run test:smoke
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                        # landing
│  │  ├─ globals.css                     # @theme: token warna/radius/font
│  │  ├─ auth/page.tsx                   # masuk / daftar
│  │  ├─ checkin/page.tsx                # alur cek gejala
│  │  ├─ dashboard/page.tsx              # riwayat, consent, surat tersimpan
│  │  ├─ diary/page.tsx                  # symptom diary
│  │  ├─ crisis/page.tsx                 # layar bantuan darurat statis
│  │  └─ api/
│  │     ├─ triage/route.ts                    # POST: red flag → Gemini → safety → simpan
│  │     ├─ triage/history/route.ts            # GET: riwayat akun
│  │     ├─ triage/history/import/route.ts     # POST: impor riwayat perangkat
│  │     ├─ chat/route.ts                      # GET langkah onboarding, POST chat streaming
│  │     ├─ chat/letter/route.ts               # POST surat dokter (JSON)
│  │     ├─ checkins/route.ts                  # POST/PATCH check-in kecemasan
│  │     ├─ diary/route.ts                     # GET/POST/DELETE diary
│  │     ├─ profile/consent/route.ts           # GET/PATCH izin simpan data
│  │     └─ account/delete/route.ts            # DELETE akun + data
│  ├─ components/
│  │  ├─ auth/AuthGuard.tsx
│  │  ├─ calm/BreathingExercise.tsx
│  │  ├─ crisis/CrisisScreen.tsx
│  │  ├─ diary/DiaryList.tsx
│  │  ├─ layout/{ShellLayout,Navbar,Footer,DisclaimerBanner}.tsx
│  │  ├─ profile/{ConsentCard,DeleteAccountCard}.tsx
│  │  ├─ result/{ResultCard,UrgencyBadge,CostPathCard,Disclaimer}.tsx
│  │  ├─ support/AnxietyCheckin.tsx
│  │  ├─ triage/{StepChat,InteractiveAiChat,RedFlagAlert,DoctorSummaryModal,DoctorLetterModal}.tsx
│  │  └─ ui/{Button,Card,Chip,Disclosure,AutoGrowTextarea}.tsx
│  ├─ contexts/AuthContext.tsx
│  ├─ content/{emergency,costPath}.ts    # teks statis: nomor darurat, jalur biaya
│  ├─ lib/
│  │  ├─ api/response.ts
│  │  ├─ db/{prisma,withUserContext,urgency}.ts + repository/*
│  │  ├─ gemini/{client,prompts,schemas,generate,chatStream,resilience}.ts
│  │  ├─ rules/{redFlags,safetyLayer}.ts
│  │  ├─ supabase/{client,server,auth}.ts
│  │  ├─ triage/{localHistory,historyClient}.ts
│  │  ├─ ui/{cn,urgency}.ts
│  │  └─ utils/formatters.ts
│  ├─ generated/prisma/                  # output Prisma Client (jangan diedit)
│  └─ types/{triage,user,database,supabase}.ts
└─ package.json
```

Tidak ada folder `supabase/`, `lib/ai/`, `lib/triage/redFlags.ts`, `crisis.ts`, `schema.ts`, atau `rateLimit.ts`. Skema database hanya punya satu sumber: `prisma/`.

---

## 4. Pipeline Triage (detail)

Dipanggil dari `POST /api/triage`.

```text
1. Terima payload SymptomPayload
   └─ validasi manual: mainSymptom wajib tidak kosong (400 bila kosong)

2. Red flag check — checkRedFlags(payload)
   └─ mencocokkan kata kunci pada mainSymptom + accompanyingSymptoms + duration
   └─ bila cocok: hasil darurat sintetis dibuat di route, Gemini TIDAK dipanggil,
      meta.aiSource = "rule_based", lalu sesi tetap boleh disimpan bila login

3. Gemini triage — generateTriage(payload)
   └─ hanya bila GEMINI_API_KEY terisi dan valid
   └─ memakai TRIAGE_MODEL_LADDER + TRIAGE_BUDGET
   └─ gagal/timeout/semua model cooldown → createFallbackTriageResult(payload)
      (rule-based lokal; tidak ada retry tanpa batas)

4. Safety layer — validateAndEnforceSafety(aiResult, ruleCheck)
   └─ red flag → urgencyLevel dipaksa "darurat" dan nextSteps diganti
   └─ sanitasi pola dosis/resep di reasoning
   └─ confidenceNotes selalu diisi disclaimer

5. Persist (opsional) — persistTriageSession(...)
   └─ requireConsent: tamu (401) → reason "guest"; belum izin → "consent_required"
   └─ login + izin → Prisma lewat withUserContext (RLS)
   └─ rule_floor disimpan terpisah; urgency_level = max(AI, rule_floor)
   └─ check-in kecemasan disimpan di transaksi terpisah (kegagalan tidak
      membatalkan sesi)

6. Response
   └─ { success, data: TriageResult, meta: { persisted, sessionId?, reason?, aiSource } }
```

Catatan penting:

- **Tidak ada deteksi teks krisis otomatis.** Halaman `/crisis` bersifat statis dan ditautkan dari Navbar, Footer, serta `RedFlagAlert`; tidak ada pemotongan alur berdasarkan kata kunci krisis mental.
- **Tidak ada retry JSON.** Bila output Gemini tidak bisa di-parse, model dianggap gagal dan langsung pindah ke model berikutnya / fallback.
- **Urgensi tidak pernah diturunkan** oleh konteks kecemasan; `anxietyBefore` hanya memengaruhi nada dan tawaran latihan napas.

### Tipe data aktual (`src/types/triage.ts`)

```ts
export type UrgencyLevel = 'darurat' | 'segera' | 'terjadwal' | 'pantau_di_rumah';
export type TriageSource = 'gemini' | 'rule_based';

export interface SymptomPayload {
  mainSymptom: string;
  duration?: string;
  severity?: 'ringan' | 'sedang' | 'berat';
  accompanyingSymptoms?: string[];
  anxietyBefore?: number; // 1–5
  ageRange?: string;
  specialConditions?: string[];
  tonePreference?: 'santai' | 'formal';
  detailPreference?: 'ringkas' | 'detail';
}

export interface TriageResult {
  urgencyLevel: UrgencyLevel;
  reasoning: string;
  commonCauses: string[];
  dangerSignsToWatch: string[];
  nextSteps: string[];
  doctorSummary: {
    summary: string;
    threeQuestionsForDoctor: string[];
  };
  calmSupport: {
    message: string;
    suggestBreathingExercise: boolean;
  };
  isRedFlagTriggered?: boolean;
  confidenceNotes?: string;
}
```

Enum database memakai istilah Inggris (`monitor` / `scheduled` / `urgent` / `emergency`) dan hanya dikonversi lewat `src/lib/db/urgency.ts`. UI selalu memakai istilah Indonesia.

---

## 5. Safety Layer (deterministik)

| Aturan                                             | Implementasi aktual                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Red flag memotong alur                             | `checkRedFlags` di route; hasil darurat dibuat tanpa memanggil Gemini                                  |
| Urgensi final tidak boleh lebih rendah dari rule   | `validateAndEnforceSafety` memaksa `darurat`; saat menyimpan, `maxDbUrgency(ai, rule_floor)` dipakai lagi |
| Konteks kecemasan tidak menurunkan urgensi         | `anxietyBefore` tidak pernah menjadi input penentu level                                               |
| Sanitasi obat/dosis                               | Regex `minum N mg`, `dosis N`, `resepkan` diganti arahan konsultasi apoteker/dokter                    |
| Disclaimer selalu ada                             | `confidenceNotes` ditimpa teks "bukan pengganti diagnosis medis"                                       |
| Maksimal 3 langkah di UI                           | `ResultCard` memakai `nextSteps.slice(0, 3)`                                                            |
| Tidak ada diagnosis/angka persentase dari prompt   | Dilarang di system prompt; bukan validator regex menyeluruh                                            |
| Krisis mental                                      | Tidak dideteksi otomatis; pengguna diarahkan ke `/crisis` dari elemen navigasi dan peringatan darurat   |

Fallback bila Gemini gagal/timeout dijelaskan di §6. Prinsipnya: hasil rule-based tetap aman, `meta.aiSource = "rule_based"`, dan `ResultCard` menampilkan catatan tenang bahwa penjelasan berasal dari panduan standar TenangCek.

---

## 6. Integrasi Gemini & Ketahanan

### 6.1 Pemanggilan

- Hanya dari server: `src/lib/gemini/client.ts` (membaca `GEMINI_API_KEY`), dipakai route handler.
- **Triage** (`generate.ts`): `generateContent` dengan `responseMimeType: application/json`, `responseSchema: TRIAGE_JSON_SCHEMA`, temperature `0.2`.
- **Chat** (`chatStream.ts`): `generateContentStream` dengan system instruction kontekstual, temperature `0.6`; route mengirim `text/plain` bertahap dan header `X-AI-Provider` / `X-AI-Model`.
- **Surat dokter** (`/api/chat/letter`): satu permintaan JSON, lalu fallback lokal bila Gemini tidak tersedia.
- Prompt sistem memuat peran (pendamping triage, bukan dokter), larangan diagnosis/obat keras, aturan nada, bahasa Indonesia, dan konteks triase. Tidak ada identitas (email/nama) yang dikirim ke Gemini.

### 6.2 Kebijakan ketahanan (`src/lib/gemini/resilience.ts`)

| Hal               | Chat                                                          | Triage & surat dokter                                                |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Tangga model      | `gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-3.7-flash` → `gemini-3.6-flash` | `gemini-flash-latest` → `gemini-3.7-flash` → `gemini-flash-lite-latest` → `gemini-3.6-flash` → `gemini-3.5-flash` |
| Total anggaran    | 14 detik                                                      | 20 detik                                                             |
| Per model         | 7 detik                                                       | 12 detik                                                             |
| Disisihkan        | 5 detik                                                       | 6 detik                                                              |
| Percobaan/model   | 1 kali                                                        | 1 kali                                                               |

Cooldown per model:

| Kondisi            | Jeda                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `429` kuota habis  | `retryDelay` dari server, dijepit **15 detik–30 menit** (fallback 60 detik) |
| `500/502/503/504`  | 30 detik–2 menit                                                     |
| Timeout berulang   | 60 detik setelah dua kali berturut-turut                             |
| `404` model hilang | 1 jam                                                                |

Selama cooldown, model dilewati tanpa request sehingga gangguan satu model tidak mematikan seluruh asisten. Status disimpan **per proses**; pada deployment multi-instance setiap instance punya catatan sendiri. Bila semua model sedang cooldown, route langsung memakai fallback tanpa menunggu.

Stream chat juga punya **idle guard 20 detik**: bila model berhenti mengirim token, stream ditutup dan pengguna diberi pesan bahwa jawaban terputus (bukan indikator mengetik tanpa akhir). Saat klien menutup koneksi, stream upstream dibatalkan agar kuota tidak terbuang.

Log hanya memuat nama model, status, jenis error, dan durasi — tidak pernah isi gejala atau percakapan.

---

## 7. Auth & Mode Guest

`AuthGuard` sengaja **meloloskan semua pengguna** (mode akses langsung). Login bersifat opsional dan hanya dibutuhkan untuk menyimpan data ke akun.

| Mode                      | Perilaku                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Guest**                 | Seluruh alur check-in → hasil → chat → diary berjalan; riwayat di `localStorage`, diary di `sessionStorage`; tidak ada tulis DB |
| **Login (Supabase Auth)** | Profil, riwayat, check-in, dan diary tersimpan **hanya bila `consent_health_data = true`**               |

### 7.1 Riwayat pengecekan (sumber data)

| Kondisi                 | Sumber riwayat                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tamu                    | `localStorage` kunci `tenangcek_sessions_guest`; hanya di perangkat ini                                            |
| Login + persetujuan     | `GET /api/triage/history` (`mode: "account"`) digabung dengan cache perangkat dan didedupe `id`                    |
| Login tanpa persetujuan | `GET /api/triage/history` → `mode: "consent_required"`; dashboard hanya menampilkan cache perangkat                |

- Kunci cache ditentukan setelah status auth **pasti** (`AuthContext.isLoading === false`), bukan dari tebakan `user?.id || 'guest'` saat submit — supaya data akun tidak tertulis ke kunci tamu.
- Saat logout, `clearAccountHistories()` dan `clearAccountLetters()` menghapus semua kunci `tenangcek_sessions_<uuid>` dan `tenangcek_doctor_letters_<uuid>` di perangkat. Kunci tamu tidak disentuh.
- Riwayat tamu yang ditemukan setelah login **ditampilkan** dengan label "dari perangkat ini". Bila consent sudah aktif, impor berjalan otomatis satu kali; bila belum, pengguna menekan "Aktifkan izin" lalu "Simpan ke akun".
- Impor lewat `POST /api/triage/history/import`: maks. 20 entri, wajib consent, urgensi disimpan apa adanya, `rule_floor = NULL`, `red_flag_triggered = true` hanya untuk `emergency`, `created_at` tidak boleh di masa depan.
- Selama status auth/riwayat dimuat, dashboard menampilkan **skeleton** — bukan "belum ada riwayat" dan bukan data pemilik sebelumnya.
- Surat dokter disimpan di `localStorage` dengan kunci `tenangcek_doctor_letters_<user id | guest>` dan ikut dibersihkan saat logout karena isinya data kesehatan.
- Alur cek gejala menampilkan kartu "Pengecekan terakhir" sebagai konteks; kartu ini tidak mengubah jawaban maupun tingkat urgensi.

### 7.2 Persetujuan & penghapusan

- Tulis data kesehatan (`POST /api/triage`, `POST /api/diary`, `POST/PATCH /api/checkins`, impor riwayat) melewati `requireConsent`.
- `PATCH /api/profile/consent` mengaktifkan/mematikan izin; `consent_at` diisi trigger database, bukan client.
- `DELETE /api/account/delete` menghapus data kesehatan lewat Prisma lalu menghapus akun lewat `auth.admin.deleteUser` (butuh `SUPABASE_SERVICE_ROLE_KEY`, hanya server).
- Hanya `anon key` yang ada di browser; `service_role` tidak pernah dikirim ke client.

---

## 8. Environment Variables

```text
# Public (aman di client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only
GEMINI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # dipakai DELETE /api/account/delete
DATABASE_URL=                   # Prisma runtime (boleh lewat pooler)
DIRECT_URL=                     # Prisma CLI / migrasi (koneksi langsung)
```

Aturan: jangan commit `.env*`; contoh tersedia di `.env.example`; variabel tanpa awalan `NEXT_PUBLIC_` tidak boleh diimpor dari komponen client.

---

## 9. Error Handling & Resilience

- Validasi input dilakukan manual di setiap Route Handler (`typeof`, rentang 1–5, panjang teks). Tidak ada zod.
- Error API dikembalikan lewat `errorResponse(status, code, message)` dengan bahasa tenang; bentuknya `{ success: false, error: { code, message } }`.
- Timeout dan pemilihan model ditangani `resilience.ts`: satu percobaan per model, `429`/`5xx`/timeout langsung pindah model, dengan total anggaran waktu (chat 14 detik, triage/surat 20 detik).
- Kuota habis atau gangguan sementara tidak diulang pada model yang sama; model dijeda per model sehingga permintaan berikutnya melewatinya.
- Semua route yang memakai data pengguna menangani kegagalan database dengan pesan yang bisa ditindaklanjuti ("Coba lagi sebentar lagi") tanpa stack trace.
- Logging tidak boleh memuat isi gejala/mood/identitas pengguna.
- **Belum ada** rate limit aplikasi (`lib/rateLimit.ts` tidak ada). Perlindungan saat ini berasal dari pembatasan panjang percakapan, anggaran waktu Gemini, dan cooldown per model.

---

## 10. Privasi & Keamanan

- RLS aktif di semua tabel (lihat `database.md`); akses data pengguna lewat `withUserContext`.
- Minimalkan data; field sensitif opsional.
- Enkripsi in-transit (HTTPS) dan at-rest (bawaan Supabase).
- Tanpa analitik pihak ketiga yang menangkap input kesehatan.
- Nomor darurat disimpan di satu tempat (`src/content/emergency.ts`) agar mudah diverifikasi sebelum rilis (mis. **119 ext. 8 Kemenkes — verifikasi nomor terbaru**).
- Teks pemicu krisis tidak disimpan; hanya penanda `red_flag_triggered` bila relevan.

---

## 11. Testing

| Jenis           | Fokus                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Smoke DB/API    | `npm run test:smoke` (`scripts/smoke-db.cjs`): 29 pemeriksaan skema, RLS, endpoint, dan alur guest |
| Manual          | Alur guest penuh, login + consent, impor riwayat, logout tanpa jejak, chat streaming             |
| Skenario klinis | Kasus uji red flag (mis. nyeri dada, leher kaku, pingsan) → minimal `darurat`                   |
| Invarian        | `final_urgency >= rule_floor`; impor tidak menurunkan urgensi                                   |
| Usability       | Sesuai rencana IMK: SUS, Likert, selisih kecemasan                                              |

Belum ada unit test otomatis untuk `redFlags`, `safetyLayer`, atau `costPath`; pemeriksaan saat ini bersifat smoke test dan verifikasi manual.

---

## 12. Deployment

- Vercel (opsional) untuk demo; set env var di dashboard Vercel.
- Preview deployment per PR; migrasi database dijalankan terpisah (`npm run db:deploy`) dan ditinjau.
- Sebelum rilis: verifikasi nomor darurat, tinjau teks disclaimer, cek ulang angka di materi riset, dan pastikan `npm run build` bersih.
