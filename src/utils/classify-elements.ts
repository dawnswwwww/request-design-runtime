export type Role =
  | 'button-primary'
  | 'button-secondary'
  | 'nav-link'
  | 'heading'
  | 'card'
  | 'input'
  | 'body'
  | 'muted';

export interface SampleSemantic {
  tag: string;
  role: string | null;
  inNav: boolean;
  inHeader: boolean;
  inMain: boolean;
  isInteractive: boolean;
  looksLikeButton: boolean;
  looksLikePrimary: boolean;
  looksLikeCard: boolean;
  looksLikeLink: boolean;
  textSample: string;
  role2: Role | null;
}

export interface ClassifyInput {
  tag: string;
  className: string;
  role: string | null;
  inNav: boolean;
  inHeader: boolean;
  inMain: boolean;
  textSample?: string;
}

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

const BODY_TAGS = new Set(['P', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'SPAN', 'DIV']);

export function looksLikePrimary(className: string): boolean {
  const c = className.toLowerCase();
  return /\b(primary|cta|hero[-_]?cta|action|hero[-_]?(cta|action))\b/.test(c);
}

function looksLikeButton(className: string): boolean {
  const c = className.toLowerCase();
  return /\bbtn|button/.test(c);
}

function looksLikeCard(className: string): boolean {
  const c = className.toLowerCase();
  return /\bcard/.test(c);
}

function looksLikeLink(className: string): boolean {
  const c = className.toLowerCase();
  return /\blink|nav-link/.test(c);
}

export function classifyRole(
  tag: string,
  className: string,
  role: string | null,
  ctx: { inNav: boolean; looksLikePrimary?: boolean }
): Role | null {
  const c = className.toLowerCase();

  if (HEADING_TAGS.has(tag)) return 'heading';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return 'input';

  if (ctx.inNav && tag === 'A') return 'nav-link';

  if (looksLikeButton(c) || tag === 'BUTTON' || role === 'button') {
    return looksLikePrimary(c) || ctx.looksLikePrimary ? 'button-primary' : 'button-secondary';
  }

  if (looksLikeCard(c)) return 'card';

  if (tag === 'A' && looksLikeLink(c)) return 'nav-link';

  if (BODY_TAGS.has(tag)) return 'body';

  return null;
}

export function classifySample(input: ClassifyInput): SampleSemantic {
  const tag = input.tag;
  const className = input.className;
  const role = input.role;

  const semantic: SampleSemantic = {
    tag,
    role,
    inNav: input.inNav,
    inHeader: input.inHeader,
    inMain: input.inMain,
    isInteractive: INTERACTIVE_TAGS.has(tag),
    looksLikeButton: tag === 'BUTTON' || looksLikeButton(className),
    looksLikePrimary: looksLikePrimary(className),
    looksLikeCard: looksLikeCard(className),
    looksLikeLink: tag === 'A' && looksLikeLink(className),
    textSample: (input.textSample || '').slice(0, 30),
    role2: classifyRole(tag, className, role, {
      inNav: input.inNav,
      looksLikePrimary: looksLikePrimary(className),
    }),
  };

  return semantic;
}
