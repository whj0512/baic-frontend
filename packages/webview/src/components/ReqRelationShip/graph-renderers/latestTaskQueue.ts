/** One in-flight task and one coalesced request. All G6 writes use this queue. */
export class LatestTaskQueue {
  private running = false
  private pending = false
  private disposed = false
  private task: () => Promise<void>
  private onError: (error: unknown) => void

  constructor(task: () => Promise<void>, onError: (error: unknown) => void) {
    this.task = task
    this.onError = onError
  }

  request() {
    if (this.disposed) return
    this.pending = true
    if (!this.running) void this.run()
  }

  private async run() {
    this.running = true
    try {
      while (this.pending && !this.disposed) {
        this.pending = false
        try { await this.task() } catch (error) { this.onError(error) }
      }
    } finally {
      this.running = false
    }
  }

  dispose() {
    this.disposed = true
    this.pending = false
  }
}
