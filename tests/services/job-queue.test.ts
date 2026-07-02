import { describe, test, expect, beforeEach } from 'bun:test';
import { JobQueue } from '../../src/services/job-queue';

describe('JobQueue', () => {
  test('runs tasks in FIFO order', async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const order: number[] = [];
    await Promise.all([
      queue.enqueue('1', () => new Promise((r) => setTimeout(() => { order.push(1); r(undefined); }, 30))),
      queue.enqueue('2', () => new Promise((r) => setTimeout(() => { order.push(2); r(undefined); }, 5))),
      queue.enqueue('3', () => new Promise((r) => setTimeout(() => { order.push(3); r(undefined); }, 5))),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });

  test('limits concurrency to N parallel workers', async () => {
    const queue = new JobQueue({ concurrency: 2 });
    let active = 0;
    let maxActive = 0;
    const task = (id: number) => new Promise<void>((r) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => { active -= 1; r(); }, 20);
    });
    await Promise.all([
      queue.enqueue('1', () => task(1)),
      queue.enqueue('2', () => task(2)),
      queue.enqueue('3', () => task(3)),
      queue.enqueue('4', () => task(4)),
      queue.enqueue('5', () => task(5)),
    ]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('reports active count', async () => {
    const queue = new JobQueue({ concurrency: 2 });
    expect(queue.activeCount).toBe(0);
    expect(queue.pendingCount).toBe(0);
    const promise = queue.enqueue('1', () => new Promise<void>((r) => setTimeout(r, 30)));
    expect(queue.activeCount).toBe(1);
    await promise;
    // Wait one more microtask for the finally callback to drain.
    await new Promise((r) => setTimeout(r, 0));
    expect(queue.activeCount).toBe(0);
  });

  test('continues to drain after a task throws', async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const order: string[] = [];
    const p1 = queue.enqueue('1', async () => { throw new Error('boom'); }).catch(() => {});
    const p2 = queue.enqueue('2', async () => { order.push('2'); });
    const p3 = queue.enqueue('3', async () => { order.push('3'); });
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual(['2', '3']);
  });

  test('snapshot returns active and pending ids', async () => {
    const queue = new JobQueue({ concurrency: 1 });
    const blocker = new Promise<void>((r) => setTimeout(r, 50));
    const p1 = queue.enqueue('a', () => blocker);
    queue.enqueue('b', () => Promise.resolve());
    queue.enqueue('c', () => Promise.resolve());
    // After synchronous enqueue, 'a' is the active one, 'b' and 'c' are pending.
    expect(queue.snapshot().active).toEqual(['a']);
    expect(queue.snapshot().pending).toEqual(['b', 'c']);
    await p1;
  });
});