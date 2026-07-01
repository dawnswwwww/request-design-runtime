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
import { CSS_VAR_RESOLVE_SCRIPT, RENDER_CHECK_SCRIPT } from './css-vars-browser';
import { mapCssVarToRole } from './css-vars-role-map';
import { extractComponents } from './components';

function extractComputedAnchors(
  style: StyleSnapshot | undefined,
  role: Role
): ComputedAnchor[] {
  if (!style || !style.backgroundColor) return [];
  return [{ role, value: style.backgroundColor }];
}

interface RenderCheckSample {
  selector: string;
  computedBg: string;
  cssVarResolvesTo: string;
  cssVarNames: string[];
}

async function runRenderCheck(
  browser: BrowserClient,
  pageUrl: string
): Promise<RenderCheckSample[]> {
  try {
    await browser.goto(pageUrl);
    const raw = await browser.evaluate<string>(RENDER_CHECK_SCRIPT);
    return JSON.parse(raw) as RenderCheckSample[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`render check failed for ${pageUrl}: ${message}`);
    return [];
  }
}

function renderConsistencyForName(
  samples: RenderCheckSample[],
  name: string
): number {
  // If the css-var appears as the resolved final value of any button bg,
  // return 1.0; if it appears as a name without matching value, return 0.0;
  // if absent, return 0.8 (default).
  let matched = 0;
  let total = 0;
  for (const s of samples) {
    if (!s.cssVarResolvesTo) continue;
    total += 1;
    if (s.cssVarResolvesTo.toLowerCase().includes(name.replace('--', '').toLowerCase())) {
      matched += 1;
    }
  }
  if (total === 0) return 0.8;
  return total === 0 ? 0.8 : matched / total;
}

function matchRoleForVar(name: string): Role | null {
  return matchRole(name);
}

const EXTRACTION_SCRIPT = CSS_VAR_RESOLVE_SCRIPT;

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

      let globalProfile = buildGlobalProfile(
        pageSamples.map((p) => ({ url: p.url, samples: p.samples }))
      );

      // Build CSS-var candidates per page for cross-page consistency scoring.
      const cssCandidatesByPage: Array<Map<string, string>> = pageSamples.map(() => new Map());
      for (const [k, v] of allCssVars) {
        // For now, treat every CSS var as appearing on every page (cross-page scores
        // will still detect conflicts because per-page sampling varies).
        for (const map of cssCandidatesByPage) map.set(k, v);
      }

      // Run a render-consistency check on the root page to get actual vs declared
      // CSS-var usage on buttons/CTA elements.
      const renderSamples = await runRenderCheck(browser, pages[0] || url);

      const cssCandidates: Array<{ name: string; value: string; assignedRole: Role; pages: number; renderConsistency: number }> = [];
      for (const [name, value] of allCssVars.entries()) {
        if (value === 'transparent' || value === 'inherit' || value === 'initial') continue;
        if (value.startsWith('var(') || value.includes('var(')) continue;
        if (!value.includes('#') && !value.startsWith('rgb') && !value.startsWith('hsl')) continue;

        const renderConsistency = renderConsistencyForName(renderSamples, name);

        const semanticRole = mapCssVarToRole(name);
        if (semanticRole) {
          cssCandidates.push({
            name,
            value,
            assignedRole: semanticRole as Role,
            pages: pages.length,
            renderConsistency,
          });
          continue;
        }

        // Fall back to plain pattern matching.
        const plain = matchRoleForVar(name);
        if (plain) {
          cssCandidates.push({
            name,
            value,
            assignedRole: plain,
            pages: pages.length,
            renderConsistency,
          });
        }
      }

      // Build a map of role -> resolved CSS-var value (for synthesizer + downstream).
      const cssColorTokens: Record<string, string> = {};
      for (const cand of cssCandidates) {
        if (!cssColorTokens[cand.assignedRole]) cssColorTokens[cand.assignedRole] = cand.value;
      }
      globalProfile = {
        ...globalProfile,
        cssVarTokens: {
          colors: cssColorTokens,
          source: 'css-vars',
        },
      };

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

      // Extract component-level styles from role-aggregated samples.
      const allSamples = pageSamples.flatMap((p) => p.samples);
      applied.components = extractComponents(allSamples);

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
