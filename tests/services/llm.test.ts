import { describe, test, expect } from 'bun:test';
import { LlmClient, createLlmClientFromEnv } from '../../src/services/llm';

describe('LlmClient', () => {
  test('creates client from environment variables', () => {
    process.env.LLM_BASE_URL = 'https://api.deepseek.com/v1';
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'deepseek-v4-flash';

    const client = createLlmClientFromEnv();
    expect(client).toBeInstanceOf(LlmClient);
  });

  test('calls chat completion with provided model and messages', async () => {
    const calls: unknown[] = [];
    const mockClient = {
      chat: {
        completions: {
          create: async (params: unknown) => {
            calls.push(params);
            return { choices: [{ message: { content: '# Result' } }] };
          },
        },
      },
    };

    const llm = new LlmClient(mockClient as never, { model: 'deepseek-v4-flash' });
    const result = await llm.complete('system prompt', 'user prompt');

    expect(result).toBe('# Result');
    expect(calls.length).toBe(1);
    const call = calls[0] as { model: string; messages: { role: string; content: string }[] };
    expect(call.model).toBe('deepseek-v4-flash');
    expect(call.messages[0].role).toBe('system');
    expect(call.messages[1].role).toBe('user');
  });

  test('retries on transient failure then succeeds', async () => {
    let attempts = 0;
    const mockClient = {
      chat: {
        completions: {
          create: async () => {
            attempts++;
            if (attempts < 2) throw new Error('rate limit');
            return { choices: [{ message: { content: '# Success' } }] };
          },
        },
      },
    };

    const llm = new LlmClient(mockClient as never, { model: 'test', maxRetries: 2 });
    const result = await llm.complete('system', 'user');

    expect(result).toBe('# Success');
    expect(attempts).toBe(2);
  });

  test('throws after max retries exhausted', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: async () => {
            throw new Error('always fails');
          },
        },
      },
    };

    const llm = new LlmClient(mockClient as never, { model: 'test', maxRetries: 1 });
    await expect(llm.complete('system', 'user')).rejects.toThrow('always fails');
  });
});
