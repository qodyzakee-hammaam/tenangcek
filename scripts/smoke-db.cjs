/**
 * Smoke test database (Prisma + RLS + gerbang consent).
 *
 * PERHATIAN: skrip ini menulis ke project Supabase asli dan membuat akun uji
 * sementara (dibersihkan di akhir). Jalankan hanya dengan kesadaran penuh:
 *
 *   1. `npm run dev` (server harus hidup di localhost:3000)
 *   2. `npm run test:smoke`
 *
 * Tidak dijalankan otomatis di CI. Jangan menambahkan data pengguna nyata.
 */
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const { Client } = require('pg');

const BASE = 'http://localhost:3000';
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  // Detail hanya ditampilkan saat gagal agar log tidak memuat isi data kesehatan.
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass || !detail ? '' : ' :: ' + detail));
}

async function admin(pathname, init = {}) {
  const res = await fetch(`${URL_SB}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

async function createUser(tag) {
  const email = `tenangcek.e2e.${tag}.${Date.now()}@example.com`;
  const password = 'E2eTest!' + Math.random().toString(36).slice(2, 10);
  const r = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (r.status >= 300) throw new Error('create user gagal: ' + JSON.stringify(r.json));
  return { id: r.json.id, email, password };
}

async function signIn(user) {
  const res = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('signin gagal: ' + JSON.stringify(json));
  return json.access_token;
}

async function api(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

(async () => {
  const db = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  let userA = null;
  let userB = null;
  let userC = null;

  try {
    // ---------- guest ----------
    const guestDiary = await api('/api/diary');
    check('guest GET /api/diary -> mode guest', guestDiary.status === 200 && guestDiary.json.mode === 'guest');
    const guestPost = await api('/api/diary', { method: 'POST', body: { note: 'tes', severity: 2 } });
    check('guest POST /api/diary -> 401', guestPost.status === 401);
    const guestConsent = await api('/api/profile/consent');
    check('guest GET consent -> 401', guestConsent.status === 401);
    const guestHistory = await api('/api/triage/history');
    check(
      'guest GET history -> mode guest',
      guestHistory.status === 200 && guestHistory.json.mode === 'guest' && Array.isArray(guestHistory.json.data) && guestHistory.json.data.length === 0
    );
    const guestImport = await api('/api/triage/history/import', {
      method: 'POST',
      body: { items: [{ symptomName: 'tes', reasoning: 'tes', urgencyLevel: 'pantau_di_rumah' }] },
    });
    check('guest POST history import -> 401', guestImport.status === 401);

    // ---------- user A ----------
    userA = await createUser('a');
    const tokenA = await signIn(userA);

    const profileRow = await db.query('select id, consent_health_data from public.profiles where id = $1', [userA.id]);
    check('trigger handle_new_user membuat profil', profileRow.rowCount === 1 && profileRow.rows[0].consent_health_data === false);

    const historyBeforeConsent = await api('/api/triage/history', { token: tokenA });
    check(
      'GET history tanpa consent -> consent_required',
      historyBeforeConsent.status === 200 && historyBeforeConsent.json.mode === 'consent_required' && historyBeforeConsent.json.data.length === 0
    );

    const consentBefore = await api('/api/profile/consent', { token: tokenA });
    check('GET consent default false', consentBefore.status === 200 && consentBefore.json.data.consentHealthData === false, JSON.stringify(consentBefore.json));

    const diaryBlocked = await api('/api/diary', { method: 'POST', token: tokenA, body: { note: 'sebelum izin' } });
    check('POST diary tanpa consent -> 403', diaryBlocked.status === 403 && diaryBlocked.json.error.code === 'consent_required', JSON.stringify(diaryBlocked.json));

    const triageBlocked = await api('/api/triage', { method: 'POST', token: tokenA, body: { mainSymptom: 'sakit kepala', anxietyBefore: 3 } });
    check('triage tanpa consent tidak menulis DB', triageBlocked.status === 200 && triageBlocked.json.meta.persisted === false && triageBlocked.json.meta.reason === 'consent_required', JSON.stringify(triageBlocked.json.meta));

    const consentOn = await api('/api/profile/consent', { method: 'PATCH', token: tokenA, body: { consent: true } });
    check('PATCH consent true + consent_at terisi', consentOn.status === 200 && consentOn.json.data.consentHealthData === true && Boolean(consentOn.json.data.consentAt), JSON.stringify(consentOn.json));

    const diaryCreated = await api('/api/diary', { method: 'POST', token: tokenA, body: { note: 'kepala sedikit sakit', severity: 2 } });
    check('POST diary dengan consent -> 201', diaryCreated.status === 201 && diaryCreated.json.success === true, JSON.stringify(diaryCreated.json));

    const diaryList = await api('/api/diary', { token: tokenA });
    check('GET diary milik sendiri', diaryList.status === 200 && diaryList.json.mode === 'account' && diaryList.json.data.length === 1);

    const triageOk = await api('/api/triage', { method: 'POST', token: tokenA, body: { mainSymptom: 'sakit kepala', duration: '1 hari', severity: 'ringan', anxietyBefore: 4 } });
    const sessionId = triageOk.json?.meta?.sessionId;
    check('triage dengan consent tersimpan', triageOk.status === 200 && triageOk.json.meta.persisted === true && Boolean(sessionId), JSON.stringify(triageOk.json.meta));

    const dbSession = await db.query('select user_id, urgency_level, rule_floor, red_flag_triggered, symptoms, answers from public.symptom_sessions where id = $1', [sessionId]);
    check('baris symptom_sessions sesuai', dbSession.rowCount === 1 && dbSession.rows[0].user_id === userA.id, JSON.stringify(dbSession.rows[0]));
    const dbCheckin = await db.query('select anxiety_before from public.checkins where session_id = $1', [sessionId]);
    check('check-in awal ikut tersimpan', dbCheckin.rowCount === 1 && dbCheckin.rows[0].anxiety_before === 4, JSON.stringify(dbCheckin.rows));

    const historyWithConsent = await api('/api/triage/history', { token: tokenA });
    check(
      'GET history dengan consent -> account',
      historyWithConsent.status === 200 &&
        historyWithConsent.json.mode === 'account' &&
        historyWithConsent.json.data.some((item) => item.id === sessionId)
    );

    const countBeforeImport = await db.query('select count(*)::int as n from public.symptom_sessions where user_id = $1', [userA.id]);
    const importRes = await api('/api/triage/history/import', {
      method: 'POST',
      token: tokenA,
      body: {
        items: [
          {
            symptomName: 'sakit kepala (dari perangkat)',
            duration: '1–2 hari',
            urgencyLevel: 'pantau_di_rumah',
            reasoning: 'Keluhan ringan yang tercatat di perangkat ini.',
            createdAt: new Date().toISOString(),
            doctorSummary: { summary: 'Ringkasan dari perangkat.', threeQuestionsForDoctor: ['Sejak kapan?'] },
          },
        ],
      },
    });
    const importedRow = await db.query(
      "select urgency_level, rule_floor, red_flag_triggered, answers, created_at from public.symptom_sessions where user_id = $1 and symptoms->>'importedFromDevice' = 'true'",
      [userA.id]
    );
    const countAfterImport = await db.query('select count(*)::int as n from public.symptom_sessions where user_id = $1', [userA.id]);
    check('POST history import -> 201', importRes.status === 201 && importRes.json.imported === 1, JSON.stringify(importRes.json));
    check(
      'impor menyimpan urgensi apa adanya',
      countAfterImport.rows[0].n === countBeforeImport.rows[0].n + 1 &&
        importedRow.rowCount === 1 &&
        importedRow.rows[0].urgency_level === 'monitor' &&
        importedRow.rows[0].rule_floor === null &&
        importedRow.rows[0].red_flag_triggered === false &&
        importedRow.rows[0].created_at <= new Date(Date.now() + 1000),
      JSON.stringify(importedRow.rows)
    );

    const patchCheckin = await api('/api/checkins', { method: 'PATCH', token: tokenA, body: { sessionId, anxietyAfter: 2 } });
    check('PATCH check-in anxiety_after', patchCheckin.status === 200 && patchCheckin.json.data?.anxiety_after === 2, JSON.stringify(patchCheckin.json));

    // ---------- red flag: rule floor harus menang ----------
    const redFlag = await api('/api/triage', { method: 'POST', token: tokenA, body: { mainSymptom: 'nyeri dada menjalar ke lengan', anxietyBefore: 5 } });
    const redSessionId = redFlag.json?.meta?.sessionId;
    check('red flag -> darurat', redFlag.status === 200 && redFlag.json.data.urgencyLevel === 'darurat', JSON.stringify(redFlag.json.data?.urgencyLevel));
    const dbRed = await db.query('select urgency_level, rule_floor, red_flag_triggered from public.symptom_sessions where id = $1', [redSessionId]);
    const redRow = dbRed.rows[0];
    check(
      'invariant final_urgency >= rule_floor tersimpan',
      dbRed.rowCount === 1 && redRow.urgency_level === 'emergency' && redRow.rule_floor === 'emergency' && redRow.red_flag_triggered === true,
      JSON.stringify(redRow)
    );

    // ---------- isolasi antar pengguna ----------
    userB = await createUser('b');
    const tokenB = await signIn(userB);
    const listB = await api('/api/diary', { token: tokenB });
    check('user B tidak melihat diary user A', listB.status === 200 && listB.json.data.length === 0, JSON.stringify(listB.json));

    const deleteOther = await api(`/api/diary?id=${diaryCreated.json.data.id}`, { method: 'DELETE', token: tokenB });
    check('user B tidak bisa menghapus diary user A', deleteOther.status === 404);

    // RLS juga harus menahan query langsung, bukan hanya filter kode.
    const probeDb = new Client({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await probeDb.connect();
    let probeCount = null;
    try {
      await probeDb.query('begin');
      await probeDb.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userB.id, role: 'authenticated' }),
      ]);
      await probeDb.query('set local role authenticated');
      const probe = await probeDb.query('select count(*)::int as n from public.diary_entries');
      probeCount = probe.rows[0].n;
      await probeDb.query('rollback');
    } finally {
      await probeDb.end();
    }
    check('RLS menahan baris milik pengguna lain', probeCount === 0, 'count=' + JSON.stringify(probeCount));

    // ---------- trigger hapus akun (di luar aplikasi) ----------
    userC = await createUser('c');
    const tokenC = await signIn(userC);
    await api('/api/profile/consent', { method: 'PATCH', token: tokenC, body: { consent: true } });
    const cDiary = await api('/api/diary', { method: 'POST', token: tokenC, body: { note: 'catatan uji trigger', severity: 1 } });
    check('user C punya data', cDiary.status === 201);

    const directDelete = await admin(`/auth/v1/admin/users/${userC.id}`, { method: 'DELETE' });
    const cRemain = await db.query(
      `select
         (select count(*)::int from public.profiles where id = $1) as profiles,
         (select count(*)::int from public.diary_entries where user_id = $1) as diary`,
      [userC.id]
    );
    check(
      'trigger on_auth_user_deleted membersihkan data',
      directDelete.status < 300 && cRemain.rows[0].profiles === 0 && cRemain.rows[0].diary === 0,
      JSON.stringify(cRemain.rows[0])
    );

    // ---------- hapus akun ----------
    const del = await api('/api/account/delete', { method: 'DELETE', token: tokenA });
    check('DELETE /api/account/delete -> 200', del.status === 200, JSON.stringify(del.json));

    const remain = await db.query(
      `select
         (select count(*)::int from public.profiles where id = $1) as profiles,
         (select count(*)::int from public.symptom_sessions where user_id = $1) as sessions,
         (select count(*)::int from public.checkins where user_id = $1) as checkins,
         (select count(*)::int from public.diary_entries where user_id = $1) as diary,
         (select count(*)::int from auth.users where id = $1) as auth_users`,
      [userA.id]
    );
    const r = remain.rows[0];
    check('semua data user A terhapus', r.profiles === 0 && r.sessions === 0 && r.checkins === 0 && r.diary === 0 && r.auth_users === 0, JSON.stringify(r));
  } catch (error) {
    console.log('ERROR', error.message);
    results.push({ name: 'unexpected error', pass: false, detail: error.message });
  } finally {
    for (const u of [userA, userB, userC]) {
      if (u) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    }
    await db.end();
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} lulus`);
    if (failed.length > 0) process.exitCode = 1;
  }
})();
