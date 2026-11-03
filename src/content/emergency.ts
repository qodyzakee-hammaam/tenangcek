/**
 * Satu-satunya sumber nomor darurat (AGENTS.md §2.13).
 * Jangan menulis nomor darurat langsung di komponen lain.
 *
 * TODO(verify): verifikasi ulang nomor dan cakupan layanan ke sumber resmi
 * (Kemenkes / layanan darurat nasional) sebelum rilis.
 */

export interface EmergencyContact {
  id: 'medical' | 'mental_health';
  label: string;
  number: string;
  tel: string;
  description: string;
}

export const EMERGENCY_CONTACTS: readonly EmergencyContact[] = [
  {
    id: 'medical',
    label: 'Kedaruratan medis',
    number: '119',
    tel: '119',
    description: 'Untuk kondisi yang mengancam nyawa dan butuh pertolongan segera.',
  },
  {
    id: 'mental_health',
    label: 'Bantuan krisis kesehatan jiwa',
    number: '119 ext. 8',
    tel: '119',
    description: 'Pendampingan awal saat muncul pikiran menyakiti diri atau berada dalam krisis.',
  },
] as const;

export const PRIMARY_EMERGENCY_CONTACT: EmergencyContact = EMERGENCY_CONTACTS[0];

/** Teks pengingat yang dipakai di banner dan halaman krisis. */
export const EMERGENCY_REMINDER =
  'Jika kamu merasa tidak aman untuk dirimu sendiri atau orang lain, hubungi bantuan darurat sekarang.';
