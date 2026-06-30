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
