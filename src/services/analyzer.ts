import {
  completeJob,
  failJob,
  updateJobProgress,
  updateJobStatus,
} from './jobs';
import { discoverPages, selectPages } from './crawler';
import { synthesizeFromRoleProfile } from './role-synthesizer';
import { buildGlobalProfile } from './global-profile';
import { generateDesignMd } from './design-md';
import { createLlmClientFromEnv, LlmClient } from './llm';
import { createDesignDoc } from './design-docs';
import { extractDomain, extractRootUrl } from '../utils/url';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { BrowserClient } from './browser';
import { createBrowserClient } from './browser';
import { classifySample, type Role } from '../utils/classify-elements';
import { parseExtractionPayload } from './css-vars';
import {
  buildCssTokenDecisions,
  applyDecisionsToDesignSystem,
  type ComputedAnchor,
} from './token-merge';
import type { EnrichedSample } from './role-aggregator';
import { matchRole } from './css-name-match';
import type { StyleSnapshot } from './role-aggregator';

function extractComputedAnchors(
  style: StyleSnapshot | undefined,
  role: Role
): ComputedAnchor[] {
  if (!style || !style.backgroundColor) return [];
  return [{ role, value: style.backgroundColor }];
}

function matchRoleForVar(name: string): Role | null {
  return matchRole(name);
}

const EXTRACTION_SCRIPT = `(function() {
  const cssVarEntries = [];
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const rule of rules) {
        if (!rule.style) continue;
        for (const prop of Array.from(rule.style)) {
          if (prop.startsWith('--')) {
            cssVarEntries.push([prop, rule.style.getPropertyValue(prop).trim()]);
          }
        }
      }
    }
  } catch (e) {}

  const elements = Array.from(document.querySelectorAll('body, body *'));
  const samples = [];
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    samples.push({
      tag: el.tagName,
      className: el.getAttribute('class') || '',
      role: el.getAttribute('role'),
      inNav: !!el.closest('nav, [role="navigation"]'),
      inHeader: !!el.closest('header'),
      inMain: !!el.closest('main'),
      textSample: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30),
      style: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        padding: style.padding,
        boxShadow: style.boxShadow,
      },
    });
  }
  const cssVarMap = {};
  for (const [k, v] of cssVarEntries) cssVarMap[k] = v;
  return JSON.stringify({ samples: samples.slice(0, 500), cssVars: cssVarMap });
})();`;

function annotateSamples(samples: ReturnType<typeof classifySample>[], input: Array<{
  tag: string;
  className: string;
  role: string | null;
  inNav: boolean;
  inHeader: boolean;
  inMain: boolean;
  textSample: string;
  style: EnrichedSample['style'];
}>): EnrichedSample[] {
  return input.map((s, i) => {
    const semantic = samples[i] || classifySample({
      tag: s.tag,
      className: s.className,
      role: s.role,
      inNav: s.inNav,
      inHeader: s.inHeader,
      inMain: s.inMain,
      textSample: s.textSample,
    });
    return { semantic, style: s.style };
  });
}


export async function startAnalysis(
  jobId: string,
  url: string,
  outputPath: string,
  deps: { browser?: BrowserClient; llm?: LlmClient } = {}
): Promise<void> {
  const outputDir = process.env.OUTPUT_DIR || './output';
  const browser = deps.browser ?? (await createBrowserClient());

  try {
    await updateJobStatus(jobId, 'running');
    await browser.start();

    try {
      await browser.goto(url);
      const domain = extractDomain(url);
      const rootUrl = extractRootUrl(url);

      const links = await browser.links();
      const discovered = discoverPages(
        rootUrl,
        links.map((l) => ({
          href: l.href,
          text: l.text,
          context: 'in-content' as const,
        }))
      );
      const pages = selectPages(rootUrl, discovered, Number(process.env.MAX_PAGES) || 6);

      const pageSamples: { url: string; samples: EnrichedSample[] }[] = [];
      const allCssVars = new Map<string, string>();
      let progress = 10;
      const step = 60 / pages.length;

      for (const pageUrl of pages) {
        try {
          await browser.goto(pageUrl);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`Skipping page ${pageUrl}: ${message}`);
          continue;
        }
        const result = await browser.evaluate<string>(EXTRACTION_SCRIPT);
        const payload = parseExtractionPayload(result);
        for (const [k, v] of payload.cssVars) {
          allCssVars.set(k, v);
        }

        const annotated = annotateSamples(
          (payload.samples as Array<Parameters<typeof classifySample>[0]>).map(classifySample),
          payload.samples as Array<{
            tag: string;
            className: string;
            role: string | null;
            inNav: boolean;
            inHeader: boolean;
            inMain: boolean;
            textSample: string;
            style: EnrichedSample['style'];
          }>
        );
        pageSamples.push({ url: pageUrl, samples: annotated });
        progress += step;
        await updateJobProgress(jobId, Math.min(Math.round(progress), 70));
      }

      const globalProfile = buildGlobalProfile(
        pageSamples.map((p) => ({ url: p.url, samples: p.samples }))
      );

      // Build CSS-var candidates per page for cross-page consistency scoring.
      const cssCandidatesByPage: Array<Map<string, string>> = pageSamples.map(() => new Map());
      for (const [k, v] of allCssVars) {
        // For now, treat every CSS var as appearing on every page (cross-page scores
        // will still detect conflicts because per-page sampling varies).
        for (const map of cssCandidatesByPage) map.set(k, v);
      }

      const cssCandidates = Array.from(allCssVars.entries()).flatMap(([name, value]) => {
        const role = matchRoleForVar(name);
        if (!role) return [];
        // Skip chained CSS vars (var(--x)) and non-color-bearing values.
        if (value.startsWith('var(') || value.includes('var(')) return [];
        // Skip transparent / invalid values upfront.
        if (value === 'transparent' || value === 'inherit' || value === 'initial') return [];
        return [{
          name,
          value,
          assignedRole: role,
          pages: pages.length,
          renderConsistency: 0.8,
        }];
      });

      const computedAnchors = extractComputedAnchors(
        globalProfile.byRole['button-primary']?.style,
        'primary'
      );
      const decisions = buildCssTokenDecisions(computedAnchors, cssCandidates);
      const baseDesignSystem = synthesizeFromRoleProfile(globalProfile, { brandName: domain });
      const applied = applyDecisionsToDesignSystem(baseDesignSystem, {
        decisions,
        rejected: decisions.filter((d) => d.rejectedFromPrimary).map((d) => ({
          name: '(shade)',
          role: d.role,
          value: d.value,
          score: d.confidence.score,
          reason: 'shade demoted',
        })),
      });
      applied.metadata = applied.metadata || ({} as never);
      (applied.metadata as { cssDecisionCount?: number }).cssDecisionCount = allCssVars.size;

      await updateJobProgress(jobId, 80);

      const llm = deps.llm ?? createLlmClientFromEnv();
      const designMd = await generateDesignMd(applied, llm);

      const fullPath = `${outputDir}/${outputPath}`;
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, designMd, 'utf-8');

      await createDesignDoc({
        jobId,
        domain,
        url,
        outputPath,
        content: designMd,
        pagesCrawled: pages.length,
      });

      await completeJob(jobId, {
        pagesCrawled: pages.length,
        outputPath,
        downloadUrl: `/jobs/${jobId}/download`,
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(jobId, message);
  }
}
