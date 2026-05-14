'use server';

import { getAIProvider, isAIError } from '@/lib/ai';
import { DEFAULT_AI_MODEL } from '@/lib/ai-models';
import { requireAIAuth } from '@/lib/ai/auth';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import type { CsvSongRow } from '@/schemas/CsvSongImportSchema';

const SYSTEM_PROMPT = `You are a data extraction assistant for a guitar lesson management app.
Your task is to parse freeform text containing song lists grouped by lesson dates into structured JSON.

The input may be in various formats:
- "29.02.2024: Stand by me, Son of the blue sky"
- "29.02.2024 - Stand by me (Ben E. King), Crazy Train (Ozzy Osbourne)"
- Bullet lists, numbered lists, tables, or any other format
- Dates may be DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD, or written out
- Author may be in parentheses, after a dash, or missing entirely

Rules:
1. If dates are present in the input, output them in DD.MM.YYYY format
2. If NO dates are found anywhere in the input, use empty string "" for the date field
3. Separate song title from author when possible
4. If author is unclear or missing, use empty string ""
5. Capitalize song titles properly (title case)
6. Trim whitespace from all values
7. Ignore empty lines and non-song content (headers, notes, etc.)

Output ONLY a JSON array with objects having: date, title, author
Example output with dates:
[{"date":"29.02.2024","title":"Stand by Me","author":"Ben E. King"},{"date":"29.02.2024","title":"Son of the Blue Sky","author":""}]
Example output without dates:
[{"date":"","title":"Wonderwall","author":"Oasis"},{"date":"","title":"Blackbird","author":"The Beatles"}]

Output ONLY the JSON array, no markdown, no explanation.`;

export async function parseTextToCsvRows(
  text: string
): Promise<{ success: boolean; rows?: CsvSongRow[]; error?: string }> {
  let user: { id: string; role: 'admin' | 'teacher' | 'student' };
  try {
    user = await requireAIAuth();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  if (user.role === 'student') {
    return { success: false, error: 'Unauthorized' };
  }

  const rateCheck = await checkRateLimit(user.id, user.role, 'text-to-csv-parser');
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
    };
  }

  if (!text.trim()) {
    return { success: false, error: 'Text is empty' };
  }

  if (text.length > 10000) {
    return { success: false, error: 'Text is too long (max 10,000 characters)' };
  }

  try {
    const provider = await getAIProvider();
    const result = await provider.complete({
      model: DEFAULT_AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      maxTokens: 4000,
    });

    if (isAIError(result)) {
      return { success: false, error: `AI parsing failed: ${result.error}` };
    }

    const content = result.content.trim();

    // Extract JSON array from response (handle possible markdown wrapping)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'AI returned invalid format. Please try again or use CSV upload.',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      date: string;
      title: string;
      author: string;
    }>;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { success: false, error: 'No songs could be extracted from the text.' };
    }

    const rows: CsvSongRow[] = parsed.map((item) => ({
      date: String(item.date || '').trim(),
      title: String(item.title || '').trim(),
      author: String(item.author || '').trim(),
    }));

    return { success: true, rows };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to parse text: ${message}` };
  }
}
