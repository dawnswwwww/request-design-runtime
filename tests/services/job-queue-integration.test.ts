import { describe, test, expect } from 'bun:test';
import { JobQueue } from '../../src/services/job-queue';

describe('JobQueue integration with analyze flow', () => {
  test('serializes long-running jobs (simulated analyze)', async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const order: number[] = [];
    const enqueue = (i: number) =>
      queue.enqueue(`job-${i}`, async () => {
        order.push(i);
        await new Promise((r) => setTimeout(r, 20));
      });
    await Promise.all([enqueue(1), enqueue(2), enqueue(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  test('concurrent=2 allows 2 jobs in flight', async () => {
    const queue = new JobQueue({ concurrency: 2 });
    const order: number[] = [];
    const enqueue = (i: number) =>
      queue.enqueue(`job-${i}`, async () => {
        order.push(i);
        await new Promise((r) => setTimeout(r, 30));
      });
    await Promise.all([enqueue(1), enqueue(2), enqueue(3)]);
    // Jobs 1 and 2 should start, then 3 starts after one finishes.
    expect(order.slice(0, 2).sort()).toEqual([1, 2]);
    expect(order).toContain(3);
    expect(order.length).toBe(3);
  });

  test('failed job does not block subsequent jobs', async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const completed: string[] = [];
    await Promise.all([
      queue.enqueue('a', async () => { throw new Error('fail'); }).catch(() => {}),
      queue.enqueue('b', async () => { completed.push('b'); }),
      queue.enqueue('c', async () => { completed.push('c'); }),
    ]);
    expect(completed).toEqual(['b', 'c']);
  });
});