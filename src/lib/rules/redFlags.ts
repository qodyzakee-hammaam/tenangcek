import { RedFlagRule, RedFlagCheckResult, SymptomPayload } from '@/types/triage';

/**
 * Red Flag Rules (Rule-Based Emergency Detector)
 * Aturan baku deterministik untuk memotong alur cek gejala saat terdeteksi tanda bahaya.
 * Sesuai Dokumen IMK Halaman 2 (Fitur 2) & Halaman 5 (Keamanan dan Batasan Etika).
 */
export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'chest_pain_acute',
    keywords: ['nyeri dada', 'dada tertekan', 'dada sakit menjalar', 'sesak dan dada'],
    description: 'Nyeri dada hebat seperti tertekan atau menjalar ke leher/lengan/punggung.',
    severity: 'darurat',
    action: 'Segera ke IGD terdekat. Jangan menyetir sendiri.',
  },
  {
    id: 'severe_breathlessness',
    keywords: ['sesak napas berat', 'sulit bernapas', 'napas berbunyi keras', 'bibir membiru', 'tidak bisa bernapas'],
    description: 'Kesulitan bernapas berat atau tidak dapat berbicara satu kalimat penuh.',
    severity: 'darurat',
    action: 'Segera ke IGD terdekat. Posisi duduk tegak dan longgarkan pakaian.',
  },
  {
    id: 'stroke_signs',
    keywords: ['lemas sebelah', 'bicara pelo', 'mulut miring', 'mati rasa separuh', 'kebas mendadak'],
    description: 'Kelemahan tiba-tiba pada satu sisi wajah, tangan, atau kaki (tanda FAST).',
    severity: 'darurat',
    action: 'Segera bawa ke rumah sakit dengan fasilitas stroke/IGD dalam hitungan menit.',
  },
  {
    id: 'meningismus',
    keywords: ['leher kaku', 'kaku kuduk', 'demam leher kaku', 'silau dan sakit kepala berat'],
    description: 'Demam disertai leher kaku tidak bisa menunduk dan sensitif cahaya.',
    severity: 'darurat',
    action: 'Segera periksakan ke IGD untuk evaluasi infeksi saraf atau selaput otak.',
  },
  {
    id: 'thunderclap_headache',
    keywords: ['sakit kepala terhebat seumur hidup', 'sakit kepala mendadak parah', 'nyeri kepala petir'],
    description: 'Sakit kepala hebat luar biasa yang memuncak dalam hitungan detik.',
    severity: 'darurat',
    action: 'Segera cari pertolongan medis darurat di IGD.',
  },
  {
    id: 'severe_anaphylaxis',
    keywords: ['lidah bengkak', 'tenggorokan menyempit', 'alergi sesak', 'bibir bengkak sesak'],
    description: 'Reaksi alergi berat disertai pembengkakan saluran napas.',
    severity: 'darurat',
    action: 'Gunakan injektor epinefrin bila ada dan langsung menuju IGD.',
  },
  {
    id: 'loss_of_consciousness',
    keywords: ['pingsan', 'hilang kesadaran', 'linglung berat', 'tidak merespon'],
    description: 'Penurunan kesadaran mendadak atau kebingungan berat.',
    severity: 'darurat',
    action: 'Segera bawa ke faskes darurat terdekat.',
  },
];

/**
 * Fungsi deterministik untuk mengecek apakah gejala user memicu Red Flag
 */
export function checkRedFlags(payload: SymptomPayload): RedFlagCheckResult {
  const combinedText = [
    payload.mainSymptom,
    ...(payload.accompanyingSymptoms || []),
    payload.duration || '',
  ]
    .join(' ')
    .toLowerCase();

  for (const rule of RED_FLAG_RULES) {
    const matched = rule.keywords.some((keyword) => combinedText.includes(keyword.toLowerCase()));
    if (matched) {
      return {
        hasRedFlag: true,
        matchedRule: rule,
        emergencyMessage: `${rule.description} Tindakan: ${rule.action}`,
      };
    }
  }

  return { hasRedFlag: false };
}
