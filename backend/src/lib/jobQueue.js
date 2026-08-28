import { nanoid } from "nanoid";

/**
 * Minimal in-memory async job queue standing in for a real job/worker system
 * (e.g. BullMQ + Redis, or the provider's own webhook). Good enough for a
 * single-process demo; swap for a durable queue before running multiple
 * backend instances.
 *
 * A concurrency cap is applied to the actual work (see runJob): a single
 * "generate" request now fans out into up to (formats × 5 angles) video
 * jobs, and running all of those ffmpeg processes at once would overload a
 * small instance. Jobs beyond the cap sit at status "queued" and start as
 * soon as a slot frees up — the client-side polling in the frontend already
 * handles a job staying "queued" for a while.
 */
const jobs = new Map();
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_VIDEO_JOBS) || 3;
let activeCount = 0;
const pending = [];

export function createJob(kind, meta = {}) {
  const id = nanoid(10);
  const job = { id, kind, status: "queued", progress: 0, result: null, error: null, meta, createdAt: Date.now() };
  jobs.set(id, job);
  return job;
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function updateJob(id, patch) {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, patch);
  return job;
}

/**
 * Queues an async task, updating job status as it goes. Errors are captured
 * onto the job rather than thrown, so callers polling /api/jobs/:id see a
 * clean "failed" state with a message instead of an unhandled rejection.
 */
export function runJob(job, taskFn) {
  pending.push({ job, taskFn });
  drainQueue();
}

function drainQueue() {
  while (activeCount < MAX_CONCURRENT_JOBS && pending.length > 0) {
    const { job, taskFn } = pending.shift();
    activeCount += 1;
    runNow(job, taskFn).finally(() => {
      activeCount -= 1;
      drainQueue();
    });
  }
}

async function runNow(job, taskFn) {
  updateJob(job.id, { status: "processing", progress: 10 });
  try {
    const result = await taskFn((progress) => updateJob(job.id, { progress }));
    updateJob(job.id, { status: "done", progress: 100, result });
  } catch (err) {
    updateJob(job.id, { status: "failed", error: err.message || String(err) });
  }
}
