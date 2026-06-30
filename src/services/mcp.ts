import { spawn, type Subprocess } from 'bun';

interface McpResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpClient {
  private process: Subprocess | null = null;
  private requestId = 0;
  private pending = new Map<number | string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
  private timeoutMs = 30000;
  private buffer = '';

  constructor(private command: string) {}

  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  isRunning(): boolean {
    return this.process !== null && this.process.exitCode === null;
  }

  async start(): Promise<void> {
    if (this.process) return;

    const [cmd, ...args] = this.command.split(' ');
    this.process = spawn({
      cmd: [cmd, ...args],
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (!this.process.stdout) {
      throw new Error('Failed to spawn MCP process');
    }

    const reader = this.process.stdout.getReader();
    this.readLoop(reader).catch((err) => this.rejectAll(err));
  }

  private async readLoop(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      this.buffer += decoder.decode(value, { stream: true });
      this.processLines();
    }
    this.rejectAll(new Error('MCP process stdout closed'));
  }

  private processLines(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line) as McpResponse;
        if (message.id !== undefined) {
          const pending = this.pending.get(message.id);
          if (!pending) continue;
          this.pending.delete(message.id);
          if (message.error) {
            pending.reject(new Error(`MCP error ${message.error.code}: ${message.error.message}`));
          } else {
            pending.resolve(message.result);
          }
        }
      } catch {
        // ignore non-JSON lines
      }
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process) throw new Error('MCP process not started');

    const id = ++this.requestId;
    const request = { jsonrpc: '2.0', id, method, params };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP call timeout: ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      this.process!.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  async goto(url: string): Promise<string> {
    const result = (await this.call('tools/call', {
      name: 'goto',
      arguments: { url },
    })) as { content?: { type: string; text: string }[] };
    return result.content?.[0]?.text ?? '';
  }

  async evaluate(script: string): Promise<unknown> {
    const result = (await this.call('tools/call', {
      name: 'evaluate',
      arguments: { script },
    })) as { content?: { type: string; text: string }[] };
    const text = result.content?.[0]?.text ?? '{}';
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async links(): Promise<Array<{ href: string; text: string }>> {
    const result = (await this.call('tools/call', {
      name: 'links',
      arguments: {},
    })) as { content?: { type: string; text: string }[] };
    const text = result.content?.[0]?.text ?? '[]';
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  async semanticTree(): Promise<unknown> {
    const result = (await this.call('tools/call', {
      name: 'semantic_tree',
      arguments: {},
    })) as { content?: { type: string; text: string }[] };
    const text = result.content?.[0]?.text ?? '[]';
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  async interactiveElements(): Promise<unknown> {
    const result = (await this.call('tools/call', {
      name: 'interactiveElements',
      arguments: {},
    })) as { content?: { type: string; text: string }[] };
    const text = result.content?.[0]?.text ?? '[]';
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  async structuredData(): Promise<unknown> {
    const result = (await this.call('tools/call', {
      name: 'structuredData',
      arguments: {},
    })) as { content?: { type: string; text: string }[] };
    const text = result.content?.[0]?.text ?? '{}';
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  async close(): Promise<void> {
    if (!this.process) return;
    this.process.kill();
    await this.process.exited;
    this.process = null;
    this.rejectAll(new Error('MCP process closed'));
  }
}
