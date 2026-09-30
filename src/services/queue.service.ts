/**
 * QueueService - Sistema de colas para trabajos asíncronos
 * 
 * En desarrollo: usa localStorage
 * En producción: usa Redis/BullMQ
 */

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELED';

export interface Job<T = any> {
  id: string;
  queue: string;
  data: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: any;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<any>;

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, Job[]> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: boolean = false;

  private constructor() {}

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Register a handler for a queue
   */
  registerHandler<T>(queue: string, handler: JobHandler<T>): void {
    this.handlers.set(queue, handler);
  }

  /**
   * Add a job to a queue
   */
  async add<T>(queue: string, data: T, options: { priority?: number; maxAttempts?: number } = {}): Promise<string> {
    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queue,
      data,
      status: 'PENDING',
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
    };

    // Get or create queue
    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }

    const queueJobs = this.queues.get(queue)!;
    queueJobs.push(job);

    // Sort by priority (higher priority first)
    queueJobs.sort((a, b) => b.priority - a.priority);

    // Save to localStorage
    this.saveToStorage();

    // Start processing if not already running
    if (!this.processing) {
      this.processQueues();
    }

    return job.id;
  }

  /**
   * Process all queues
   */
  private async processQueues(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        let hasJobs = false;

        for (const [queue, jobs] of this.queues.entries()) {
          const pendingJob = jobs.find(j => j.status === 'PENDING');
          if (!pendingJob) continue;

          hasJobs = true;
          await this.processJob(pendingJob);
        }

        if (!hasJobs) break;
      }
    } catch (error) {
      console.error('[QueueService] Error processing queues:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob<T>(job: Job<T>): Promise<void> {
    const handler = this.handlers.get(job.queue);
    if (!handler) {
      console.error(`[QueueService] No handler registered for queue: ${job.queue}`);
      job.status = 'FAILED';
      job.error = 'No handler registered';
      job.failedAt = Date.now();
      this.saveToStorage();
      return;
    }

    job.status = 'PROCESSING';
    job.processedAt = Date.now();
    job.attempts++;
    this.saveToStorage();

    try {
      const result = await handler(job);
      job.status = 'COMPLETED';
      job.completedAt = Date.now();
      job.result = result;
      this.saveToStorage();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.status = 'RETRYING';
        job.error = errorMessage;
        
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, job.attempts - 1) * 1000;
        setTimeout(() => {
          job.status = 'PENDING';
          this.saveToStorage();
          if (!this.processing) {
            this.processQueues();
          }
        }, delay);
      } else {
        // Max attempts reached
        job.status = 'FAILED';
        job.error = errorMessage;
        job.failedAt = Date.now();
      }
      
      this.saveToStorage();
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    for (const jobs of this.queues.values()) {
      const job = jobs.find(j => j.id === jobId);
      if (job) return job;
    }
    return null;
  }

  /**
   * Get jobs by queue
   */
  async getJobs(queue: string, status?: JobStatus): Promise<Job[]> {
    const jobs = this.queues.get(queue) || [];
    if (status) {
      return jobs.filter(j => j.status === status);
    }
    return jobs;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    for (const jobs of this.queues.values()) {
      const job = jobs.find(j => j.id === jobId);
      if (job && (job.status === 'PENDING' || job.status === 'RETRYING')) {
        job.status = 'CANCELED';
        this.saveToStorage();
        return true;
      }
    }
    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    for (const jobs of this.queues.values()) {
      const job = jobs.find(j => j.id === jobId);
      if (job && job.status === 'FAILED') {
        job.status = 'PENDING';
        job.attempts = 0;
        job.error = undefined;
        job.failedAt = undefined;
        this.saveToStorage();
        
        if (!this.processing) {
          this.processQueues();
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    queues: {
      name: string;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      retrying: number;
    }[];
    totalJobs: number;
  }> {
    const stats = [];
    let totalJobs = 0;

    for (const [queue, jobs] of this.queues.entries()) {
      const queueStats = {
        name: queue,
        pending: jobs.filter(j => j.status === 'PENDING').length,
        processing: jobs.filter(j => j.status === 'PROCESSING').length,
        completed: jobs.filter(j => j.status === 'COMPLETED').length,
        failed: jobs.filter(j => j.status === 'FAILED').length,
        retrying: jobs.filter(j => j.status === 'RETRYING').length,
      };
      stats.push(queueStats);
      totalJobs += jobs.length;
    }

    return { queues: stats, totalJobs };
  }

  /**
   * Clean up completed/failed jobs older than specified age
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();

    for (const [queue, jobs] of this.queues.entries()) {
      const filtered = jobs.filter(job => {
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          const age = now - (job.completedAt || job.failedAt || job.createdAt);
          return age < maxAge;
        }
        return true;
      });
      this.queues.set(queue, filtered);
    }

    this.saveToStorage();
  }

  /**
   * Save queues to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: Record<string, Job[]> = {};
      for (const [queue, jobs] of this.queues.entries()) {
        data[queue] = jobs;
      }
      localStorage.setItem('nexura_queues', JSON.stringify(data));
    } catch (error) {
      console.error('[QueueService] Error saving to localStorage:', error);
    }
  }

  /**
   * Load queues from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('nexura_queues');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [queue, jobs] of Object.entries(data)) {
          this.queues.set(queue, jobs as Job[]);
        }
      }
    } catch (error) {
      console.error('[QueueService] Error loading from localStorage:', error);
    }
  }
}

// Export singleton instance
export const queueService = QueueService.getInstance();

// Load queues on initialization
queueService.loadFromStorage();
