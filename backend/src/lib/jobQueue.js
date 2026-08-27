import { nanoid } from "nanoid";

/**
 * Minimal in-memory async job queue standing in for a real job/worker system
 * (e.g. BullMQ + Redis, or the provider's own webhook). Good enough for a
 * single-process demo; swap for a durable queue before running multiple
 * backend instances.
 */
const jobs = new Map();

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
 * Runs an async task, updating job status as it goes. Errors are captured
 * onto the job rather than thrown, so callers polling /api/jobs/:id see a
 * clean "failed" state with a message instead of an unhandled rejection.
 */
export async function runJob(job, taskFn) {
  updateJob(job.id, { status: "processing", progress: 10 });
  try {
    const result = await taskFn((progress) => updateJob(job.id, { progress }));
    updateJob(job.id, { status: "done", progress: 100, result });
  } catch (err) {
    updateJob(job.id, { status: "failed", error: err.message || String(err) });
  }
}
