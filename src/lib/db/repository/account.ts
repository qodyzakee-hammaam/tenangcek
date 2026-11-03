import { withUserContext } from '@/lib/db/withUserContext';

/**
 * Penghapusan seluruh data milik satu pengguna (docs/database.md §6).
 *
 * Dilakukan eksplisit lewat Prisma (sebagai `authenticated` + RLS) supaya
 * penghapusan tetap berjalan benar walau foreign key cascade di database
 * berubah. `DELETE /api/account/delete` tetap memanggil `auth.admin.deleteUser`
 * setelah ini agar akun login-nya juga hilang.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.diaryEntry.deleteMany({ where: { userId } });
    await tx.checkin.deleteMany({ where: { userId } });
    await tx.symptomSession.deleteMany({ where: { userId } });
    await tx.profile.deleteMany({ where: { id: userId } });
  });
}
