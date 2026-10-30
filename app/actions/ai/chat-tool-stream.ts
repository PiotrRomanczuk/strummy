import type { AIMessage } from '@/lib/ai';
import { NO_REASONING } from '@/lib/ai/providers/openrouter';
import { logger } from '@/lib/logger';
import { getCreateOpenAICompatible, getStreamText } from './shared';

/**
 * The chat assistant's tool-calling stream — OpenRouter only, since it is the
 * one provider wired for the Vercel AI SDK tools.
 *
 * Yields the accumulated reply and never throws: a failure ends the stream, and
 * the caller (generateAIResponseStream) falls back to the provider chain
 * without tools when nothing was produced.
 */
export async function* streamChatWithTools(params: {
  model: string;
  messages: AIMessage[];
  maxOutputTokens: number;
}): AsyncGenerator<string, void, undefined> {
  let fullContent = '';
  try {
    const createOAICompat = await getCreateOpenAICompatible();
    const sdkStreamText = await getStreamText();
    const { chatTools: tools } = await import('@/lib/ai/tools');
    const { stepCountIs } = await import('ai');

    const sdkProvider = createOAICompat({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        'X-Title': 'Guitar CRM',
      },
    });

    const result = sdkStreamText({
      model: sdkProvider.chatModel(params.model),
      providerOptions: { openrouter: { reasoning: NO_REASONING } },
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      maxOutputTokens: params.maxOutputTokens,
      tools,
      stopWhen: stepCountIs(3),
    });

    // fullStream, not textStream: textStream drops provider errors and simply
    // ends empty, which would hide why the fallback kicked in.
    for await (const part of result.fullStream) {
      if (part.type === 'error') throw part.error;
      if (part.type !== 'text-delta') continue;
      fullContent += part.text;
      yield fullContent;
    }
  } catch (error) {
    const stage = fullContent ? 'mid-reply' : 'before any text';
    logger.error(`[AI] Tool-calling chat failed ${stage}:`, error);
  }
}
