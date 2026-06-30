import { eq } from 'drizzle-orm';
import { db } from '../db';
import { jobs } from '../../drizzle/schema';
import {
  completeJob,
  failJob,
  updateJobProgress,
  updateJobStatus,
} from './jobs';
import { McpClient } from './mcp';
import { discoverPages, selectPages } from './crawler';
import { extractTokens } from './extractor';
import { synthesize } from './synthesizer';
import { generateDesignMd } from './design-md';
import { createLlmClientFromEnv, LlmClient } from './llm';
import { extractDomain, extractRootUrl } from '../utils/url';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const EXTRACTION_SCRIPT = `(function() {
  const elements = Array.from(document.querySelectorAll('body, body *'));
  const samples = [];
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    samples.push({
      tag: el.tagName,
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
      margin: style.margin,
      gap: style.gap,
      boxShadow: style.boxShadow,
    });
  }
  return samples.slice(0, 500);
})();`;

export async function startAnalysis(
  jobId: string,
  url: string,
  outputPath: string,
  deps: { mcp?: McpClient; llm?: LlmClient } = {}
): Promise<void> {
  const outputDir = process.env.OUTPUT_DIR || './output';
  const mcpPath = process.env.LIGHTPANDA_BIN || 'lightpanda';
  const mcp = deps.mcp ?? new McpClient(`${mcpPath} mcp`);

  try {
    await updateJobStatus(jobId, 'running');
    await mcp.start();

    try {
      await mcp.goto(url);
      const domain = extractDomain(url);
      const rootUrl = extractRootUrl(url);

      const links = await mcp.links();
      const discovered = discoverPages(rootUrl, links.map((l: { href: string; text: string }) => ({
        href: l.href,
        text: l.text,
        context: 'in-content',
      })));
      const pages = selectPages(rootUrl, discovered, Number(process.env.MAX_PAGES) || 6);

      const allRawTokens = [];
      let progress = 10;
      const step = 60 / pages.length;

      for (const pageUrl of pages) {
        await mcp.goto(pageUrl);
        const result = await mcp.evaluate(EXTRACTION_SCRIPT);
        if (Array.isArray(result)) {
          allRawTokens.push(...result);
        }
        progress += step;
        await updateJobProgress(jobId, Math.min(Math.round(progress), 70));
      }

      const rawTokens = extractTokens(allRawTokens);
      const designSystem = synthesize(rawTokens, { brandName: domain });

      await updateJobProgress(jobId, 80);

      const llm = deps.llm ?? createLlmClientFromEnv();
      const designMd = await generateDesignMd(designSystem, llm);

      const fullPath = `${outputDir}/${outputPath}`;
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, designMd, 'utf-8');

      await completeJob(jobId, {
        pagesCrawled: pages.length,
        outputPath,
        downloadUrl: `/jobs/${jobId}/download`,
      });
    } finally {
      await mcp.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(jobId, message);
  }
}
