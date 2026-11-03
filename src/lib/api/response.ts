import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  code: string;
  message: string;
}

/**
 * Bentuk error API yang konsisten (AGENTS.md §4).
 * Pesan untuk pengguna harus tenang dan tanpa detail teknis.
 */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
