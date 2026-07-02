export interface JobQueueOptions {
  concurrency: number;
  onError?: (id: string, error: Error) => void;
}

export interface JobQueueSnapshot {
  active: string[];
  pending: string[];
}

interface EnqueuedTask {
  id: string;
  fn: () => Promise<unknown>;
}

export class JobQueue {
  private active = new Map<string, Promise<unknown>>();
  private pending: EnqueuedTask[] = [];
  private concurrency: number;
  private onError?: (id: string, error: Error) => void;
  private draining = false;

  constructor(options: JobQueueOptions) {
    this.concurrency = Math.max(1, options.concurrency);
    this.onError = options.onError;
  }

  get activeCount(): number {
    return this.active.size;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  snapshot(): JobQueueSnapshot {
    return {
      active: Array.from(this.active.keys()),
      pending: this.pending.map((t) => t.id),
    };
  }

  enqueue<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: EnqueuedTask = {
        id,
        fn: () => fn().then(
          (value) => {
            resolve(value as T);
            return value as T;
          },
          (err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            if (this.onError) {
              try { this.onError(id, error); } catch { /* ignore */ }
            }
            reject(error);
            // Swallow the error here; it's already delivered to the caller.
            // We return a resolved promise to keep the queue's finally() clean.
            return undefined as unknown as T;
          }
        ),
      };
      this.pending.push(task);
      this.kick();
    });
  }

  private kick(): void {
    if (this.draining) return;
    while (this.active.size < this.concurrency && this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) return;
      this.runTask(next);
    }
  }

  private runTask(task: EnqueuedTask): void {
    const promise = task.fn().finally(() => {
      this.active.delete(task.id);
      this.kick();
    });
    this.active.set(task.id, promise);
  }

  /** Wait until all currently-enqueued tasks have finished. */
  async drain(): Promise<void> {
    this.draining = true;
    while (this.active.size > 0 || this.pending.length > 0) {
      const tasks = Array.from(this.active.values());
      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      } else {
        // No active task yet (synchronous enqueue only).
        await new Promise((r) => setTimeout(r, 5));
      }
    }
    this.draining = false;
  }
}
