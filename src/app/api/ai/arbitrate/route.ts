import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const { prompt = '', items = [], total = 0, participants = [], bills = [] } = await req.json();

    const participantList: string[] = (participants && participants.length > 0)
      ? participants.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean)
      : ['You', 'Friend 1', 'Friend 2'];

    const numParticipants = participantList.length;

    // Determine overall or target bill total
    let calculatedTotal = Number(total);
    if (!calculatedTotal || calculatedTotal <= 0) {
      if (bills && bills.length > 0) {
        calculatedTotal = bills.reduce((acc: number, b: any) => acc + (Number(b.total) || 0), 0);
      } else if (items && items.length > 0) {
        calculatedTotal = items.reduce((acc: number, it: any) => acc + (Number(it.price) || 0), 0);
      } else {
        calculatedTotal = 100;
      }
    }
    const billTotal = Math.round(calculatedTotal * 100) / 100;

    // Detailed context for multi-bills or single bill
    let billContext = '';
    if (bills && bills.length > 0) {
      billContext = 'BILLS OVERVIEW (Multiple Bills):\n' + bills.map((b: any) => {
        const itemStr = (b.items || []).map((i: any) => `${i.name}: $${Number(i.price).toFixed(2)} (Assigned: ${(i.assignedTo || []).join(', ') || 'All'})`).join('; ');
        return `Bill ${b.billNumber || b.id} (${b.name}): Total $${Number(b.total).toFixed(2)} [Items: ${itemStr}]`;
      }).join('\n');
    } else {
      billContext = `Itemized Items: ${JSON.stringify(items)}`;
    }

    if (GEMINI_API_KEY) {
      // Prioritize models that have active quota available on the user account
      const modelsToTry = [
        'gemini-3.5-flash',
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ];

      for (const model of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          
          const systemPrompt = `You are FairShare AI, an expert mathematical expense arbiter.
You need to accurately split the expenses among these EXACT participants: ${participantList.join(', ')}.

Total Combined Amount to Settle: $${billTotal.toFixed(2)}
${billContext}

User Arbitration Instructions & Nuances: "${prompt || 'Split according to item assignments'}"

RULES:
1. Every single participant in the list (${participantList.join(', ')}) MUST have a share in the output splits.
2. The sum of all individual shares MUST EXACTLY equal $${billTotal.toFixed(2)}.
3. Carefully analyze the user prompt and dish assignments. For example, if the prompt says "in bill-003 X and Y didn't order raita, and Z didn't eat salad", make sure the price of raita is excluded from X and Y, and divided only among the other consumers.
4. Calculate precise numbers with two decimal places.
5. Return ONLY a valid JSON object matching this schema without markdown codeblocks:
{
  "explanation": "Clear 1-3 sentence explanation detailing exactly how each participant's share was derived across the bills based on who ate/drank what",
  "splits": [
    ${participantList.map(name => `{"name": "${name}", "share": 0.00}`).join(',\n    ')}
  ]
}`;

          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleaned);

              if (parsed.splits && Array.isArray(parsed.splits) && parsed.splits.length > 0) {
                // Ensure mathematical sum matches total exactly to the cent
                const sum = parsed.splits.reduce((acc: number, s: any) => acc + Number(s.share || 0), 0);
                const diff = Math.round((billTotal - sum) * 100) / 100;
                if (Math.abs(diff) > 0.001 && parsed.splits.length > 0) {
                  parsed.splits[0].share = Math.round((Number(parsed.splits[0].share) + diff) * 100) / 100;
                }
                return NextResponse.json({ ...parsed, model });
              }
            }
          }
        } catch (callErr) {
          console.warn(`Arbitration attempt failed on ${model}:`, callErr);
        }
      }
    }

    // Smart Mathematical Fallback Solver
    // Calculates exact dish-by-dish split if items are provided, otherwise equal split
    const shares: Record<string, number> = {};
    participantList.forEach(p => { shares[p] = 0; });

    let calculatedFromItems = false;
    const allItems: any[] = [];
    if (bills && bills.length > 0) {
      bills.forEach((b: any) => {
        if (b.items && Array.isArray(b.items)) {
          allItems.push(...b.items);
        }
      });
    } else if (items && Array.isArray(items)) {
      allItems.push(...items);
    }

    if (allItems.length > 0) {
      calculatedFromItems = true;
      allItems.forEach((it) => {
        const assigned: string[] = (it.assignedTo && it.assignedTo.length > 0)
          ? it.assignedTo.filter((n: string) => participantList.includes(n))
          : participantList;

        const divisor = assigned.length > 0 ? assigned.length : numParticipants;
        const perPerson = (Number(it.price) || 0) / divisor;

        const effectiveConsumers = assigned.length > 0 ? assigned : participantList;
        effectiveConsumers.forEach((p) => {
          if (shares[p] !== undefined) {
            shares[p] += perPerson;
          }
        });
      });
    }

    if (!calculatedFromItems || Object.values(shares).every(v => v === 0)) {
      const baseShare = Math.floor((billTotal / numParticipants) * 100) / 100;
      participantList.forEach((name) => {
        shares[name] = baseShare;
      });
    }

    // Balance to exact total down to the cent
    const currentSum = Object.values(shares).reduce((a, b) => a + b, 0);
    let diff = Math.round((billTotal - currentSum) * 100) / 100;
    if (Math.abs(diff) > 0.001) {
      shares[participantList[0]] = Math.round((shares[participantList[0]] + diff) * 100) / 100;
    }

    const splits = participantList.map((name) => ({
      name,
      share: Math.round((shares[name] || 0) * 100) / 100,
    }));

    return NextResponse.json({
      explanation: calculatedFromItems
        ? `Exact mathematical calculation based on individual item assignments across all ${bills?.length || 1} bills. Reconciled to total $${billTotal.toFixed(2)}.`
        : `Calculated balanced settlement across ${numParticipants} participants (${participantList.join(', ')}). Reconciled to total $${billTotal.toFixed(2)}.`,
      splits,
      model: 'mathematical-item-solver',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Arbitration failed' }, { status: 500 });
  }
}
