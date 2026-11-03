import { withUserContext } from '@/lib/db/withUserContext';

/**
 * Akses tabel `profiles` (docs/database.md §3.1).
 *
 * Semua fungsi menerima `userId` dari token yang sudah diverifikasi, lalu
 * dijalankan lewat `withUserContext` supaya policy RLS ikut menyaring baris.
 */

export interface ConsentState {
  consentHealthData: boolean;
  consentAt: string | null;
}

function toConsentState(row: { consentHealthData: boolean; consentAt: Date | null }): ConsentState {
  return {
    consentHealthData: row.consentHealthData,
    consentAt: row.consentAt ? row.consentAt.toISOString() : null,
  };
}

export async function getConsent(userId: string): Promise<ConsentState | null> {
  return withUserContext(userId, async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { id: userId },
      select: { consentHealthData: true, consentAt: true },
    });

    return profile ? toConsentState(profile) : null;
  });
}

/**
 * Ubah izin penyimpanan data kesehatan.
 *
 * `consent_at` TIDAK pernah dikirim dari sini: trigger `sync_consent_at`
 * mengisinya di database, sehingga client tidak bisa memalsukan waktunya.
 * Upsert dipakai karena pengguna lama bisa saja belum punya baris profil.
 */
export async function setConsent(userId: string, consent: boolean): Promise<ConsentState> {
  return withUserContext(userId, async (tx) => {
    const profile = await tx.profile.upsert({
      where: { id: userId },
      create: { id: userId, consentHealthData: consent },
      update: { consentHealthData: consent },
      select: { consentHealthData: true, consentAt: true },
    });

    return toConsentState(profile);
  });
}
