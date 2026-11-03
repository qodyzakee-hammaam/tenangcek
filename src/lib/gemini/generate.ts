import type { TriageResult, SymptomPayload } from '@/types/triage';
import { getGeminiClient } from '@/lib/gemini/client';
import { TENANGCEK_SYSTEM_PROMPT, buildTriagePrompt } from '@/lib/gemini/prompts';
import { TRIAGE_JSON_SCHEMA } from '@/lib/gemini/schemas';
import {
  GeminiUnavailableError,
  TRIAGE_BUDGET,
  TRIAGE_MODEL_LADDER,
  attemptTimeout,
  availableModels,
  cooldownError,
  markModelFailed,
  markModelHealthy,
  readErrorStatus,
  readErrorMessage,
} from '@/lib/gemini/resilience';

export { GeminiUnavailableError };

async function requestTriage(
  model: string,
  payload: SymptomPayload,
  timeoutMs: number
): Promise<TriageResult> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: TENANGCEK_SYSTEM_PROMPT }, { text: buildTriagePrompt(payload) }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: TRIAGE_JSON_SCHEMA,
      temperature: 0.2, // Rendah untuk stabilitas & konsistensi medis
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });

  const rawText = response.text || '{}';
  return JSON.parse(rawText) as TriageResult;
}

export async function generateTriage(payload: SymptomPayload): Promise<TriageResult> {
  const deadline = Date.now() + TRIAGE_BUDGET.totalMs;
  const models = availableModels(TRIAGE_MODEL_LADDER);

  // Semua model sedang dijeda (kuota habis / gangguan berulang): jangan buat
  // pengguna menunggu untuk kegagalan yang sudah diketahui. Hasil rule-based
  // tetap aman dan urgensi tetap dijaga safety layer.
  if (models.length === 0) throw cooldownError();

  let lastError: unknown = null;
  let attempts = 0;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    const timeoutMs = attemptTimeout(TRIAGE_BUDGET, deadline, index === models.length - 1);
    if (timeoutMs === null) break;

    attempts += 1;
    const startedAt = Date.now();

    try {
      const result = await requestTriage(model, payload, timeoutMs);
      markModelHealthy(model);
      return result;
    } catch (error) {
      lastError = error;
      markModelFailed(model, error, Date.now() - startedAt);
      // Satu percobaan per model: 429/503/timeout tidak diulang pada model yang
      // sama, karena hanya menambah pemakaian kuota dan waktu tunggu pengguna.
    }
  }

  if (attempts === 0) throw cooldownError();

  throw new GeminiUnavailableError(
    readErrorMessage(lastError),
    readErrorStatus(lastError),
    attempts
  );
}
