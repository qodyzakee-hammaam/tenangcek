# product.md — TenangCek

> Dokumen ini menjawab: **aplikasi apa yang ingin dibuat dan untuk siapa.**
> Sumber: Rangkuman Konsep Project IMK "TenangCek" (v2).

---

## 1. Ringkasan

**TenangCek** adalah web app _AI Health & Mental Wellbeing Triage Companion_. Aplikasi membantu pengguna memutuskan **langkah berikutnya dengan tenang**, tanpa harus menebak nama penyakit.

Pertanyaan yang dijawab TenangCek bukan "Saya sakit apa?", melainkan:

> "Saya harus ngapain sekarang, seberapa cepat, dan ke mana yang paling terjangkau?"

**Konsep alur utama:**
`Ceritakan gejala → Triage urgensi → Pahami (termasuk peran kecemasan) → Ambil langkah yang terjangkau → Pantau perkembangan`

Konteks: proyek mata kuliah **Interaksi Manusia dan Komputer (IMK)**. Kekuatan proyek ada pada **desain feedback AI**, bukan pada kecanggihan model.

---

## 2. Masalah

- Mencari gejala di Google sering menampilkan kemungkinan terburuk (mis. kanker) sehingga memicu kecemasan berlebih.
- Kecemasan sendiri dapat menimbulkan gejala fisik (jantung berdebar, sesak, pusing, nyeri perut) yang kemudian dibaca sebagai bukti penyakit serius.
- Banyak orang tidak tahu kapan gejala cukup dipantau di rumah dan kapan harus segera ke fasilitas kesehatan.
- Konsultasi dokter/psikolog berbayar relatif mahal dan tenaga kesehatan jiwa tidak merata, sehingga orang menunda, memeriksa berulang, atau mencari tahu sendiri.
- Informasi internet berbentuk daftar penyakit, bukan panduan tindakan yang jelas dan terjangkau.

**Lingkaran masalah:**
`Muncul gejala → Cari di Google → Hasil menakutkan → Cemas naik → Gejala terasa kuat → Cek berulang / menghindar → (kembali ke awal)`

**Problem statement:**
Orang dengan keluhan ringan yang dipicu atau diperparah kecemasan terjebak antara memeriksa berulang (boros biaya dan waktu) dan menunda (berisiko terlambat), karena tidak punya panduan yang jelas, tenang, dan terjangkau untuk memutuskan langkah berikutnya.

### Data pendukung (verifikasi ke sumber primer sebelum laporan akhir)

| Aspek                  | Temuan                                                                                                             | Sumber                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Beban mental anak muda | Depresi paling tinggi di usia 15–24 tahun; hanya 10,4% yang mencari pengobatan                                     | Kemenkes, SKI 2023                 |
| Kesenjangan pengobatan | 12,7% penyintas depresi usia 15+ berobat dalam 2 minggu terakhir (87,3% tidak)                                     | SKI 2023 (olahan GoodStats)        |
| Remaja                 | ±34,9% remaja 10–17 tahun punya ≥1 masalah kesehatan mental dalam 12 bulan; 5,5% memenuhi kriteria gangguan mental | I-NAMHS (dikutip jurnal Untar)     |
| Tenaga kesehatan jiwa  | Rasio psikiater ±1:200.000 (ada yang menyebut 1:250.000) vs standar WHO 1:30.000                                   | Kemenkes; Info Singkat DPR RI 2023 |
| Pemerataan layanan     | Distribusi belum merata; ±91% penderita depresi disebut tidak menjalani pengobatan medis                           | Info Singkat DPR RI 2023           |
| Biaya                  | Psikolog mandiri ratusan ribu hingga jutaan rupiah/sesi; BPJS menanggung layanan jiwa via FKTP + rujukan           | Halodoc; CNN Indonesia             |
| Cari gejala online     | Remaja/dewasa muda pengguna internet terbanyak; 66% responden remaja cyberchondria sedang                          | APJII 2023; studi UIN Suska        |
| Self-diagnosis         | 83,3% dari 160 mahasiswa melakukan self-diagnosis (konteks COVID-19, skala kecil)                                  | Skripsi UIN SGD                    |

> **Catatan kejujuran data:** belum ada angka nasional yang spesifik mengukur biaya pemeriksaan berulang akibat health anxiety. Bagian ini diposisikan sebagai **hipotesis** dan divalidasi lewat survei kecil (10–15+ responden).

---

## 3. SDG yang Relevan

| SDG                                             | Relevansi                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **SDG 3 – Good Health and Well-being** (utama)  | Akses informasi kesehatan tepat, keputusan berobat tepat waktu (target 3.8), pencegahan dan kesejahteraan mental (target 3.4). |
| **SDG 10 – Reduced Inequalities** (utama kedua) | Kesenjangan biaya, geografis, dan literasi. TenangCek memberi panduan gratis dan rekomendasi yang sadar biaya.                 |

**Argumen kesenjangan:**

- **Biaya:** yang mampu bisa konsultasi berulang untuk menenangkan diri; yang tidak mampu menunda atau mencari sendiri.
- **Geografis:** psikiater/psikolog klinis terpusat di kota besar; banyak puskesmas belum punya tenaga kesehatan jiwa.
- **Literasi:** banyak orang belum tahu jalur murah yang sudah ada (puskesmas/FKTP, BPJS, rujukan) dan kapan memakainya.

---

## 4. Tujuan Produk

1. Mengubah pengalaman cek gejala dari "apa penyakit saya?" menjadi "apa langkah saya selanjutnya?".
2. Memberi level urgensi yang jelas dan mudah ditindaklanjuti.
3. Membantu pengguna mengenali peran kecemasan pada gejala **tanpa meremehkan keluhan fisik**.
4. Memberi rekomendasi langkah terjangkau (puskesmas, BPJS, telekonsultasi).
5. Membantu pengguna menyiapkan diri sebelum bertemu tenaga kesehatan.
6. Meneliti bagaimana feedback AI pada topik sensitif sebaiknya dirancang agar dipercaya dan tidak membebani.

---

## 5. Target Pengguna

**Primary:** mahasiswa dan dewasa muda yang aktif mencari gejala di internet dan mudah cemas soal kesehatan.

| Persona                                                  | Kebutuhan utama                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Si Cemas** — overthinking setelah membaca hasil Google | Kepastian tentang seberapa mendesak kondisinya, dengan bahasa menenangkan |
| **Si Bingung** — tidak tahu harus ke mana dan kapan      | Panduan jelas: langkah, jenis faskes, waktu yang disarankan               |
| **Si Menunda** — cenderung mengabaikan gejala            | Pengingat dan alasan konkret kapan gejala perlu diperiksa                 |

---

## 6. Fitur MVP (status implementasi)

| #   | Fitur                  | Fungsi                                                                                                           | Status |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Symptom Check-in       | Lima langkah: gejala, durasi, keparahan, gejala penyerta, check-in kecemasan                                     | **Sudah** |
| 2   | Red Flag Detector      | Tujuh aturan tetap (nyeri dada, sesak berat, tanda stroke, leher kaku, nyeri kepala petir, anafilaksis, pingsan); memotong panggilan AI dan menampilkan peringatan darurat | **Sudah** |
| 3   | Urgency Triage         | Menentukan 1 dari 4 level urgensi + langkah yang disarankan; Gemini dengan fallback rule-based                   | **Sudah** |
| 4   | Penjelasan Hasil       | Alasan singkat "kenapa saya dapat hasil ini", dengan catatan bila penjelasan berasal dari panduan standar        | **Sudah** |
| 5   | Kemungkinan Umum       | Penyebab paling lazim lebih dulu, bukan daftar penyakit seram; bisa dilipat                                    | **Sudah** |
| 6   | Anxiety Awareness      | Check-in kecemasan sebelum & sesudah hasil, pesan penenang, edukasi bahwa cemas bisa memperkuat gejala           | **Sebagian** — belum ada skrining terpisah |
| 7   | Calm Support           | Latihan napas 4–4–6 yang bisa dijeda; muncul saat disarankan atau cemas ≥ 4                                     | **Sudah** |
| 8   | Jalur Hemat            | Rekomendasi faskes per level + catatan BPJS/rujukan dari `content/costPath.ts`                                   | **Sudah** — belum dipersonalisasi per kota/BPJS pengguna |
| 9   | Crisis Safety Net      | Halaman `/crisis` statis berisi kontak bantuan dan langkah awal                                                  | **Sebagian** — tidak ada deteksi krisis otomatis |
| 10  | Ringkasan untuk Dokter | Ringkasan + 3 pertanyaan (modal) dan surat konsultasi yang bisa disalin/dicetak                                  | **Sudah** |
| 11  | Symptom Diary          | Catatan gejala + keparahan harian; tamu di `sessionStorage`, akun di database; hapus per entri atau semua | **Sudah** — mood belum di form, pengingat eskalasi belum ada |
| 12  | Riwayat Pengecekan     | Timeline berkelanjutan untuk akun; filter tanggal (preset/rentang), jam lokal, dan urgensi; impor titipan tamu dari Profil | **Sudah** |
| 13  | Chat Lanjutan          | Tanya jawab kontekstual setelah hasil, streaming, fallback lokal saat Gemini sibuk                               | **Sudah** |
| 14  | Personalisasi Profil   | Skema menyimpan rentang usia, kondisi, alergi, preferensi nada/detail; halaman Profil untuk akun & privasi      | **Sebagian** — form personalisasi belum ada |

### Scope

| Masuk MVP                                                                                                                                                                                          | Jangan dulu                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check-in gejala, red flag, triage 4 level, penjelasan hasil, ringkasan dokter, riwayat, chat lanjutan, diary sederhana. **Pilihan cepat dibatasi 6 gejala umum** (sakit kepala, demam, batuk & pilek, nyeri perut, pusing, mual). | Diagnosis penyakit, rekomendasi obat, upload hasil lab/foto, integrasi rekam medis, telemedicine, deteksi emosi kompleks, fitur production-scale. |

---

## 7. User Flow (sesuai aplikasi saat ini)

1. Pengguna membuka `/` (landing) lalu memilih **Mulai cek gejala** → `/checkin`. Login **tidak wajib**; `/auth` tersedia kapan saja untuk masuk/daftar.
2. Di `/checkin`, pengguna menjawab **5 langkah**: gejala utama → durasi → keparahan → gejala penyerta (opsional) → check-in kecemasan 1–5. Kartu "Pengecekan terakhir" tampil sebagai konteks bila ada riwayat.
3. Payload dikirim ke `POST /api/triage`.
4. **Red flag check** berjalan lebih dulu. Bila cocok, hasil darurat langsung dibuat, `RedFlagAlert` tampil, dan Gemini tidak dipanggil.
5. Bila tidak ada red flag, Gemini diminta memberi triage JSON; bila Gemini gagal, fallback rule-based dipakai. Safety layer memastikan urgensi tidak turun.
6. Hasil tampil di `ResultCard`: level urgensi → alasan → kemungkinan umum → konteks kecemasan → tanda bahaya → maks. 3 langkah → jalur hemat → ringkasan dokter → check-in sesudah → disclaimer.
7. Dari hasil, pengguna bisa membuka **chat lanjutan** (`InteractiveAiChat`): bertanya bebas, memakai pertanyaan cepat, atau membuka latihan napas.
8. Tombol **Akhiri & Buat Surat Dokter** memanggil `/api/chat/letter` dan menampilkan `DoctorLetterModal` (salin, cetak, simpan). Surat tersimpan ditampilkan di **Profil**.
9. Riwayat:
   - **Tamu** → tidak ada timeline. Hasil cek disimpan sementara di perangkat sebagai titipan yang bisa diimpor setelah masuk.
   - **Login + consent** → tersimpan di database dan tampil sebagai timeline berkelanjutan di `/dashboard`, lengkap dengan filter tanggal, jam, dan urgensi.
   - **Login tanpa consent** → riwayat lama disembunyikan; dashboard mengarahkan ke Profil untuk mengaktifkan izin.
10. Setelah login, pengguna membuka **Profil** untuk melihat titipan riwayat dari perangkat dan menekan **Simpan ke akun**. Impor dikirim bertahap (maks. 20 entri per permintaan) dan hanya berjalan bila consent aktif.
11. Check-in kecemasan sesudah hasil dan catatan harian di `/diary` membantu memantau perkembangan. Diary tamu hilang saat tab ditutup; diary akun tersimpan setelah consent. Setiap catatan bisa dihapus, atau seluruh diary lewat "Hapus semua".
12. Logout dan hapus akun dilakukan dari **Profil**. Logout membersihkan jejak riwayat/surat milik akun dari perangkat; data tamu tidak ikut terhapus.

**Catatan keamanan:** tidak ada pemotongan alur otomatis untuk teks krisis mental. Halaman `/crisis` dapat dibuka dari Navbar, Footer, atau tautan pada peringatan red flag.

---

## 8. Desain Feedback (inti produk)

Hasil ditampilkan sebagai **level urgensi**, bukan daftar penyakit.

| Level               | Arti                                     | Tindakan                           |
| ------------------- | ---------------------------------------- | ---------------------------------- |
| **Darurat**         | Berpotensi mengancam nyawa               | Ke IGD sekarang atau hubungi 119   |
| **Segera**          | Perlu pemeriksaan dalam waktu dekat      | Periksa ke dokter dalam 24 jam     |
| **Terjadwal**       | Perlu dicek, tidak mendesak              | Buat janji dalam beberapa hari     |
| **Pantau di rumah** | Kemungkinan ringan, bisa dirawat mandiri | Pantau dan waspadai tanda eskalasi |

**Struktur kartu hasil:** Level urgensi → Alasan singkat (1–2 kalimat) → Kemungkinan umum (opsional) → Konteks kecemasan (bila relevan) → Tanda bahaya (opsional) → Langkah berikutnya (maks. 1–3) → Jalur hemat → Ringkasan untuk dokter (salin/unduh) → Check-in sesudah → Disclaimer.

Bila penjelasan berasal dari fallback rule-based, kartu menampilkan catatan tenang **"Penjelasan dari panduan standar TenangCek"** dan menegaskan bahwa tingkat urgensi tetap mengikuti aturan keselamatan yang sama.

**Contoh:**

> "Sakit kepala 2 hari tanpa demam atau gangguan penglihatan. Paling sering ini terkait kurang tidur, stres, atau dehidrasi. Level: Pantau di rumah. Segera periksa bila muncul demam tinggi, leher kaku, atau pandangan kabur."

**Prinsip nada bahasa:**

- Validasi tanpa menakut-nakuti: akui kekhawatiran, lalu beri konteks.
- Hindari nama penyakit serius kecuali relevan dengan red flag.
- Jujur soal batas: bukan diagnosis, tidak menggantikan tenaga kesehatan.
- Selalu akhiri dengan langkah konkret, bukan hanya informasi.

---

## 9. Personalisasi (opt-in, minimal)

| Aspek             | Data                                           | Dampak                                                   | Status |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------- | ------ |
| Profil dasar      | Rentang usia, jenis kelamin (opsional)         | Pertanyaan lanjutan lebih sesuai                         | Skema siap; halaman Profil ada, form personalisasi belum |
| Kondisi khusus    | Penyakit kronis, alergi, kehamilan (opsional)  | Ambang urgensi lebih hati-hati                           | Skema siap; form personalisasi belum |
| Gaya komunikasi   | Ringkas/detail; santai/formal                  | Panjang & gaya feedback menyesuaikan                     | Skema siap; dikirim hanya bila payload mengisi |
| Tingkat kecemasan | Check-in 1–5 sebelum & sesudah                 | Nada lebih menenangkan; opsi latihan napas               | **Aktif** |
| Akses & biaya     | Perkiraan biaya (opsional), BPJS, jarak faskes | Rekomendasi jalur hemat yang realistis                   | Sebagian: `uses_bpjs`/`budget_pref` ada di skema, belum dipakai di UI |
| Riwayat gejala    | Catatan sebelumnya (jika setuju)               | Deteksi pola dan eskalasi ("sudah 3 hari tidak membaik") | Riwayat aktif; pengingat eskalasi belum |
| Preferensi faskes | Kota/area, pakai BPJS atau tidak               | Jenis faskes & jalur rujukan relevan                     | Sebagian: `region` ada di skema, belum dipakai |

**Prinsip privasi:** data sensitif disimpan hanya dengan persetujuan jelas, bisa dihapus kapan saja, dan **mode guest tetap tersedia**.

---

## 10. Research Question (fokus IMK)

| RQ  | Pertanyaan                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------- |
| RQ1 | Apakah level urgensi lebih menenangkan dan mudah ditindaklanjuti dibanding daftar kemungkinan penyakit? |
| RQ2 | Bagaimana nada bahasa AI memengaruhi tingkat kecemasan?                                                 |
| RQ3 | Apakah penjelasan alasan meningkatkan kepercayaan?                                                      |
| RQ4 | Bagaimana menyampaikan konteks kecemasan tanpa membuat gejala terasa diremehkan?                        |
| RQ5 | Apakah Jalur Hemat meningkatkan kemauan dan kemampuan mengambil langkah tepat?                          |
| RQ6 | Apakah personalisasi meningkatkan kejelasan dan kenyamanan?                                             |
| RQ7 | Seberapa jelas pengguna memahami kapan harus ke dokter?                                                 |

---

## 11. Metrik Keberhasilan (Usability Testing)

| Metrik                | Cara ukur                                                       |
| --------------------- | --------------------------------------------------------------- |
| Perubahan kecemasan   | Selisih skala 1–5 sebelum dan sesudah                           |
| Pemahaman langkah     | % pengguna yang menyebut tindakan dan waktu dengan benar        |
| Kepercayaan           | Likert 1–5: "saya percaya saran ini"                            |
| Usability             | SUS singkat + waktu penyelesaian task                           |
| Kejelasan Jalur Hemat | Pengguna dapat menyebut faskes dan langkah termurah yang sesuai |

**Prosedur:** skala cemas awal → skenario gejala (mis. sakit kepala 2 hari) → pengguna memakai TenangCek dan menjelaskan langkahnya → skala cemas akhir → (opsional) bandingkan dengan hasil Google (within-subject) → kumpulkan feedback soal kejelasan, kepercayaan, beban informasi, nada bahasa.

**Survei validasi masalah:** 10–15+ responden tentang kebiasaan cari gejala di Google, tingkat cemas setelahnya, frekuensi periksa ke faskes untuk keluhan ringan, dan hambatan biaya.

---

## 12. Risiko Produk

| Risiko                               | Mitigasi                                                              |
| ------------------------------------ | --------------------------------------------------------------------- |
| Urgensi terlalu rendah               | Red flag rule-based, safety layer, bias konservatif pada kasus ambigu |
| Gejala serius dianggap "hanya cemas" | Konteks kecemasan tidak boleh menurunkan urgensi                      |
| Dikira diagnosis                     | Disclaimer jelas, tanpa diagnosis, skrining berlabel refleksi         |
| Pengguna dalam krisis mental         | Halaman `/crisis` dengan kontak bantuan; belum ada deteksi otomatis — perlu ditambahkan sebelum rilis publik |
| Privasi data kesehatan/mental        | Mode guest, persetujuan eksplisit, RLS, hapus data                    |
| Kelebihan informasi                  | Maks. 1–3 langkah, urgensi dulu, detail opsional                      |
| Data latar belakang lemah            | Sumber primer + survei mini; tandai hipotesis                         |
| Free tier terbatas                   | Batasi panjang percakapan, anggaran waktu, dan cooldown per model Gemini |
| Scope terlalu besar                  | Fokus 6 gejala cepat + fitur inti                                     |
| API key terekspos                    | Simpan di server env var                                              |
| Hasil AI terlalu rendah              | Red flag rule-based, safety layer, fallback konservatif               |

---

## 13. Disclaimer produk

> TenangCek adalah alat bantu informasi dan tidak menggantikan diagnosis, perawatan, atau nasihat tenaga kesehatan profesional.

---

## 14. Status Implementasi & Batasan Saat Ini

**Sudah berjalan**

- Alur guest penuh: cek gejala 5 langkah → hasil → chat lanjutan → surat dokter.
- Red flag rule-based (7 aturan) yang memotong panggilan Gemini.
- Triage 4 level dengan Gemini structured output + fallback rule-based + safety layer.
- Riwayat tamu sebagai titipan di perangkat; riwayat akun di database dengan timeline + filter; impor titipan dari Profil setelah login + consent.
- Login/daftar, consent, halaman Profil, hapus akun, diary (tambah/hapus), dashboard, latihan napas.
- Navigasi bawah khusus ponsel: Riwayat · Diary · Cek · Profil.
- Chat streaming responsif dengan composer yang tumbuh mengikuti panjang ketikan.

**Sebagian / belum**

- Deteksi krisis mental otomatis belum ada; `/crisis` masih halaman statis.
- Halaman Profil sudah ada untuk akun, privasi, dan impor; form personalisasi (usia, kondisi, alergi) belum tersedia.
- Pengingat eskalasi dan analisis pola gejala belum diimplementasikan.
- Diary belum menampilkan input mood; hapus entri sudah tersedia.
- Rate limit aplikasi belum ada; perlindungan berasal dari batas panjang, anggaran waktu, dan cooldown Gemini.

**Ketergantungan eksternal**

- Kualitas jawaban AI bergantung pada kuota Gemini free tier. Saat kuota habis atau model sedang sibuk, aplikasi memakai fallback lokal dan memberi tahu pengguna dengan tenang.
- Nomor darurat di `src/content/emergency.ts` masih perlu diverifikasi sebelum rilis publik (ada penanda `TODO(verify)`).
