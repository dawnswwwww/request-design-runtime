import { McpClient } from './mcp';
import { PlaywrightBrowserClient } from './playwright';

export interface BrowserLink {
  href: string;
  text: string;
}

export interface BrowserClient {
  goto(url: string): Promise<void>;
  evaluate<T = unknown>(script: string): Promise<T>;
  links(): Promise<BrowserLink[]>;
  semanticTree(): Promise<unknown>;
  interactiveElements(): Promise<unknown>;
  structuredData(): Promise<unknown>;
  close(): Promise<void>;
}

export type BrowserEngine = 'lightpanda' | 'playwright';

export function getBrowserEngine(): BrowserEngine {
  const env = process.env.BROWSER_ENGINE;
  if (env === 'playwright') return 'playwright';
  return 'lightpanda';
}

export async function createBrowserClient(): Promise<BrowserClient> {
  const engine = getBrowserEngine();
  if (engine === 'playwright') {
    return new PlaywrightBrowserClient();
  }
  const mcpPath = process.env.LIGHTPANDA_BIN || 'lightpanda';
  return new McpClient(`${mcpPath} mcp`);
}
