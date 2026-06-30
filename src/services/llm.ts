interface OpenAIChatClient {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      }) => Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

interface LlmOptions {
  model: string;
  maxRetries?: number;
  temperature?: number;
}

export class LlmClient {
  constructor(
    private client: OpenAIChatClient,
    private options: LlmOptions
  ) {}

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const maxRetries = this.options.maxRetries ?? 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.options.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: this.options.temperature ?? 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content === null || content === undefined) {
          throw new Error('LLM returned empty content');
        }
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await sleep(500 * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('LLM request failed');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLlmClientFromEnv(): LlmClient {
  const { OpenAI } = require('openai');
  const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
  });
  return new LlmClient(client, {
    model: process.env.LLM_MODEL || 'deepseek-v4-flash',
  });
}
