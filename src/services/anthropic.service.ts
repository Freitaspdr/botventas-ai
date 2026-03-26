import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { buildSystemPrompt, extractTags, EmpresaConfig, AiTag } from '../prompts/system-prompt';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  text: string;
  tags: AiTag[];
  inputTokens: number;
  outputTokens: number;
}

export async function chat(
  empresaConfig: EmpresaConfig,
  history: ChatMessage[],
  newMessage: string,
): Promise<AiResponse> {
  const systemPrompt = buildSystemPrompt(empresaConfig);

  // Tomamos los últimos 10 mensajes para no sobrepasar el contexto
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: newMessage },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const { cleanText, tags } = extractTags(rawText);

  return {
    text: cleanText,
    tags,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
