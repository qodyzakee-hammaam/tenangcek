import { Prisma } from '@/lib/db/prisma';
import { withUserContext } from '@/lib/db/withUserContext';
import type { UrgencyLevelDb } from '@/types/database';

/**
 * Penyimpanan sesi triage (docs/database.md §3.3).
 *
 * Catatan keamanan:
 * - `rule_floor` disimpan terpisah dari `urgency_level` agar audit
 *   `final_urgency >= rule_floor` bisa dilakukan tanpa menghitung ulang AI.
 * - Teks pemicu krisis tidak disimpan; hanya penanda `red_flag_triggered`.
 */

export interface SaveTriageInput {
  symptoms: Prisma.InputJsonValue;
  answers: Prisma.InputJsonValue;
  urgencyLevel: UrgencyLevelDb;
  reasoning: string;
  nextSteps: Prisma.InputJsonValue;
  ruleFloor: UrgencyLevelDb | null;
  redFlagTriggered: boolean;
  result: Prisma.InputJsonValue;
  anxietyBefore: number | null;
}

export interface SavedTriageSession {
  sessionId: string;
  checkinSaved: boolean;
}

export async function saveTriageSession(
  userId: string,
  input: SaveTriageInput
): Promise<SavedTriageSession> {
  const sessionId = await withUserContext(userId, async (tx) => {
    const session = await tx.symptomSession.create({
      data: {
        userId,
        symptoms: input.symptoms,
        answers: input.answers,
        urgencyLevel: input.urgencyLevel,
        reasoning: input.reasoning,
        nextSteps: input.nextSteps,
        ruleFloor: input.ruleFloor,
        redFlagTriggered: input.redFlagTriggered,
        result: input.result,
      },
      select: { id: true },
    });

    return session.id;
  });

  const anxietyBefore = input.anxietyBefore;
  if (anxietyBefore === null) {
    return { sessionId, checkinSaved: false };
  }

  // Transaksi terpisah: kegagalan check-in tidak boleh membatalkan sesi yang
  // sudah tersimpan (pengguna tetap butuh hasil triage-nya).
  try {
    await withUserContext(userId, async (tx) => {
      await tx.checkin.create({
        data: { userId, sessionId, anxietyBefore },
      });
    });
    return { sessionId, checkinSaved: true };
  } catch {
    return { sessionId, checkinSaved: false };
  }
}
