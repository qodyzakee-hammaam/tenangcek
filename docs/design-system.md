# design-system.md — TenangCek

> Dokumen ini menjawab: **bagaimana tampilan aplikasi dibuat.**
> Dasar dari dokumen konsep: warna level urgensi sebagai _design token_, nada menenangkan, 1–3 langkah utama, level urgensi tampil lebih dulu, detail bersifat opsional.
> Semua nilai di bawah adalah **nilai yang benar-benar dipakai** di `src/app/globals.css` dan komponen, bukan usulan terpisah.

---

## 1. Prinsip Desain

| Prinsip                              | Penerapan                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **Tenang, bukan klinis dingin**      | Warna lembut, ruang kosong lega, tipografi ramah                                |
| **Satu hal per layar**               | Chat bertahap: satu pertanyaan per langkah                                      |
| **Urgensi dulu**                     | Level urgensi selalu elemen paling atas di kartu hasil                          |
| **Tindakan di atas informasi**       | Selalu ada langkah konkret; maks. 1–3                                           |
| **Detail opsional**                  | Info tambahan disembunyikan di balik _expand_ ("Kemungkinan penyebab…")         |
| **Jujur soal batas**                 | Disclaimer terlihat, tidak disembunyikan, tidak menakutkan                      |
| **Tidak menakut-nakuti**             | Hindari merah pekat berlebihan di luar level Darurat; tanpa animasi mengagetkan |
| **Warna bukan satu-satunya penanda** | Setiap level punya ikon + label teks, bukan hanya warna                         |
| **Inklusif biaya**                   | Jalur Hemat tampil sebagai bagian inti kartu hasil, bukan tambahan tersembunyi  |
| **Responsif sejak awal**             | Target sentuh 44px, composer chat tumbuh mengikuti panjang ketikan              |

---

## 2. Design Token

Token didefinisikan di `src/app/globals.css` memakai `@theme` Tailwind v4. **Tidak ada `tailwind.config.ts`.**

### 2.1 Warna urgensi (semantik)

| Level (kode) | Label UI        | Warna dasar | Latar     | Teks di atas latar | Ikon (lucide)   |
| ------------ | --------------- | ----------- | --------- | ------------------ | --------------- |
| `darurat`    | Darurat         | `#B42318`   | `#FEF3F2` | `#7A271A`          | `AlertOctagon`  |
| `segera`     | Segera          | `#C4620A`   | `#FFF4E5` | `#7A3E06`          | `Clock`         |
| `terjadwal`  | Terjadwal       | `#1D6FB8`   | `#EEF5FC` | `#164E85`          | `CalendarCheck` |
| `pantau_di_rumah` | Pantau di rumah | `#2F7D5B` | `#EEF8F3` | `#1F5740`          | `HeartPulse`    |

Kelas yang dipakai: `bg-urgency-emergency`, `bg-urgency-emergency-bg`, `text-urgency-emergency-fg`, dan pola yang sama untuk `urgent`, `scheduled`, `monitor`. `src/lib/ui/urgency.ts` menjadi satu-satunya pemetaan level → label/kelas; `UrgencyBadge` dan `ResultCard` membacanya dari sana.

### 2.2 Warna netral & brand

| Token        | Nilai     | Pemakaian                                       |
| ------------ | --------- | ----------------------------------------------- |
| `brand-50`   | `#EFF8F7` | Latar highlight halus                           |
| `brand-100`  | `#DDF0EE` | Aksen lembut, seleksi teks                      |
| `brand-500`  | `#3E8E8A` | Tombol utama, aksen (teal lembut, kesan tenang) |
| `brand-600`  | `#2F7471` | Hover/active, teks aksen                        |
| `surface`    | `#FFFFFF` | Kartu, navbar                                   |
| `canvas`     | `#F8FAFA` | Latar halaman                                   |
| `ink-900`    | `#1B2A2F` | Teks utama                                      |
| `ink-600`    | `#4A5B61` | Teks sekunder                                   |
| `ink-400`    | `#7D8E94` | Placeholder, caption                            |
| `border`     | `#DDE5E7` | Garis tipis                                     |
| `focus-ring` | `#2563EB` | Indikator fokus keyboard                        |

### 2.3 Token Tailwind v4 (aktual)

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --color-brand-50: #eff8f7;
  --color-brand-100: #ddf0ee;
  --color-brand-500: #3e8e8a;
  --color-brand-600: #2f7471;

  --color-canvas: #f8fafa;
  --color-surface: #ffffff;
  --color-border: #dde5e7;
  --color-focus-ring: #2563eb;

  --color-ink-900: #1b2a2f;
  --color-ink-600: #4a5b61;
  --color-ink-400: #7d8e94;

  --color-urgency-emergency: #b42318;
  --color-urgency-emergency-bg: #fef3f2;
  --color-urgency-emergency-fg: #7a271a;

  --color-urgency-urgent: #c4620a;
  --color-urgency-urgent-bg: #fff4e5;
  --color-urgency-urgent-fg: #7a3e06;

  --color-urgency-scheduled: #1d6fb8;
  --color-urgency-scheduled-bg: #eef5fc;
  --color-urgency-scheduled-fg: #164e85;

  --color-urgency-monitor: #2f7d5b;
  --color-urgency-monitor-bg: #eef8f3;
  --color-urgency-monitor-fg: #1f5740;

  --radius-card: 16px;
  --radius-control: 12px;
}
```

Gunakan **kelas semantik** (`bg-urgency-monitor-bg`, `text-ink-600`, `rounded-card`), jangan hex langsung di komponen.

### 2.4 Tipografi

| Peran                | Kelas yang dipakai                          | Catatan                         |
| -------------------- | ------------------------------------------- | ------------------------------- |
| Judul landing/hero   | `text-4xl sm:text-5xl lg:text-[3.65rem]`     | Tracking rapat, weight 600      |
| Judul halaman        | `text-2xl sm:text-3xl`                      | Dashboard, check-in             |
| Heading seksi        | `text-lg` / `text-sm font-semibold`         | Kartu hasil, panel chat         |
| Body                 | `text-sm leading-6` / `text-base leading-7` | Minimum 16px untuk input di HP  |
| Caption / disclaimer | `text-xs leading-5` / `text-[11px]`         | Kontras tetap ≥ 4.5:1           |

Font: **Inter** (fallback `system-ui`). Bahasa utama: **Indonesia**. Input memakai `text-base` di mobile dan `sm:text-sm` di desktop agar tidak memicu zoom otomatis iOS.

### 2.5 Spasi, radius, bayangan

- Skala spasi Tailwind (4px base). Padding kartu `p-5`/`p-6`; jarak antar blok `space-y-4`.
- Radius kartu `rounded-card` (16px), kontrol `rounded-control` (12px). Hero dashboard memakai radius khusus `rounded-[1.75rem]`.
- Bayangan sangat halus (`shadow-sm`, `shadow-xs`); kartu hasil tidak memakai bayangan tebal.

### 2.6 Gerak (motion)

- Transisi lembut 150–250ms (`transition`, `duration-1000` untuk lingkaran napas).
- Latihan napas: tarik 4 detik → tahan 4 detik → hembuskan 6 detik.
- Animasi `calmBreathe` (8 detik, scale 1 → 1.35) tersedia di `globals.css`.
- `prefers-reduced-motion: reduce` mematikan animasi napas dan mempersingkat seluruh transisi.
- Tidak ada animasi berkedip atau urgensi palsu.

---

## 3. Komponen Inti

### 3.1 `UrgencyBadge`

- Menampilkan ikon + label + warna level. `size="lg"` di header kartu hasil, `size="sm"` di riwayat, dashboard, dan kartu "Pengecekan terakhir".
- Props: `level: UrgencyLevel`, `size?: 'sm' | 'lg'`, `className?`.
- Selalu merender teks label, bukan warna saja.

### 3.2 `ResultCard` (urutan aktual)

1. **Level urgensi** (`UrgencyBadge` besar) + tindakan satu baris + waktu yang disarankan
2. **Catatan sumber** — hanya bila `source === "rule_based"` dan bukan red flag: "Penjelasan dari panduan standar TenangCek"
3. **Alasan singkat** ("Kenapa kamu mendapat hasil ini")
4. **Kemungkinan umum** (disclosure, default tertutup)
5. **Konteks kecemasan** (kartu `brand-50`; tidak menurunkan urgensi)
6. **Tanda bahaya** (disclosure, default tertutup)
7. **Langkah berikutnya** (maks. 3, bernomor, selalu terlihat)
8. **Jalur hemat** (`CostPathCard`, selalu terlihat)
9. **Latihan napas** (disclosure; muncul bila disarankan atau `anxietyBefore >= 4`)
10. **Ringkasan untuk dokter** (tombol membuka `DoctorSummaryModal`)
11. **Check-in kecemasan sesudah hasil** (`AnxietyCheckin` + umpan balik selisih)
12. **Disclaimer** (selalu terlihat di bawah)

### 3.3 `StepChat` (alur cek gejala)

- Lima langkah: gejala utama → durasi → keparahan → gejala penyerta → check-in kecemasan.
- Satu pertanyaan per layar, progress bar tipis + teks "Langkah N dari 5".
- Jawaban cepat berupa `Chip` besar (target sentuh ≥ 44px) + input teks bebas.
- `AutoGrowTextarea`: satu baris saat kosong, tumbuh mengikuti panjang ketikan sampai `maxHeight` 132px, lalu bergulir. Enter mengirim, Shift+Enter menambah baris.
- Tombol "Lewati" hanya untuk langkah opsional (gejala penyerta), "Kembali" selalu tersedia.
- Kartu "Pengecekan terakhir" tampil di atas form sebagai konteks; bisa ditutup dan tidak mengubah jawaban.
- Setelah submit, hasil dirender lewat `ResultCard` + tombol "Tanya lanjut ke pendamping AI".

### 3.4 `InteractiveAiChat`

- Layout dua panel: sidebar rincian triase (≥ `lg`) + panel chat. Di mobile sidebar disembunyikan; tombol kembali ke dashboard tetap ada.
- Header chat menampilkan nama AI Companion, badge urgensi, keluhan, dan label model dari header `x-ai-model` (bukan versi hardcoded).
- Pesan pengguna di kanan (`brand-500`), asisten di kiri (`surface` + border); markdown sederhana (`**bold**`, `*italic*`, bullet, daftar angka) dirender manual.
- Indikator mengetik hanya muncul sebelum token pertama; teks streaming langsung terlihat.
- Chips pertanyaan cepat bisa digulir horizontal.
- Composer memakai `AutoGrowTextarea` dengan `maxHeight` 160px, tombol kirim 44×44px, hint "Enter kirim · Shift+Enter baris baru".
- Tombol "Akhiri & Buat Surat Dokter" memanggil `/api/chat/letter` dan membuka `DoctorLetterModal`.

### 3.5 `AnxietyCheckin` (skala 1–5)

- Lima pilihan besar; setiap pilihan punya emoji + angka + label teks ("Tenang" … "Sangat cemas").
- `role="radiogroup"` + `role="radio"` + `aria-checked`; umpan balik lewat `aria-live="polite"`.
- Digunakan sebelum triage (langkah 5) dan sesudah hasil.

### 3.6 `BreathingExercise`

- Muncul di `ResultCard` bila `suggestBreathingExercise` atau kecemasan ≥ 4; juga tersedia di sidebar chat dan dashboard.
- Durasi singkat (±1 menit), tombol Mulai/Jeda/Ulangi, panduan teks + `aria-live`.
- Lingkaran bernapas menghormati `prefers-reduced-motion`.

### 3.7 `RedFlagAlert` & `CrisisScreen`

- `RedFlagAlert` muncul **di atas** `ResultCard` bila `isRedFlagTriggered`, dan sebagai banner di atas chat. Isinya: alasan singkat, tindakan utama, tombol ke `/crisis` dan nomor darurat.
- `CrisisScreen` adalah halaman statis `/crisis`: pesan suportif → daftar kontak bantuan dengan tombol `tel:` → langkah sambil menunggu → pengingat.
- **Tidak ada deteksi krisis otomatis.** Halaman krisis hanya bisa dibuka dari tautan navigasi/peringatan.
- Tombol telepon memakai `tel:` link; nomor diambil dari `src/content/emergency.ts` (verifikasi sebelum rilis).

### 3.8 `CostPathCard`

- Ikon jenis faskes: puskesmas/FKTP, klinik, IGD, telekonsultasi, rawat mandiri.
- Menampilkan ringkasan jalur + catatan BPJS/rujukan + disclaimer biaya.
- Disusun agar pengguna bisa menyebutkan faskes dan langkah termurah yang sesuai (metrik usability).

### 3.9 `DoctorSummaryModal` & `DoctorLetterModal`

- `DoctorSummaryModal`: ringkasan gejala + tepat **3 pertanyaan** untuk tenaga kesehatan; aksi Salin.
- `DoctorLetterModal`: surat lengkap (nomor dokumen, ringkasan klinis, insight chat, tanda bahaya, perawatan yang sudah dicoba, pertanyaan, penutup); aksi Salin, Cetak (`window.print()`), dan simpan ke dashboard.

### 3.10 `DiaryList` (form + daftar)

- Form: catatan (textarea 3 baris), keparahan 1–5; mood tersedia di API tetapi belum ditampilkan di form.
- Mode tamu menyimpan di `sessionStorage` (hilang saat tab ditutup); mode akun menyimpan ke database setelah consent.
- Daftar kronologis; pengingat eskalasi otomatis belum diimplementasikan.

### 3.11 Komponen dasar

`Button` (`primary` / `secondary` / `ghost` / `danger`; ukuran `sm` / `md`), `Card`, `Chip`, `Disclosure`, `AutoGrowTextarea`.

Tidak ada komponen `Input`, `Dialog`, `Toast`, atau `ConsentDialog` terpisah. Persetujuan memakai `ConsentCard`; modal memakai komponen khusus (`DoctorSummaryModal`, `DoctorLetterModal`).

---

## 4. Layout & Responsif

- **Mobile-first** (target utama mahasiswa/dewasa muda memakai ponsel).
- Landing: grid satu kolom → dua kolom di `lg`, maksimum `max-w-6xl`.
- Dashboard: satu kolom → `lg:grid-cols-[1.35fr_.8fr]`; kartu ringkasan `sm:grid-cols-3`.
- Alur cek gejala: `max-w-xl`, hasil `max-w-2xl`, diary `max-w-4xl`.
- Chat: sidebar 320–384px hanya di `lg`; panel chat mengisi sisa tinggi (`h-dvh`, `overflow-hidden`) dengan area pesan yang bergulir sendiri.
- Composer chat **tumbuh mengikuti panjang ketikan** (1 baris → maksimum 160px, lalu scroll) sehingga teks panjang tidak terpotong dan area percakapan tidak terdorong keluar layar.
- Target sentuh minimal 44×44px (`min-h-11`, tombol ikon `h-11 w-11`).
- Padding aman untuk perangkat berponi: `pb-[calc(...,env(safe-area-inset-bottom))]`.
- Navigasi: Mulai cek · Riwayat · Diary · bantuan darurat (ikon telepon) · Masuk/Keluar.

---

## 5. Aksesibilitas (target WCAG 2.1 AA)

- Kontras teks ≥ 4.5:1 (periksa semua pasangan warna urgensi).
- Level urgensi: **ikon + teks + warna**.
- Navigasi keyboard penuh; indikator fokus `focus-visible:outline-2 outline-focus-ring`.
- `role="radiogroup"` untuk skala kecemasan; `aria-live="polite"` untuk hasil dan umpan balik; layar krisis `role="alert"`.
- `aria-label` pada tombol ikon (kirim, tutup, bantuan darurat).
- Dukung `prefers-reduced-motion`; ukuran teks input 16px di mobile.
- Bahasa sederhana, kalimat pendek.
- Belum ada audit menyeluruh dengan pembaca layar; checklist ini menjadi target, bukan klaim sertifikasi.

---

## 6. Panduan Nada & Copy (Bahasa Indonesia)

**Pola feedback:** validasi → konteks → langkah konkret.

| Hindari                                        | Gunakan                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Anda mungkin menderita [penyakit serius]."    | "Keluhan seperti ini paling sering terkait kurang tidur, stres, atau dehidrasi."      |
| "Itu cuma stres."                              | "Stres bisa menimbulkan gejala serupa, tapi kami tidak menyingkirkan penyebab fisik." |
| "Jangan khawatir!"                             | "Wajar kalau kamu khawatir. Ini yang bisa kamu lakukan sekarang:"                     |
| "Anda harus ke dokter segera!" (tanpa konteks) | "Sebaiknya periksa ke dokter dalam 24 jam, karena [alasan singkat]."                  |
| Persentase kemungkinan penyakit                | Tidak ada angka kemungkinan penyakit                                                  |
| Nama obat/dosis                                | "Tanyakan ke dokter atau apoteker."                                                   |

Aturan tambahan:

- Sapaan mengikuti preferensi nada (`santai`/`formal`) bila dikirim; UI saat ini konsisten memakai "kamu" di halaman utama dan "Anda" di sebagian teks chat.
- Kalimat pendek, satu ide per kalimat; hindari istilah medis tanpa penjelasan.
- Jangan melabeli pengguna ("Kamu mengidap kecemasan"). Gunakan kalimat berbasis pengalaman ("Banyak orang merasakan…").
- Selalu akhiri dengan langkah konkret.
- Skrining mental: label jelas **"alat bantu refleksi, bukan diagnosis."**
- Pesan error: tenang dan memberi jalan keluar ("Kami belum bisa memproses sekarang. Coba lagi, atau periksa ke puskesmas bila keluhan berlanjut.").

### Disclaimer standar

> TenangCek adalah alat bantu informasi dan tidak menggantikan diagnosis, perawatan, atau nasihat tenaga kesehatan profesional.

---

## 7. Pola Interaksi Khusus

| Situasi                                    | Perilaku UI aktual                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Red flag fisik                             | `checkRedFlags` memotong panggilan AI → `RedFlagAlert` di atas hasil + tindakan darurat |
| Tanda krisis mental                        | Tidak dideteksi otomatis; `/crisis` tersedia dari Navbar/Footer dan tautan `RedFlagAlert` |
| Kecemasan tinggi                           | Nada lebih menenangkan; `BreathingExercise` ditawarkan bila skor ≥ 4               |
| Guest                                      | Riwayat di perangkat; dashboard menjelaskan bahwa data tidak disimpan ke akun       |
| Persetujuan simpan data                    | `ConsentCard` di dashboard; bahasa sederhana, bisa ditolak tanpa kehilangan fitur inti |
| Login + riwayat tamu                       | Banner "Ada N pengecekan dari perangkat ini" → "Simpan ke akun" (otomatis bila izin sudah aktif) |
| Logout                                     | Cache riwayat/surat milik akun dibersihkan; dashboard menampilkan skeleton lalu data tamu (bukan jejak akun) |
| Gemini tidak tersedia                      | `ResultCard` menampilkan catatan "Penjelasan dari panduan standar TenangCek"; chat memakai jawaban fallback dengan catatan tenang |
| Hapus data                                 | `DeleteAccountCard` dengan konfirmasi; hasil terlihat ("Akun dan datamu sudah dihapus") |
| Hasil Google vs TenangCek (usability test) | Tidak perlu di UI produk; ditangani di protokol penelitian                          |

---

## 8. Checklist Review Desain

- [ ] Level urgensi tampil paling atas dan terbaca tanpa warna.
- [ ] Maksimal 3 langkah berikutnya.
- [ ] Tidak ada nama penyakit seram (kecuali relevan dengan red flag), persentase, atau obat/dosis.
- [ ] Konteks kecemasan tidak terkesan meremehkan.
- [ ] Jalur Hemat terlihat dan konkret.
- [ ] Disclaimer terlihat.
- [ ] Composer chat tumbuh saat teks panjang dan menyusut setelah dikirim.
- [ ] Kontras, fokus keyboard, reduced-motion teruji.
- [ ] Layar darurat/krisis teruji di ponsel.
