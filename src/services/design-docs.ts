import { eq } from 'drizzle-orm';
import { db } from '../db';
import { designDocs, type NewDesignDoc } from '../../drizzle/schema';

export async function createDesignDoc(input: Omit<NewDesignDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<DesignDoc> {
  const [doc] = await db
    .insert(designDocs)
    .values({
      ...input,
      updatedAt: new Date(),
    })
    .returning();
  return doc;
}

export async function getDesignDocByJobId(jobId: string): Promise<DesignDoc | null> {
  const [doc] = await db.select().from(designDocs).where(eq(designDocs.jobId, jobId));
  return doc ?? null;
}

export async function updateDesignDocPreviewPath(
  jobId: string,
  livePreviewPath: string
): Promise<DesignDoc> {
  const [doc] = await db
    .update(designDocs)
    .set({ livePreviewPath, updatedAt: new Date() })
    .where(eq(designDocs.jobId, jobId))
    .returning();
  if (!doc) throw new Error(`Design doc not found for job: ${jobId}`);
  return doc;
}

export type DesignDoc = typeof designDocs.$inferSelect;
