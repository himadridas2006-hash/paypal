import { NextResponse } from 'next/server';
import { INITIAL_APPROVALS } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    pendingCount: INITIAL_APPROVALS.filter((a) => a.status === 'pending').length,
    queue: INITIAL_APPROVALS,
    timestamp: new Date().toISOString(),
  });
}
