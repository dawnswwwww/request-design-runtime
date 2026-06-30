export enum PageType {
  PRICING = 'pricing',
  FEATURES = 'features',
  DOCS = 'docs',
  DASHBOARD = 'dashboard',
  ABOUT = 'about',
  BLOG = 'blog',
  AUTH = 'auth',
  CONTACT = 'contact',
  LEGAL = 'legal',
  UNKNOWN = 'unknown',
}

export enum PagePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  SKIP = 'skip',
  LOW = 'low',
}

interface Classification {
  type: PageType;
  priority: PagePriority;
}

const RULES: Classification[] = [
  { type: PageType.PRICING, priority: PagePriority.HIGH },
  { type: PageType.FEATURES, priority: PagePriority.HIGH },
  { type: PageType.DOCS, priority: PagePriority.HIGH },
  { type: PageType.DASHBOARD, priority: PagePriority.HIGH },
  { type: PageType.ABOUT, priority: PagePriority.MEDIUM },
  { type: PageType.BLOG, priority: PagePriority.MEDIUM },
  { type: PageType.AUTH, priority: PagePriority.SKIP },
  { type: PageType.CONTACT, priority: PagePriority.MEDIUM },
  { type: PageType.LEGAL, priority: PagePriority.SKIP },
];

const PATTERNS: Record<PageType, { url: string[]; anchor: string[] }> = {
  [PageType.PRICING]: {
    url: ['/pricing', '/plans', '/billing'],
    anchor: ['pricing', 'plans', 'cost'],
  },
  [PageType.FEATURES]: {
    url: ['/features', '/product', '/solutions'],
    anchor: ['features', 'product', 'solutions'],
  },
  [PageType.DOCS]: {
    url: ['/docs', '/documentation', '/api', '/reference', '/guide'],
    anchor: ['docs', 'documentation', 'api', 'guide'],
  },
  [PageType.DASHBOARD]: {
    url: ['/dashboard', '/app', '/console', '/admin'],
    anchor: ['dashboard', 'console', 'admin panel'],
  },
  [PageType.ABOUT]: {
    url: ['/about', '/team', '/company'],
    anchor: ['about us', 'our team', 'company'],
  },
  [PageType.BLOG]: {
    url: ['/blog', '/changelog', '/news', '/articles'],
    anchor: ['blog', 'changelog', 'news'],
  },
  [PageType.AUTH]: {
    url: ['/login', '/signup', '/register', '/auth'],
    anchor: ['sign in', 'sign up', 'login', 'register'],
  },
  [PageType.CONTACT]: {
    url: ['/contact', '/support', '/help'],
    anchor: ['contact', 'support', 'help'],
  },
  [PageType.LEGAL]: {
    url: ['/terms', '/privacy', '/legal'],
    anchor: ['terms', 'privacy', 'legal'],
  },
  [PageType.UNKNOWN]: {
    url: [],
    anchor: [],
  },
};

export function classifyPage(url: string, anchorText: string): Classification {
  const lowerUrl = url.toLowerCase();
  const lowerAnchor = anchorText.toLowerCase();

  for (const rule of RULES) {
    const patterns = PATTERNS[rule.type];
    const urlMatch = patterns.url.some((p) => lowerUrl.includes(p));
    const anchorMatch = patterns.anchor.some((a) => lowerAnchor.includes(a));
    if (urlMatch || anchorMatch) {
      return rule;
    }
  }

  return { type: PageType.UNKNOWN, priority: PagePriority.LOW };
}
