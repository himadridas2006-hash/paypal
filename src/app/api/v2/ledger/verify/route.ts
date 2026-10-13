import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface AuditBlock {
  index: number;
  timestamp: string;
  eventType: string;
  actor: string;
  amount: number;
  prevHash: string;
  hash: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function calculateHash(index: number, timestamp: string, eventType: string, actor: string, amount: number, prevHash: string): string {
  const data = `${index}-${timestamp}-${eventType}-${actor}-${amount}-${prevHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

const SAMPLE_ENTRIES = [
  { index: 0, timestamp: '2026-10-12T10:00:00Z', eventType: 'GENESIS_MANDATE_INIT', actor: 'Treasurer Admin', amount: 0, prevHash: GENESIS_HASH },
  { index: 1, timestamp: '2026-10-12T11:15:22Z', eventType: 'MANDATE_CREATED', actor: 'DevOps Lead', amount: 2500, prevHash: '' },
  { index: 2, timestamp: '2026-10-12T12:04:10Z', eventType: 'PAYMENT_CAPTURED', actor: 'Dev Tools Agent', amount: 90, prevHash: '' },
  { index: 3, timestamp: '2026-10-12T14:30:45Z', eventType: 'INTERCEPT_ESCALATION', actor: 'Compute Agent', amount: 450, prevHash: '' },
  { index: 4, timestamp: '2026-10-12T15:02:11Z', eventType: 'HUMAN_APPROVAL_PAYPAL', actor: 'Supervisor LO', amount: 450, prevHash: '' },
  { index: 5, timestamp: '2026-10-12T16:22:00Z', eventType: 'POLICY_BLOCK_ZERO_LEAK', actor: 'Ad-Hoc Agent', amount: 200, prevHash: '' },
];

export async function GET() {
  let prevHash = GENESIS_HASH;
  const chain: AuditBlock[] = [];

  for (let i = 0; i < SAMPLE_ENTRIES.length; i++) {
    const entry = SAMPLE_ENTRIES[i];
    const currentPrevHash = i === 0 ? GENESIS_HASH : prevHash;
    const hash = calculateHash(entry.index, entry.timestamp, entry.eventType, entry.actor, entry.amount, currentPrevHash);
    
    chain.push({
      ...entry,
      prevHash: currentPrevHash,
      hash,
    });
    prevHash = hash;
  }

  return NextResponse.json({
    chain,
    isChainValid: true,
    totalBlocks: chain.length,
    latestHash: prevHash,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { chain } = await req.json();
    if (!Array.isArray(chain) || chain.length === 0) {
      return NextResponse.json({ valid: false, error: 'Empty chain' }, { status: 400 });
    }

    let isValid = true;
    let brokenIndex = -1;
    let expectedHash = '';
    let foundHash = '';

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      const prevHash = i === 0 ? GENESIS_HASH : chain[i - 1].hash;

      if (block.prevHash !== prevHash) {
        isValid = false;
        brokenIndex = i;
        expectedHash = prevHash;
        foundHash = block.prevHash;
        break;
      }

      const calculated = calculateHash(block.index, block.timestamp, block.eventType, block.actor, block.amount, block.prevHash);
      if (block.hash !== calculated) {
        isValid = false;
        brokenIndex = i;
        expectedHash = calculated;
        foundHash = block.hash;
        break;
      }
    }

    return NextResponse.json({
      valid: isValid,
      brokenIndex,
      expectedHash,
      foundHash,
      verificationTimestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Verification error' }, { status: 500 });
  }
}
