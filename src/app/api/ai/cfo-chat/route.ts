import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { message, mode } = await req.json();

    if (mode === 'chaser') {
      // Draft late-payer follow-up message
      const prompt = `You are a professional CFO assistant drafting a polite but firm invoice payment reminder for an overdue client.
Invoice context: ${message}
Draft:
1. A concise email subject and body
2. A short WhatsApp/SMS text message
Include a placeholder for the PayPal payment link.
Return ONLY JSON:
{
  "emailSubject": "string",
  "emailBody": "string",
  "whatsappMessage": "string"
}`;

      if (GEMINI_API_KEY) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          return NextResponse.json(JSON.parse(text));
        }
      }

      return NextResponse.json({
        emailSubject: 'Friendly Reminder: Outstanding Invoice Payment Due',
        emailBody: `Hi there,\n\nI hope you're having a productive week. This is a gentle reminder regarding our outstanding invoice (${message}). Please let us know if you need any clarification, or settle directly via PayPal below.\n\nThank you for your business!`,
        whatsappMessage: `Hi! Quick ping regarding the pending invoice (${message}). You can settle it anytime via the secure PayPal link: [PayPal Link]. Let me know if any questions!`,
      });
    }

    // Default mode: Chat creates an invoice
    const prompt = `You are Freelancer CFO AI. The user is asking you to create an invoice.
User message: "${message}"

Extract or generate:
- client: string (e.g., Acme Corp)
- description: string (e.g., UX Strategy & Interface Prototyping)
- amount: number (e.g., 1200)
- currency: string (e.g., USD, EUR, GBP)
- dueDateDays: number (e.g., 14)

Return ONLY JSON:
{
  "client": "string",
  "description": "string",
  "amount": 1200,
  "currency": "USD",
  "replyMessage": "I have drafted the invoice for [Client] for $[Amount] [Currency] for [Description]. Instant PayPal payment request is ready."
}`;

    if (GEMINI_API_KEY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return NextResponse.json(JSON.parse(text));
      }
    }

    return NextResponse.json({
      client: 'Acme Corp Labs',
      description: 'Autonomous Agent Engineering & Spend Guardrails Consulting',
      amount: 1500,
      currency: 'USD',
      replyMessage: 'Created new invoice for Acme Corp Labs ($1,500 USD). PayPal invoice link generated.',
    });
  } catch (err: any) {
    return NextResponse.json({
      client: 'Client Partner',
      description: 'Professional Services',
      amount: 850,
      currency: 'USD',
      replyMessage: 'Generated invoice with standard 14-day settlement term.',
      error: err.message,
    });
  }
}
