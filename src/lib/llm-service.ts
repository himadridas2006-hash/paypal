/**
 * Shared Backend Google Gemini LLM Service for Mandate V2
 * 
 * Features:
 * - Reads GEMINI_API_KEY and GEMINI_MODEL from backend environment variables only.
 * - Single point of access for: Agent Playground, Injection Shield, Marketplace, Dispute Defense, Anomaly Explanations.
 * - Retry with exponential backoff on 429 (rate-limit) / 5xx errors.
 * - In-memory LRU-style cache for identical prompts (TTL 60s) to conserve free-tier quota.
 * - Graceful fallback to deterministic/heuristic responses if key missing or service down.
 * - Never overrides deterministic policy engine (only can make decisions stricter or classify threats).
 */

interface CacheEntry {
  response: string;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getCached(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.response;
}

function setCache(key: string, response: string): void {
  // Prune cache if over 100 entries
  if (memoryCache.size > 100) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { response, timestamp: Date.now() });
}

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: any; // JSON schema for structured responses
  tools?: any[]; // Gemini function declarations
}

export interface GeminiCallResult {
  text: string;
  isFallback: boolean;
  model: string;
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
}

const MODELS_FALLBACK_LIST = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
];

export async function callGemini(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return {
      text: '',
      isFallback: true,
      model: 'deterministic-offline-fallback',
    };
  }

  // Check cache
  const cacheKey = JSON.stringify({ prompt, options });
  const cached = getCached(cacheKey);
  if (cached) {
    return {
      text: cached,
      isFallback: false,
      model: 'cache-hit',
    };
  }

  // Build payload
  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  if (options.responseSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = options.responseSchema;
  }

  if (options.tools) {
    body.tools = options.tools;
  }

  // Attempt across fallback models with exponential backoff
  for (const model of MODELS_FALLBACK_LIST) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status >= 500) {
          // Rate-limited or server error - wait and retry
          await new Promise((r) => setTimeout(r, (attempt + 1) * 700));
          continue;
        }

        if (!response.ok) {
          break; // Try next model
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (!candidate) break;

        const textPart = candidate.content?.parts?.find((p: any) => p.text)?.text || '';
        const functionCallParts = candidate.content?.parts
          ?.filter((p: any) => p.functionCall)
          ?.map((p: any) => ({
            name: p.functionCall.name,
            args: p.functionCall.args,
          }));

        if (textPart) {
          setCache(cacheKey, textPart);
        }

        return {
          text: textPart,
          isFallback: false,
          model,
          functionCalls: functionCallParts && functionCallParts.length > 0 ? functionCallParts : undefined,
        };
      } catch (err) {
        // Network or timeout error
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // Graceful fallback if all attempts fail
  return {
    text: '',
    isFallback: true,
    model: 'fallback-after-error',
  };
}
