import { NextResponse } from 'next/server';
import { INITIAL_MANDATES } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    count: INITIAL_MANDATES.length,
    mandates: INITIAL_MANDATES,
    timestamp: new Date().toISOString(),
  });
}
