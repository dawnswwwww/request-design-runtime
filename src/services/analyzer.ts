import {
  completeJob,
  failJob,
  updateJobProgress,
  updateJobStatus,
} from './jobs';
import { discoverPages, selectPages } from './crawler';
import { synthesize } from './synthesizer';
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
import {
  extractCssVariablesFromText,
  parseExtractionPayload,
} from './css-vars';
import { mergeCssIntoProfile, type PartialCssTokens } from './css-merge';
import type { EnrichedSample } from './role-aggregator';

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

function mapCssToTokens(vars: Map<string, string>): PartialCssTokens {
  const colors: Record<string, string> = {};
  let family: string | undefined;
  for (const [name, value] of vars) {
    if (name.includes('--color-primary') || name.includes('color-primary')) {
      colors.primary = value;
    } else if (name.includes('--color-secondary')) {
      colors.secondary = value;
    } else if (name.includes('--color-accent')) {
      const m = name.match(/(?:_|-)accent-?(\d+)/);
      if (m) colors[`accent-${m[1]}`] = value;
    } else if (name === '--font-sans' || name === '--font-family' || name.includes('--font-family')) {
      family = value.split(',')[0].replace(/['"]/g, '').trim();
    }
  }
  return { colors, typography: { family }, source: 'css-vars' };
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

      let globalProfile = buildGlobalProfile(
        pageSamples.map((p) => ({ url: p.url, samples: p.samples }))
      );

      const cssMerged: PartialCssTokens = mapCssToTokens(allCssVars);
      if (Object.keys(cssMerged.colors || {}).length > 0 || cssMerged.typography?.family) {
        globalProfile = mergeCssIntoProfile(globalProfile, cssMerged);
      }

      const designSystem = synthesizeFromRoleProfile(globalProfile, { brandName: domain });

      await updateJobProgress(jobId, 80);

      const llm = deps.llm ?? createLlmClientFromEnv();
      const designMd = await generateDesignMd(designSystem, llm);

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
