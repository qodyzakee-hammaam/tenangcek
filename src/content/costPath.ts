import type { UrgencyLevel } from '@/types/triage';

/**
 * Ringkasan Jalur Hemat per level urgensi.
 *
 * TODO(verify): rincian peran FKTP, alur rujukan, dan cakupan BPJS perlu
 * diverifikasi ke sumber resmi (BPJS Kesehatan / Kemenkes) sebelum rilis.
 * Teks di sini sengaja umum dan tidak menjanjikan cakupan tertentu.
 */

export interface CostPathInfo {
  facilityType: 'puskesmas_fktp' | 'klinik' | 'rs_igd' | 'telekonsultasi' | 'self_care';
  facilityLabel: string;
  summary: string;
  bpjsNote: string | null;
}

export const COST_PATH_BY_URGENCY: Record<UrgencyLevel, CostPathInfo> = {
  darurat: {
    facilityType: 'rs_igd',
    facilityLabel: 'IGD rumah sakit terdekat',
    summary: 'Untuk kondisi darurat, biaya bukan prioritas pertama. Datang ke IGD terdekat sekarang.',
    bpjsNote:
      'Bawa kartu BPJS/KIS bila ada. Petugas IGD akan menjelaskan alur administrasi setelah kondisi stabil.',
  },
  segera: {
    facilityType: 'puskesmas_fktp',
    facilityLabel: 'Puskesmas atau klinik terdekat',
    summary: 'Pemeriksaan dalam 24 jam bisa dimulai dari puskesmas atau klinik terdekat.',
    bpjsNote:
      'Puskesmas/FKTP umumnya menjadi pintu masuk layanan BPJS. Konfirmasi jam layanan dan alur rujukan ke faskes tujuan.',
  },
  terjadwal: {
    facilityType: 'puskesmas_fktp',
    facilityLabel: 'Puskesmas, klinik, atau telekonsultasi',
    summary: 'Tidak mendesak, tapi perlu dicek dalam beberapa hari. Pilih faskes yang paling mudah dijangkau.',
    bpjsNote:
      'Jika memakai BPJS, mulai dari FKTP tempat kamu terdaftar. Rujukan ke faskes lanjutan mengikuti aturan yang berlaku.',
  },
  pantau_di_rumah: {
    facilityType: 'self_care',
    facilityLabel: 'Rawat mandiri sambil memantau',
    summary: 'Cukup pantau di rumah bila tidak ada tanda bahaya. Catat perubahan gejala setiap hari.',
    bpjsNote:
      'Bila gejala tidak membaik atau memburuk, periksa ke FKTP/puskesmas. Simpan catatan gejala agar pemeriksaan lebih singkat.',
  },
};

export const COST_PATH_DISCLAIMER =
  'Pilih faskes sesuai domisili dan kepesertaanmu. Detail biaya dan rujukan berbeda tiap daerah — konfirmasi langsung ke faskes.';
