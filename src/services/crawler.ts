import { classifyPage, PagePriority, PageType } from '../utils/classify';
import { extractDomain, isInternalLink, normalizeUrl } from '../utils/url';

export interface DiscoveredLink {
  href: string;
  text: string;
  context: 'main nav' | 'footer' | 'in-content';
}

export interface PageInfo {
  url: string;
  type: PageType;
  priority: PagePriority;
  context: 'main nav' | 'footer' | 'in-content';
}

export function discoverPages(rootUrl: string, links: DiscoveredLink[]): PageInfo[] {
  const domain = extractDomain(rootUrl);
  const seen = new Map<string, PageInfo>();

  for (const link of links) {
    if (!isInternalLink(link.href, domain)) continue;

    const normalized = normalizeUrl(link.href);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;

    const classification = classifyPage(normalized, link.text);
    if (classification.priority === PagePriority.SKIP) continue;

    seen.set(normalized, {
      url: normalized,
      type: classification.type,
      priority: classification.priority,
      context: link.context,
    });
  }

  return Array.from(seen.values());
}

export function selectPages(rootUrl: string, pages: PageInfo[], maxPages: number): string[] {
  const root = normalizeUrl(rootUrl) || rootUrl;
  const selected = new Set<string>([root]);

  const high = pages.filter((p) => p.priority === PagePriority.HIGH);
  const medium = pages.filter((p) => p.priority === PagePriority.MEDIUM);
  const rest = pages.filter((p) => p.priority === PagePriority.LOW || p.priority === PagePriority.SKIP);

  function addByType(list: PageInfo[], limitPerType: number) {
    const byType = new Map<PageType, PageInfo[]>();
    for (const page of list) {
      if (!byType.has(page.type)) byType.set(page.type, []);
      byType.get(page.type)!.push(page);
    }

    for (const items of byType.values()) {
      const sorted = items.sort((a, b) => {
        if (a.context === 'main nav' && b.context !== 'main nav') return -1;
        if (b.context === 'main nav' && a.context !== 'main nav') return 1;
        return 0;
      });
      for (const page of sorted.slice(0, limitPerType)) {
        if (selected.size >= maxPages) return;
        selected.add(page.url);
      }
    }
  }

  addByType(high, 2);
  addByType(medium, 1);

  if (selected.size < 3) {
    for (const page of rest) {
      if (selected.size >= maxPages || selected.size >= 6) break;
      selected.add(page.url);
    }
  }

  return Array.from(selected);
}
