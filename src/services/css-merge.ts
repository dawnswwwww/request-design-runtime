import type { GlobalProfile, GlobalRoleToken } from './global-profile';

export interface ExtractedCssTokens {
  colors: Record<string, string>;
  typography: {
    family?: string;
    sizes?: Record<string, string>;
    weights?: Record<string, string>;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  source: 'css-vars' | 'mixed' | 'computed';
}

type PartialCssTokens = Partial<Omit<ExtractedCssTokens, 'source' | 'typography' | 'spacing' | 'radius'>> & {
  typography?: { family?: string; sizes?: Record<string, string>; weights?: Record<string, string> };
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  colors?: Record<string, string>;
  source?: 'css-vars' | 'mixed' | 'computed';
};

export function mergeCssIntoProfile(
  base: GlobalProfile,
  css: PartialCssTokens
): GlobalProfile & { cssVarTokens?: PartialCssTokens } {
  const colors = css.colors || {};
  const typography = css.typography || {};
  const byRole = { ...base.byRole };

  if (colors.primary && byRole['button-primary']) {
    const token = byRole['button-primary'];
    byRole['button-primary'] = {
      ...token,
      style: {
        ...token.style,
        backgroundColor: colors.primary,
      },
    };
  }

  if (colors.secondary && byRole['button-secondary']) {
    const token = byRole['button-secondary'];
    byRole['button-secondary'] = {
      ...token,
      style: {
        ...token.style,
        backgroundColor: colors.secondary,
      },
    };
  }

  if (typography.family && byRole['heading']) {
    const token = byRole['heading'];
    byRole['heading'] = {
      ...token,
      style: {
        ...token.style,
        fontFamily: typography.family,
      },
    };
  }

  if (Object.keys(byRole).length === 0 && Object.keys(colors).length > 0) {
    for (const [role, value] of Object.entries(colors)) {
      byRole[role as 'button-primary'] = {
        role: 'button-primary',
        style: {
          color: '',
          backgroundColor: value,
          borderColor: '',
          borderRadius: '',
          fontFamily: '',
          fontSize: '',
          fontWeight: '',
          lineHeight: '',
          letterSpacing: '',
          padding: '',
          boxShadow: '',
        },
        pagesWithRole: base.pageCount,
        pageTotal: base.pageCount,
        consistency: 1,
        conflictingValues: undefined,
        sources: [`css-var:${role}`],
        rawCount: base.pageCount,
      };
    }
  }

  return {
    ...base,
    byRole,
    cssVarTokens: css,
  };
}
