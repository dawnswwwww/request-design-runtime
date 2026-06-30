const FILE_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
  '.svg',
  '.mp4',
  '.xml',
  '.rss',
]);

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    let pathname = url.pathname;
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${url.protocol}//${url.host}${pathname}`;
  } catch {
    return '';
  }
}

export function extractDomain(raw: string): string {
  try {
    const url = new URL(raw);
    const parts = url.hostname.split('.');
    if (parts.length <= 2) return url.hostname;
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

export function extractRootUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

export function isSameEtldePlusOne(raw: string, domain: string): boolean {
  const linkDomain = extractDomain(raw);
  return linkDomain.toLowerCase() === domain.toLowerCase();
}

export function isInternalLink(href: string, domain: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  if (trimmed.startsWith('mailto:')) return false;
  if (trimmed.startsWith('javascript:')) return false;

  let url: URL;
  try {
    url = new URL(trimmed, `https://${domain}`);
  } catch {
    return false;
  }

  if (!isSameEtldePlusOne(url.href, domain)) return false;

  const pathname = url.pathname.toLowerCase();
  for (const ext of FILE_EXTENSIONS) {
    if (pathname.endsWith(ext)) return false;
  }

  return true;
}
